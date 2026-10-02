import React, { useState, useEffect, useMemo } from 'react';
import { Search, Play, RefreshCw, Shield, AlertTriangle, Building2, ExternalLink, Copy, Check, Filter } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import GraphCanvas from '../components/GraphCanvas';
import { formatINR } from '../utils/formatters';

export function FundFlowPage() {
  const [suspectWallet, setSuspectWallet] = useState('');
  const [blockchain, setBlockchain] = useState('ethereum');
  const [depth, setDepth] = useState(3);
  const [amountLost, setAmountLost] = useState('');
  const [caseTitle, setCaseTitle] = useState('');

  const [casesList, setCasesList] = useState([]);
  const [selectedCaseRef, setSelectedCaseRef] = useState('');

  const [graphData, setGraphData] = useState({ nodes: [], edges: [], vasp_summary: null, ai_summary: null });
  const [selectedNode, setSelectedNode] = useState(null);

  const [isTracing, setIsTracing] = useState(false);
  const [traceProgress, setTraceProgress] = useState({ stage: '', percent: 0, status: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Duplicate Case Prompt Modal State
  const [duplicateModal, setDuplicateModal] = useState(null);

  // Real-time client-side chain detection & validation
  const chainValidation = useMemo(() => {
    if (!suspectWallet.trim()) return { isMismatch: false, detected: '', msg: '' };
    const addr = suspectWallet.trim();

    let detected = '';
    if (/^T[a-zA-Z0-9]{33}$/.test(addr)) {
      detected = 'tron';
    } else if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      detected = 'ethereum';
    } else if (/^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,60})$/i.test(addr)) {
      detected = 'bitcoin';
    }

    if (detected && detected !== blockchain.toLowerCase()) {
      return {
        isMismatch: true,
        detected,
        msg: `This looks like a ${detected.toUpperCase()} address.`
      };
    }

    return { isMismatch: false, detected, msg: '' };
  }, [suspectWallet, blockchain]);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const r = await fetch('/api/cases');
      if (r.ok) {
        const data = await r.json();
        setCasesList(data);
        if (data.length > 0 && !selectedCaseRef) {
          setSelectedCaseRef(data[0].case_ref);
          loadCaseGraph(data[0].case_ref);
        }
      }
    } catch (e) {
      console.error('Failed to fetch cases:', e);
    }
  };

  const loadCaseGraph = async (caseRef) => {
    try {
      const r = await fetch(`/api/cases/${caseRef}/graph`);
      if (r.ok) {
        const data = await r.json();
        setGraphData(data);
        if (data.nodes && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch graph snapshot:', e);
    }
  };

  const handleCaseChange = (e) => {
    const ref = e.target.value;
    setSelectedCaseRef(ref);
    if (ref) loadCaseGraph(ref);
  };

  const handleStartTrace = async (e, forceNew = false) => {
    if (e) e.preventDefault();
    if (!suspectWallet.trim()) {
      setErrorMessage('Please enter a valid victim-reported suspect wallet address.');
      return;
    }

    if (chainValidation.isMismatch) {
      setErrorMessage(chainValidation.msg);
      return;
    }

    setErrorMessage('');
    setIsTracing(true);
    setTraceProgress({ stage: 'Submitting intake...', percent: 10, status: 'SUBMITTED' });

    const newCaseRef = `CT-${Date.now().toString().slice(-6)}`;

    try {
      const r = await fetch('/api/cases/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_ref: newCaseRef,
          title: caseTitle.trim() || `Suspect ${suspectWallet.substring(0, 8)} Investigation`,
          amount_lost: parseFloat(amountLost) || 0.0,
          suspect_wallet: suspectWallet.trim(),
          blockchain: chainValidation.detected || blockchain,
          depth: parseInt(depth, 10) || 3,
          force_new: forceNew
        })
      });

      const resData = await r.json();

      // Check for 409 Duplicate Case response
      if (r.status === 409 && resData.duplicate) {
        setIsTracing(false);
        setDuplicateModal({
          existing_case_ref: resData.existing_case_ref,
          message: resData.message || 'A case for this wallet exists. Open it or create a new trace?'
        });
        return;
      }

      if (!r.ok) {
        throw new Error(resData.message || 'Failed to launch tracing task.');
      }

      setSelectedCaseRef(newCaseRef);
      pollTraceStatus(newCaseRef);
    } catch (err) {
      setIsTracing(false);
      setErrorMessage(err.message);
    }
  };

  const pollTraceStatus = (caseRef) => {
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/cases/${caseRef}/status`);
        if (r.ok) {
          const statusData = await r.json();
          setTraceProgress({
            stage: statusData.stage,
            percent: statusData.progress_percent,
            status: statusData.status
          });

          if (statusData.status === 'COMPLETED') {
            clearInterval(interval);
            setIsTracing(false);
            await fetchCases();
            await loadCaseGraph(caseRef);
          } else if (statusData.status === 'FAILED') {
            clearInterval(interval);
            setIsTracing(false);
            setErrorMessage(`Tracing failed: ${statusData.error || 'Unknown network error'}`);
          }
        }
      } catch (e) {
        console.error('Error polling trace status:', e);
      }
    }, 2000);
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  return (
    <AppShell title="Fund-Flow Map">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Real-Time Multi-Hop Graph & Blockchain Tracer</h2>
            <p style={{ color: 'var(--muted-color)', fontSize: 13, marginTop: 2 }}>
              Trace victim-reported suspect wallets across EVM, TRON, and Bitcoin multi-hop transfers to identify VASP exit points.
            </p>
          </div>

          {casesList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted-color)' }}>Active Case:</span>
              <select
                className="input-field"
                style={{ width: 220 }}
                value={selectedCaseRef}
                onChange={handleCaseChange}
              >
                {casesList.map((c) => (
                  <option key={c.case_ref} value={c.case_ref}>
                    {c.case_ref} ({c.blockchain.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Intake Form Card */}
        <div className="card">
          <h2 className="card-title" style={{ marginBottom: 14 }}>Initiate Multi-Hop Blockchain Intake</h2>
          
          {errorMessage && (
            <div className="badge badge-critical" style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-input)', marginBottom: 16 }}>
              <AlertTriangle size={16} /> {errorMessage}
            </div>
          )}

          <form onSubmit={(e) => handleStartTrace(e, false)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', display: 'block', marginBottom: 6 }}>
                Suspect Wallet Address *
              </label>
              <input
                type="text"
                className="input-field mono-address"
                placeholder="0x... or T... or 1... / 3... / bc1..."
                value={suspectWallet}
                onChange={(e) => setSuspectWallet(e.target.value)}
                required
                style={{ borderColor: chainValidation.isMismatch ? '#DC2626' : undefined }}
              />
              {chainValidation.isMismatch && (
                <span style={{ color: '#DC2626', fontSize: 12, fontWeight: 600, display: 'block', marginTop: 4 }}>
                  ⚠️ {chainValidation.msg}
                </span>
              )}
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', display: 'block', marginBottom: 6 }}>
                Blockchain Network
              </label>
              <select className="input-field" value={blockchain} onChange={(e) => setBlockchain(e.target.value)}>
                <option value="ethereum">Ethereum (EVM / ERC-20)</option>
                <option value="tron">TRON (TRX / USDT-TRC20)</option>
                <option value="bitcoin">Bitcoin (BTC Mainnet)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', display: 'block', marginBottom: 6 }}>
                Trace Depth (Hops)
              </label>
              <select className="input-field" value={depth} onChange={(e) => setDepth(e.target.value)}>
                <option value={1}>1 Hop (Direct Counterparties)</option>
                <option value={2}>2 Hops (Intermediaries)</option>
                <option value={3}>3 Hops (Standard Obfuscation)</option>
                <option value={4}>4 Hops (Deep Layering)</option>
                <option value={5}>5 Hops (Extended Chain)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', display: 'block', marginBottom: 6 }}>
                Estimated Loss ($ USD)
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="e.g. 25000"
                value={amountLost}
                onChange={(e) => setAmountLost(e.target.value)}
              />
              <span style={{ fontSize: 11, color: 'var(--muted-color)', display: 'block', marginTop: 4 }}>
                Converted: {formatINR(amountLost)}
              </span>
            </div>

            <div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isTracing || chainValidation.isMismatch}>
                {isTracing ? <span className="spinner"></span> : <Play size={16} />}
                {isTracing ? 'Tracing Chain...' : 'Start Trace'}
              </button>
            </div>
          </form>
        </div>

        {/* Duplicate Case Modal Prompt */}
        {duplicateModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
            <div className="card" style={{ width: 440, padding: 28, textAlign: 'center' }}>
              <AlertTriangle size={36} color="#EA580C" style={{ marginBottom: 12 }} />
              <h3 className="card-title" style={{ fontSize: 18, marginBottom: 8 }}>Case Already Exists</h3>
              <p style={{ color: 'var(--text-color)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                {duplicateModal.message}
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    const ref = duplicateModal.existing_case_ref;
                    setDuplicateModal(null);
                    setSelectedCaseRef(ref);
                    loadCaseGraph(ref);
                  }}
                >
                  Open Existing Case
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setDuplicateModal(null);
                    handleStartTrace(null, true);
                  }}
                >
                  Create New Trace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tracing Progress Modal */}
        {isTracing && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="card" style={{ width: 440, textAlign: 'center', padding: 32 }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }}></div>
              <h3 className="card-title">Multi-Hop Blockchain Tracing in Progress</h3>
              <p style={{ color: 'var(--muted-color)', fontSize: 13, marginTop: 6, marginBottom: 20 }}>
                {traceProgress.stage || 'Fetching Etherscan/TronGrid transaction telemetry...'}
              </p>

              <div style={{ width: '100%', height: 8, backgroundColor: 'var(--surface-2-color)', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: `${traceProgress.percent}%`, height: '100%', backgroundColor: 'var(--accent-color)', transition: 'width 300ms ease' }}></div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-color)' }}>{traceProgress.percent}% Complete</span>
            </div>
          </div>
        )}

        {/* Graph & Inspector Split Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
          <div>
            <GraphCanvas
              nodes={graphData.nodes || []}
              edges={graphData.edges || []}
              onSelectNode={setSelectedNode}
              selectedNode={selectedNode}
            />
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Node Inspector</span>
              {selectedNode && (
                <span className={`badge ${selectedNode.risk_score >= 90 ? 'badge-critical' : selectedNode.risk_score >= 70 ? 'badge-high' : 'badge-low'}`}>
                  Risk {selectedNode.risk_score || 0}
                </span>
              )}
            </h3>

            {selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-color)', textTransform: 'uppercase' }}>Wallet Address</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--surface-2-color)', padding: '8px 10px', borderRadius: 'var(--radius-input)', marginTop: 4 }}>
                    <span className="mono-address" style={{ wordBreak: 'break-all', fontSize: 12 }}>{selectedNode.address}</span>
                    <button className="btn btn-secondary" style={{ padding: 4, height: 'auto' }} onClick={() => copyAddress(selectedNode.address)}>
                      {copiedAddr ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ backgroundColor: 'var(--surface-2-color)', padding: 10, borderRadius: 'var(--radius-input)' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>Hop Distance</span>
                    <p style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>Hop {selectedNode.hop ?? 0}</p>
                  </div>

                  <div style={{ backgroundColor: 'var(--surface-2-color)', padding: 10, borderRadius: 'var(--radius-input)' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>Role</span>
                    <p style={{ fontWeight: 600, fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
                      {selectedNode.role || 'Intermediary'}
                    </p>
                  </div>
                </div>

                {selectedNode.vasp_name && (
                  <div style={{ backgroundColor: 'var(--status-low-bg)', border: '1px solid var(--status-low-border)', padding: 12, borderRadius: 'var(--radius-input)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-low-text)', fontWeight: 600 }}>
                      <Building2 size={16} />
                      <span>VASP: {selectedNode.vasp_name}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-color)', marginTop: 4 }}>
                      Attribution Confidence: <strong>{selectedNode.vasp_confidence || 85}%</strong>
                    </p>
                  </div>
                )}

                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', display: 'block', marginBottom: 8 }}>
                    Connected Transfers ({graphData.edges.filter(e => e.source.toLowerCase() === selectedNode.address.toLowerCase() || e.target.toLowerCase() === selectedNode.address.toLowerCase()).length})
                  </span>
                  
                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {graphData.edges
                      .filter(e => e.source.toLowerCase() === selectedNode.address.toLowerCase() || e.target.toLowerCase() === selectedNode.address.toLowerCase())
                      .map((edge, i) => (
                        <div key={i} style={{ fontSize: 12, padding: 8, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-input)', backgroundColor: 'var(--surface-2-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>{edge.amount} {edge.token}</span>
                            <span style={{ color: 'var(--accent-color)' }}>${edge.fiat_usd?.toLocaleString()}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted-color)', marginTop: 2 }} className="mono-address">
                            {edge.source.substring(0, 6)}... &rarr; {edge.target.substring(0, 6)}...
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--muted-color)' }}>
                <Search size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>Click any node on the graph canvas to inspect detailed wallet telemetry.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default FundFlowPage;
