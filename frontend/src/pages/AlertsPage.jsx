import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Zap, Filter, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';

export function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [casesList, setCasesList] = useState([]);
  const [selectedCaseRef, setSelectedCaseRef] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const resCases = await fetch('/api/cases');
      if (resCases.ok) {
        const cases = await resCases.json();
        setCasesList(cases);
        if (cases.length > 0) {
          const defaultRef = cases[0].case_ref;
          setSelectedCaseRef(defaultRef);
          fetchCaseAlerts(defaultRef);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Failed to load cases:', e);
      setLoading(false);
    }
  };

  const fetchCaseAlerts = async (caseRef) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/cases/${caseRef}/alerts`);
      if (r.ok) {
        const data = await r.json();
        setAlerts(data.alerts || []);
      }
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseChange = (e) => {
    const ref = e.target.value;
    setSelectedCaseRef(ref);
    if (ref) fetchCaseAlerts(ref);
  };

  const filteredAlerts = alerts.filter(a => filterSeverity === 'ALL' || a.severity === filterSeverity);

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').length;

  return (
    <AppShell title="Risk Alerts">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Automated Fraud & Risk Alerts Center</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: 13, marginTop: 2 }}>
              Real-time fraud alerts triggered by multi-hop fund-flow anomalies, VASP deposit exits, and rapid layering transfers.
            </p>
          </div>

          {casesList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted-color)' }}>Select Case:</span>
              <select className="input-field" style={{ width: 220 }} value={selectedCaseRef} onChange={handleCaseChange}>
                {casesList.map(c => (
                  <option key={c.case_ref} value={c.case_ref}>
                    {c.case_ref} ({c.blockchain.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--muted-color)', fontSize: 13 }}>
              <span>Total Active Alerts</span>
              <ShieldAlert size={18} />
            </div>
            <p className="stat-number" style={{ marginTop: 8 }}>{alerts.length}</p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #DC2626' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#DC2626', fontSize: 13, fontWeight: 600 }}>
              <span>Critical VASP Exits</span>
              <AlertTriangle size={18} />
            </div>
            <p className="stat-number" style={{ marginTop: 8, color: '#DC2626' }}>{criticalCount}</p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #EA580C' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#EA580C', fontSize: 13, fontWeight: 600 }}>
              <span>High-Value Layering</span>
              <Zap size={18} />
            </div>
            <p className="stat-number" style={{ marginTop: 8, color: '#EA580C' }}>{highCount}</p>
          </div>

          <div className="card" style={{ borderLeft: '4px solid #D97706' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#D97706', fontSize: 13, fontWeight: 600 }}>
              <span>Obfuscation Chains</span>
              <Filter size={18} />
            </div>
            <p className="stat-number" style={{ marginTop: 8, color: '#D97706' }}>{mediumCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
            <button
              key={sev}
              className={`btn ${filterSeverity === sev ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 32, fontSize: 12, padding: '0 12px' }}
              onClick={() => setFilterSeverity(sev)}
            >
              {sev} ({sev === 'ALL' ? alerts.length : alerts.filter(a => a.severity === sev).length})
            </button>
          ))}
        </div>

        {/* Alerts List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : filteredAlerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted-color)' }}>
            <ShieldAlert size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No risk alerts found matching selected criteria.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredAlerts.map(alert => (
              <div key={alert.id || alert.title} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-critical' : alert.severity === 'HIGH' ? 'badge-high' : alert.severity === 'MEDIUM' ? 'badge-medium' : 'badge-low'}`}>
                      {alert.severity}
                    </span>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>{alert.title}</h3>
                  </div>
                  <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>
                    Risk Score: {alert.risk_score}
                  </span>
                </div>

                <p style={{ color: 'var(--text-color)', fontSize: 13, lineHeight: 1.5 }}>
                  {alert.reason}
                </p>

                {alert.path_json && (
                  <div style={{ backgroundColor: 'var(--surface-2-color)', padding: '8px 12px', borderRadius: 'var(--radius-input)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: 'var(--muted-color)' }}>Traced Path:</span>
                    {JSON.parse(alert.path_json).map((nodeAddr, i, arr) => (
                      <React.Fragment key={i}>
                        <span className="mono-address" style={{ backgroundColor: 'var(--surface-color)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                          {nodeAddr.length > 12 ? `${nodeAddr.substring(0, 6)}...${nodeAddr.substring(nodeAddr.length - 4)}` : nodeAddr}
                        </span>
                        {i < arr.length - 1 && <ArrowRight size={12} color="var(--muted-color)" />}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ height: 30, fontSize: 12 }}
                    onClick={() => navigate('/fund-flow')}
                  >
                    <ExternalLink size={12} /> View in Graph Canvas
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default AlertsPage;
