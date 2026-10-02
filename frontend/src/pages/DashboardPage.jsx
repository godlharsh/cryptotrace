import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { 
  Wallet, 
  GitCommit, 
  Building2, 
  AlertOctagon, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PIPELINE_STAGES = [
  'Wallet Intake',
  'Blockchain Data',
  'Fund-Flow Mapping',
  'Fraud Analysis',
  'VASP Attribution',
  'Risk Alerts',
  'Investigation Report'
];

export function DashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    wallets_tracked: 0,
    transactions_mapped: 0,
    probable_vasps: 0,
    high_risk_clusters: 0,
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch backend statistics' }));
        setErrorMsg(err.message || 'Backend connection error');
      }
    } catch (e) {
      setErrorMsg('Cannot reach backend server. Please verify Uvicorn server status on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  return (
    <AppShell title="Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Backend Error Banner if API is unreachable */}
        {errorMsg && (
          <div className="card" style={{
            backgroundColor: 'var(--status-critical-bg)',
            borderColor: 'var(--status-critical-border)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--status-critical-text)' }}>
              <AlertCircle size={20} />
              <div>
                <strong style={{ fontSize: '14px' }}>Backend Unreachable</strong>
                <p style={{ fontSize: '13px', marginTop: '2px' }}>{errorMsg}</p>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={fetchStats} style={{ height: '34px', fontSize: '13px' }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--accent-soft-color)', color: 'var(--accent-color)' }}>
              <Wallet size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>Wallets Tracked</div>
              <div className="stat-number">{loading ? '...' : stats.wallets_tracked}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--accent-soft-color)', color: 'var(--accent-color)' }}>
              <GitCommit size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>Transactions Mapped</div>
              <div className="stat-number">{loading ? '...' : stats.transactions_mapped}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--status-low-bg)', color: 'var(--status-low-text)' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>Probable VASPs Identified</div>
              <div className="stat-number">{loading ? '...' : stats.probable_vasps}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--status-critical-bg)', color: 'var(--status-critical-text)' }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>High-Risk Clusters</div>
              <div className="stat-number">{loading ? '...' : stats.high_risk_clusters}</div>
            </div>
          </div>
        </div>

        {/* 7-Stage Pipeline Strip */}
        <div className="card">
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-color)', marginBottom: '16px' }}>
            Automated Analytics Pipeline Overview
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            {PIPELINE_STAGES.map((stage, idx) => (
              <div key={stage} style={{
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--surface-2-color)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-color)' }}>Stage {idx + 1}</span>
                  <CheckCircle2 size={14} style={{ color: 'var(--muted-color)' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-color)' }}>{stage}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Cards Side by Side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Fund-Flow Cluster Preview */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Fund-Flow Cluster Preview</h2>
            <div style={{
              height: '200px',
              backgroundColor: 'var(--surface-2-color)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted-color)',
              gap: '8px'
            }}>
              <GitCommit size={32} />
              <span style={{ fontSize: '13px' }}>No active case graph loaded yet.</span>
            </div>
          </div>

          {/* Top Risk Alerts */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>Top Risk Alerts</h2>
            <div style={{
              height: '200px',
              backgroundColor: 'var(--surface-2-color)',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted-color)',
              gap: '8px'
            }}>
              <AlertOctagon size={32} />
              <span style={{ fontSize: '13px' }}>No high-risk alerts recorded.</span>
            </div>
          </div>
        </div>

        {/* Recent Cases Table */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: '16px' }}>Recent Cases</h2>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case Ref</th>
                  <th>Title</th>
                  <th>Suspect Wallet</th>
                  <th>Chain</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted-color)', padding: '24px' }}>
                    No investigation cases recorded. Use <strong>Report Wallet</strong> to begin tracing.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
