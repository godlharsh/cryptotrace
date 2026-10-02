import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { 
  Wallet, 
  GitCommit, 
  Building2, 
  AlertOctagon, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Play,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatINR } from '../utils/formatters';

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
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    wallets_tracked: 0,
    transactions_mapped: 0,
    probable_vasps: 0,
    high_risk_clusters: 0,
    usd_inr_rate: 86.5
  });
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [resStats, resCases] = await Promise.all([
        fetch('/api/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/cases', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (resStats.ok) {
        const data = await resStats.json();
        setStats(data);
      }
      if (resCases.ok) {
        const casesData = await resCases.json();
        setCases(casesData || []);
      }
    } catch (e) {
      setErrorMsg('Cannot reach backend server. Please verify Uvicorn server status on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
            <button className="btn btn-secondary" onClick={fetchDashboardData} style={{ height: '34px', fontSize: '13px' }}>
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        )}

        {/* 4 Stat Cards - Neutral grey outline icons on plain grey-tint square */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-2-color)', color: 'var(--muted-color)', border: '1px solid var(--border-color)' }}>
              <Wallet size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>Wallets Tracked</div>
              <div className="stat-number">{loading ? '...' : stats.wallets_tracked}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-2-color)', color: 'var(--muted-color)', border: '1px solid var(--border-color)' }}>
              <GitCommit size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>Transactions Mapped</div>
              <div className="stat-number">{loading ? '...' : stats.transactions_mapped}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-2-color)', color: 'var(--muted-color)', border: '1px solid var(--border-color)' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--muted-color)', fontWeight: 500 }}>Probable VASPs Identified</div>
              <div className="stat-number">{loading ? '...' : stats.probable_vasps}</div>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', backgroundColor: 'var(--surface-2-color)', color: 'var(--muted-color)', border: '1px solid var(--border-color)' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-color)' }}>Stage {idx + 1}</span>
                  <CheckCircle2 size={14} style={{ color: 'var(--accent-color)' }} />
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-color)' }}>{stage}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Cases Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="card-title">Recent Investigation Cases</h2>
            <button className="btn btn-primary" style={{ height: 32, fontSize: 13 }} onClick={() => navigate('/fund-flow')}>
              <Play size={14} /> Start Tracing
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case Ref</th>
                  <th>Title</th>
                  <th>Suspect Wallet</th>
                  <th>Chain</th>
                  <th>Reported Loss (INR)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted-color)', padding: '24px' }}>
                      No investigation cases recorded. Click <strong>Start Tracing</strong> to begin.
                    </td>
                  </tr>
                ) : (
                  cases.map((c) => (
                    <tr key={c.case_ref}>
                      <td style={{ fontWeight: 600 }} className="mono-address">{c.case_ref}</td>
                      <td>{c.title}</td>
                      <td className="mono-address">{c.suspect_wallet.substring(0, 8)}...{c.suspect_wallet.substring(c.suspect_wallet.length - 6)}</td>
                      <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{c.blockchain}</td>
                      <td style={{ fontWeight: 600 }}>{formatINR(c.amount_lost, stats.usd_inr_rate)}</td>
                      <td>
                        <span className={`badge ${c.status === 'COMPLETED' ? 'badge-low' : 'badge-high'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ height: 28, fontSize: 12, padding: '0 8px' }} onClick={() => navigate('/fund-flow')}>
                          Inspect Graph <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
