import React, { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CryptoTrace ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-color, #F8FAFC)',
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <h2 className="card-title" style={{ color: 'var(--status-critical-text, #DC2626)', marginBottom: '12px' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--muted-color, #64748B)', fontSize: '14px', marginBottom: '20px', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'An unexpected application error occurred.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => window.location.reload()}
              >
                Reload
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  try { localStorage.removeItem('ct_token'); } catch (e) {}
                  window.location.href = '/login';
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
