import React, { useState, useEffect } from 'react';
import { Printer, Download, ShieldCheck, Building2, AlertTriangle, FileText } from 'lucide-react';
import { AppShell } from '../components/AppShell';

export function ReportsPage() {
  const [casesList, setCasesList] = useState([]);
  const [selectedCaseRef, setSelectedCaseRef] = useState('');
  const [caseDetails, setCaseDetails] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], vasp_summary: null, ai_summary: null });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const r = await fetch('/api/cases');
      if (r.ok) {
        const cases = await r.json();
        setCasesList(cases);
        if (cases.length > 0) {
          const defaultRef = cases[0].case_ref;
          setSelectedCaseRef(defaultRef);
          fetchFullReportData(defaultRef, cases[0]);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Failed to load cases:', e);
      setLoading(false);
    }
  };

  const fetchFullReportData = async (caseRef, caseObj) => {
    setLoading(true);
    setCaseDetails(caseObj);
    try {
      const [resGraph, resAlerts] = await Promise.all([
        fetch(`/api/cases/${caseRef}/graph`),
        fetch(`/api/cases/${caseRef}/alerts`)
      ]);

      if (resGraph.ok) {
        const gData = await resGraph.json();
        setGraphData(gData);
      }

      if (resAlerts.ok) {
        const aData = await resAlerts.json();
        setAlerts(aData.alerts || []);
      }
    } catch (e) {
      console.error('Failed to fetch report data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseChange = (e) => {
    const ref = e.target.value;
    setSelectedCaseRef(ref);
    const caseObj = casesList.find(c => c.case_ref === ref);
    if (ref && caseObj) fetchFullReportData(ref, caseObj);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell title="Reports">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Controls Header */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Evidence-Linked PDF & Subpoena Report Generator</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: 13, marginTop: 2 }}>
              Official forensic investigation dossier for Law Enforcement Agency (LEA) Section 91 CrPC subpoena submission.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {casesList.length > 0 && (
              <select className="input-field" style={{ width: 220 }} value={selectedCaseRef} onChange={handleCaseChange}>
                {casesList.map(c => (
                  <option key={c.case_ref} value={c.case_ref}>
                    {c.case_ref} ({c.blockchain.toUpperCase()})
                  </option>
                ))}
              </select>
            )}

            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={16} /> Print / Export PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : !caseDetails ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted-color)' }}>
            <FileText size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No case selected for report generation.</p>
          </div>
        ) : (
          /* Printable Report Document Card */
          <div className="card report-document" style={{ backgroundColor: '#FFFFFF', color: '#0F172A', padding: 36, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            
            {/* Header Seal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: 16, marginBottom: 24 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#475569' }}>
                  SMART INDIA HACKATHON 2026 • PROBLEM STATEMENT 26183
                </span>
                <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: '#0F172A' }}>
                  CRYPTOTRACE FORENSIC DOSSIER & VASP FREEZE REQUEST
                </h1>
                <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  Team Quantam Quasar (Team ID: 155093) • Real-Time Cryptocurrency Exchange Identification Engine
                </p>
              </div>

              <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', fontFamily: 'var(--font-mono)' }}>
                <div><strong>DOSSIER REF:</strong> {selectedCaseRef}</div>
                <div><strong>GENERATED:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>STATUS:</strong> CONFIDENTIAL / LEA USE ONLY</div>
              </div>
            </div>

            {/* Section 1: Intake Metadata */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', borderBottom: '1px solid #CBD5E1', paddingBottom: 6, marginBottom: 12 }}>
                1. Victim Complaint & Wallet Intake Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 6, border: '1px solid #E2E8F0', fontSize: 13 }}>
                <div>
                  <span style={{ color: '#64748B', fontSize: 11, display: 'block' }}>Suspect Wallet:</span>
                  <strong className="mono-address" style={{ wordBreak: 'break-all', fontSize: 12 }}>{caseDetails.suspect_wallet}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748B', fontSize: 11, display: 'block' }}>Blockchain Network:</span>
                  <strong style={{ textTransform: 'uppercase' }}>{caseDetails.blockchain}</strong>
                </div>

                <div>
                  <span style={{ color: '#64748B', fontSize: 11, display: 'block' }}>Reported Victim Loss:</span>
                  <strong style={{ color: '#DC2626' }}>${caseDetails.amount_lost?.toLocaleString() || '0.00'} USD</strong>
                </div>

                <div>
                  <span style={{ color: '#64748B', fontSize: 11, display: 'block' }}>Traced Hop Depth:</span>
                  <strong>{caseDetails.depth} Hops ({graphData.nodes.length} Nodes)</strong>
                </div>
              </div>
            </div>

            {/* Section 2: VASP Attribution & Legal Subpoena Draft */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', borderBottom: '1px solid #CBD5E1', paddingBottom: 6, marginBottom: 12 }}>
                2. Identified Exchange (VASP) & Emergency Freeze Order Request
              </h3>

              {graphData.vasp_summary ? (
                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: 16, borderRadius: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 16, color: '#1E40AF' }}>
                      PROBABLE VASP: {graphData.vasp_summary.probable_vasp}
                    </strong>
                    <span style={{ backgroundColor: '#1E40AF', color: '#FFFFFF', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                      Confidence: {graphData.vasp_summary.confidence_score}%
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.5 }}>
                    <strong>Target Deposit Address:</strong> <span className="mono-address">{graphData.vasp_summary.target_node}</span><br />
                    <strong>Attribution Method:</strong> {graphData.vasp_summary.attribution_method}
                  </p>

                  <div style={{ marginTop: 12, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 4, border: '1px dashed #93C5FD', fontSize: 12, color: '#1E293B', fontFamily: 'var(--font-mono)' }}>
                    <strong>FORMAL SECTION 91 CrPC LEGAL REQUEST TEMPLATE:</strong><br />
                    "To Compliance Team ({graphData.vasp_summary.probable_vasp}), You are hereby requested to immediately issue an emergency freeze on account holding deposit address {graphData.vasp_summary.target_node} and furnish full KYC subscriber details, IP logs, and withdrawal target wallets related to Case {selectedCaseRef}."
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#64748B' }}>No VASP attribution snapshot available.</p>
              )}
            </div>

            {/* Section 3: Gemini AI Executive Forensic Summary */}
            {graphData.ai_summary && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', borderBottom: '1px solid #CBD5E1', paddingBottom: 6, marginBottom: 12 }}>
                  3. Gemini AI Executive Investigation Narrative
                </h3>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#334155', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 6, border: '1px solid #E2E8F0', whiteSpace: 'pre-line' }}>
                  {graphData.ai_summary}
                </div>
              </div>
            )}

            {/* Section 4: Multi-Hop Wallet Hierarchy Table */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', borderBottom: '1px solid #CBD5E1', paddingBottom: 6, marginBottom: 12 }}>
                4. Traced Multi-Hop Wallet Nodes Telemetry
              </h3>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F1F5F9', textAlign: 'left', borderBottom: '1px solid #CBD5E1' }}>
                    <th style={{ padding: 8 }}>Hop #</th>
                    <th style={{ padding: 8 }}>Wallet Address</th>
                    <th style={{ padding: 8 }}>Role / Label</th>
                    <th style={{ padding: 8 }}>Risk Score</th>
                    <th style={{ padding: 8 }}>VASP Status</th>
                  </tr>
                </thead>
                <tbody>
                  {graphData.nodes.map((n, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #E2E8F0' }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>Hop {n.hop ?? 0}</td>
                      <td style={{ padding: 8 }} className="mono-address">{n.address}</td>
                      <td style={{ padding: 8, textTransform: 'capitalize' }}>{n.role} {n.label ? `(${n.label})` : ''}</td>
                      <td style={{ padding: 8, fontWeight: 700, color: n.risk_score >= 90 ? '#DC2626' : n.risk_score >= 70 ? '#EA580C' : '#2563EB' }}>
                        {n.risk_score}
                      </td>
                      <td style={{ padding: 8 }}>{n.vasp_name ? <strong>{n.vasp_name} ({n.vasp_confidence}%)</strong> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 5: Risk Alerts Summary */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#1E293B', borderBottom: '1px solid #CBD5E1', paddingBottom: 6, marginBottom: 12 }}>
                5. Flagged Forensic Risk Alerts
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map((a, i) => (
                  <div key={i} style={{ padding: 10, border: '1px solid #E2E8F0', borderRadius: 4, backgroundColor: '#F8FAFC', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span style={{ color: a.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }}>[{a.severity}] {a.title}</span>
                      <span>Risk Score: {a.risk_score}</span>
                    </div>
                    <p style={{ color: '#475569', marginTop: 4 }}>{a.reason}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </AppShell>
  );
}

export default ReportsPage;
