import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  FilePlus, 
  GitFork, 
  AlertTriangle, 
  FileText, 
  Sun, 
  Moon, 
  LogOut, 
  Menu, 
  X,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ErrorBoundary } from './ErrorBoundary';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/report-wallet', label: 'Report Wallet', icon: FilePlus },
  { path: '/fund-flow', label: 'Fund-Flow Map', icon: GitFork },
  { path: '/alerts', label: 'Risk Alerts', icon: AlertTriangle },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export function AppShell({ title, children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => {
        if (d.connected === false) {
          setDbError(d.error || 'Failed to connect to Supabase PostgreSQL database.');
        }
      })
      .catch(() => {});
  }, []);

  const getPageTitle = () => {
    if (title) return title;
    const current = NAV_ITEMS.find(item => 
      item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
    );
    return current ? current.label : 'CryptoTrace';
  };

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-color)' }}>
        {/* Mobile Drawer Overlay Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 35
            }}
          />
        )}
        {/* Sidebar */}
        <aside style={{
          width: '260px',
          backgroundColor: 'var(--surface-color)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          transition: 'transform 200ms ease',
        }} className={mobileOpen ? 'sidebar-open' : 'sidebar-closed'}>
          <div>
            {/* Sidebar Brand Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Shield size={24} style={{ color: 'var(--accent-color)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-color)' }}>CryptoTrace</div>
                <div style={{ fontSize: '11px', color: 'var(--muted-color)', fontWeight: 500 }}>SIH 2026 | PS 26183</div>
              </div>
            </div>

            {/* Navigation Items (EXACTLY 5) */}
            <nav style={{ padding: '16px 0' }}>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 24px',
                      color: isActive ? 'var(--accent-color)' : 'var(--muted-color)',
                      backgroundColor: isActive ? 'var(--accent-soft-color)' : 'transparent',
                      textDecoration: 'none',
                      fontWeight: isActive ? 600 : 500,
                      borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '11px',
            color: 'var(--muted-color)',
            lineHeight: 1.4
          }}>
            Official Investigative Tool<br />
            <strong>Team Quantam Quasar</strong>
          </div>
        </aside>

        {/* Main Content Container */}
        <div style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }} className="main-content-container">
          {/* Header */}
          <header style={{
            height: '64px',
            backgroundColor: 'var(--surface-color)',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 30
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                className="mobile-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                style={{
                  display: 'none',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-color)',
                  cursor: 'pointer'
                }}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <h1 className="h1-title">{getPageTitle()}</h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="badge badge-neutral" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                ADMIN (FULL ACCESS)
              </span>

              <button
                className="btn btn-secondary"
                onClick={toggleTheme}
                title="Toggle Theme"
                style={{ padding: '0 10px', height: '34px' }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-color)',
                maxWidth: '160px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.full_name || 'Admin'}
              </div>

              <button
                className="btn btn-secondary"
                onClick={logout}
                style={{ padding: '0 12px', height: '34px', fontSize: '13px' }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          </header>

          {dbError && (
            <div style={{
              backgroundColor: 'var(--status-critical-bg)',
              borderBottom: '1px solid var(--status-critical-border)',
              padding: '12px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--status-critical-text)',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <AlertCircle size={18} />
              <span>Database not connected: {dbError}</span>
            </div>
          )}

          {/* Page Body */}
          <main style={{ flex: 1, padding: '28px' }}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          aside {
            transform: translateX(-100%);
          }
          aside.sidebar-open {
            transform: translateX(0);
          }
          .main-content-container {
            margin-left: 0 !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </ErrorBoundary>
  );
}
