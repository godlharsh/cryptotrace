import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Sun, Moon, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const showDemoBox = import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true';
  const demoEmail = import.meta.env.VITE_DEMO_EMAIL || 'admin@cryptotrace.gov.in';
  const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'CT@2026#Quasar';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  return (
    <ErrorBoundary>
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}>
        {/* Theme Toggle Top-Right */}
        <button
          className="btn btn-secondary"
          onClick={toggleTheme}
          style={{ position: 'absolute', top: '20px', right: '20px', padding: '0 10px', height: '36px' }}
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Centered Login Card */}
        <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-soft-color)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}>
              <Shield size={28} style={{ color: 'var(--accent-color)' }} />
            </div>
            <h1 className="h1-title" style={{ fontSize: '22px' }}>CryptoTrace</h1>
            <p style={{ color: 'var(--muted-color)', fontSize: '13px', marginTop: '4px' }}>
              Blockchain Fund-Flow Intelligence Platform (SIH 2026)
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Administrator Email
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="admin@cryptotrace.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted-color)',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--status-critical-bg)',
                border: '1px solid var(--status-critical-border)',
                color: 'var(--status-critical-text)',
                fontSize: '13px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', marginTop: '4px' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  <span>Signing In...</span>
                </div>
              ) : (
                'Sign In as Administrator'
              )}
            </button>
          </form>

          {/* Demo Credentials Box */}
          {showDemoBox && (
            <div style={{
              marginTop: '24px',
              padding: '14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-2-color)',
              fontSize: '12px'
            }}>
              <div style={{
                fontWeight: 600,
                color: 'var(--text-color)',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Official Administrator Credentials</span>
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Auto-fill
                </button>
              </div>
              <div style={{ color: 'var(--muted-color)', fontFamily: 'var(--font-mono)' }}>
                Email: {demoEmail}<br />
                Password: {demoPassword}
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
