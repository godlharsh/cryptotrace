import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, Sparkles, FileText, Download, Copy, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';

export function ReportWalletPage() {
  const [casesList, setCasesList] = useState([]);
  const [selectedCaseRef, setSelectedCaseRef] = useState('');
  const [vaspData, setVaspData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const navigate = useNavigate();

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
          fetchVASPSummary(defaultRef);
        } else {
          setLoading(false);
        }
      }
    } catch (e) {
      console.error('Failed to load cases:', e);
      setLoading(false);
    }
  };

  const fetchVASPSummary = async (caseRef) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/cases/${caseRef}/vasp-summary`);
      if (r.ok) {
        const data = await r.json();
        setVaspData(data);
      }
    } catch (e) {
      console.error('Failed to fetch VASP summary:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseChange = (e) => {
    const ref = e.target.value;
    setSelectedCaseRef(ref);
    if (ref) fetchVASPSummary(ref);
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const downloadJsonEvidence = () => {
    if (!vaspData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vaspData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `VASP_Attribution_${selectedCaseRef}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <AppShell title="Report Wallet / VASP Attribution">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Probable Exchange / VASP Attribution & AI Report</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: 13, marginTop: 2 }}>
              Automated VASP receiving exchange identification, confidence scoring, and Gemini AI executive summary.
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
        ) : !vaspData ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted-color)' }}>
            <Building2 size={36} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No VASP attribution snapshot found for this case reference.</p>
          </div>
        ) : (
          <>
            {/* Top VASP Hero Card */}
            <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', textTransform: 'uppercase' }}>Identified Receiving VASP</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: 'var(--accent-soft-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={24} color="var(--accent-color)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{vaspData.probable_vasp}</h2>
                    <span style={{ fontSize: 12, color: 'var(--muted-color)' }}>Method: {vaspData.attribution_method}</span>
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted-color)' }}>Target Deposit Wallet Node:</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--surface-2-color)', padding: '8px 12px', borderRadius: 'var(--radius-input)', marginTop: 4 }}>
                    <span className="mono-address" style={{ fontSize: 13 }}>{vaspData.target_node}</span>
                    <button className="btn btn-secondary" style={{ padding: 4, height: 'auto' }} onClick={() => copyAddress(vaspData.target_node)}>
                      {copiedAddr ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: '1px solid var(--border-color)', paddingLeft: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', textTransform: 'uppercase' }}>Attribution Confidence</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span className="stat-number" style={{ color: 'var(--accent-color)' }}>{vaspData.confidence_score}%</span>
                  <span style={{ fontSize: 13, color: 'var(--muted-color)' }}>Confidence Gauge</span>
                </div>

                <div style={{ width: '100%', height: 10, backgroundColor: 'var(--surface-2-color)', borderRadius: 6, overflow: 'hidden', marginTop: 12, marginBottom: 16 }}>
                  <div style={{ width: `${vaspData.confidence_score}%`, height: '100%', backgroundColor: vaspData.confidence_score >= 90 ? '#16A34A' : vaspData.confidence_score >= 75 ? '#2563EB' : '#EA580C' }}></div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/reports')}>
                    <FileText size={16} /> LEA Subpoena Notice
                  </button>
                  <button className="btn btn-secondary" onClick={downloadJsonEvidence} title="Export JSON Evidence">
                    <Download size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Gemini AI Executive Summary Card */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
                <Sparkles size={18} color="var(--accent-color)" />
                <h3 className="card-title">Gemini AI Executive Forensic Narrative</h3>
                <span className="badge badge-low" style={{ marginLeft: 'auto' }}>Model: gemini-2.5-flash</span>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-color)', whiteSpace: 'pre-line' }}>
                {vaspData.ai_summary}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default ReportWalletPage;
