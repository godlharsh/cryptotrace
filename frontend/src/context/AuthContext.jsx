import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('ct_token') || null;
    } catch (e) {
      return null;
    }
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const userData = await res.json();
          setUser(userData);
        } else if (res.status === 401) {
          logout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    let res;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
    } catch (netErr) {
      throw new Error('Backend server is unreachable. Please start Uvicorn server on port 8000.');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Backend server is not responding with JSON (${res.status}). Please start Uvicorn backend on port 8000.`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed. Check email and password.');
    }
    try {
      localStorage.setItem('ct_token', data.access_token);
    } catch (e) {
      console.warn('Failed to persist token to localStorage', e);
    }
    setToken(data.access_token);
    return data;
  };

  const logout = () => {
    try {
      localStorage.removeItem('ct_token');
    } catch (e) {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
