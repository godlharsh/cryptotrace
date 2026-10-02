import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  X, 
  Shield, 
  Building2, 
  Layers, 
  Filter, 
  Copy, 
  Check, 
  Search, 
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { formatFiatUSD, formatINR } from '../utils/formatters';

const SPAM_REGEX = /HACHIKO|TRUMPMCDONALD|HALIEY|TOKEN|ALAMPO|TOWNS|W|PEPE|JASMY|SHIS|SHIB/i;

/**
 * GRAPH CANVAS Component for CryptoTrace v2
 * 
 * Includes:
 * 1. Fullscreen mode overlay (100vw x 100vh, z-index 9999, body scroll lock, Esc key, close X)
 * 2. Decluttered 2D hop column spacing (min 75px vertical gaps, no circle stacking, thin edges)
 * 3. Client-side "Show up to hop" filter (1, 2, 3, 4, 5, All) + "Traced to N hops" status & counts
 * 4. Spam & dust filter toggle (default OFF) & parallel edge merging
 * 5. Clean currency formatting ($1.0M, $15.0K, $320, stored USD->INR rate)
 */
export default function GraphCanvas({ 
  nodes = [], 
  edges = [], 
  onSelectNode, 
  selectedNode,
  usdInrRate = 86.5 
}) {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [showSpam, setShowSpam] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [hoveredItem, setHoveredItem] = useState(null);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Maximum traced depth available for current case
  const maxTracedDepth = useMemo(() => {
    if (!nodes || !nodes.length) return 3;
    const maxHop = Math.max(...nodes.map((n) => (n.hop !== undefined && n.hop !== null ? Number(n.hop) : 0)));
    return Math.max(maxHop, 1);
  }, [nodes]);

  // Client-side hop filter state (1, 2, 3, 4, 5, 'all')
  const [maxHopFilter, setMaxHopFilter] = useState('all');

  // Reset maxHopFilter & view whenever nodes or case change
  useEffect(() => {
    setMaxHopFilter(maxTracedDepth);
    setExpandedGroups(new Set());
    setZoom(1.0);
    setPan({ x: 40, y: 40 });
  }, [maxTracedDepth, nodes]);

  const containerRef = useRef(null);

  // Esc key handler for exiting fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll while fullscreen is open
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isFullscreen]);

  const zoomToFit = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 40, y: 40 });
  }, []);

  // ResizeObserver on canvas container resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // Keep viewport dimensions responsive
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  // Data Filter, Edge Merging & Layered Hop Column Spacing
  const processedData = useMemo(() => {
    if (!nodes || !nodes.length) return { nodes: [], edges: [], nodeCoords: {}, svgWidth: 900, svgHeight: 580 };

    // Apply client-side Hop Filter
    let hopFilteredNodes = nodes;
    if (maxHopFilter !== 'all') {
      const limit = Number(maxHopFilter);
      hopFilteredNodes = nodes.filter((n) => {
        const h = n.hop !== undefined && n.hop !== null ? Number(n.hop) : 0;
        return h <= limit;
      });
    }
    const hopFilteredSet = new Set(hopFilteredNodes.map((n) => (n.address || '').toLowerCase()));

    // Filter spam tokens, dust transfers, and hop-filtered nodes
    const filteredEdges = edges.filter((e) => {
      const srcKey = (e.source || '').toLowerCase();
      const tgtKey = (e.target || '').toLowerCase();
      if (!hopFilteredSet.has(srcKey) || !hopFilteredSet.has(tgtKey)) return false;

      if (showSpam) return true;
      if (e.token && SPAM_REGEX.test(e.token)) return false;
      const tokenUpper = (e.token || '').toUpperCase();
      const isNativeToken = ['ETH', 'TRX', 'BTC', 'USDT', 'USDC'].includes(tokenUpper);
      if (!isNativeToken && (e.fiat_usd < 1 || e.amount < 0.001)) return false;
      return true;
    });

    // Merge parallel edges between same source and target wallets
    const edgeMap = new Map();
    filteredEdges.forEach((edge) => {
      const srcKey = (edge.source || '').toLowerCase();
      const tgtKey = (edge.target || '').toLowerCase();
      const key = `${srcKey}->${tgtKey}`;

      if (!edgeMap.has(key)) {
        edgeMap.set(key, {
          id: key,
          source: edge.source,
          target: edge.target,
          fiat_usd: edge.fiat_usd || 0,
          amount: edge.amount || 0,
          tokens: new Set([edge.token || 'ETH']),
          count: 1,
          raw_edges: [edge],
        });
      } else {
        const existing = edgeMap.get(key);
        existing.fiat_usd += edge.fiat_usd || 0;
        existing.amount += edge.amount || 0;
        if (edge.token) existing.tokens.add(edge.token);
        existing.count += 1;
        existing.raw_edges.push(edge);
      }
    });

    const mergedEdges = Array.from(edgeMap.values()).map((e) => ({
      ...e,
      token: Array.from(e.tokens).join(', '),
    }));

    // Find active connected node addresses
    const connectedAddrs = new Set();
    mergedEdges.forEach((e) => {
      connectedAddrs.add(e.source.toLowerCase());
      connectedAddrs.add(e.target.toLowerCase());
    });

    // Filter visible nodes to relevant active addresses
    let visibleNodes = hopFilteredNodes.filter((n) => {
      const addrKey = (n.address || '').toLowerCase();
      const h = n.hop !== undefined && n.hop !== null ? Number(n.hop) : 0;
      if (h === 0 || n.role === 'origin' || n.vasp_name) return true;
      return connectedAddrs.has(addrKey);
    });

    // Fan-Out Control: group excess outgoing counterparties (> 8) per wallet
    const outgoingMap = new Map();
    mergedEdges.forEach((e) => {
      const src = e.source.toLowerCase();
      if (!outgoingMap.has(src)) outgoingMap.set(src, []);
      outgoingMap.get(src).push(e);
    });

    const extraGroupNodes = [];
    const finalEdges = [];

    outgoingMap.forEach((outEdges, srcAddr) => {
      if (outEdges.length > 8 && !expandedGroups.has(srcAddr)) {
        const sorted = [...outEdges].sort((a, b) => b.fiat_usd - a.fiat_usd);
        const keptEdges = sorted.slice(0, 8);
        const groupedEdges = sorted.slice(8);

        finalEdges.push(...keptEdges);

        const groupCount = groupedEdges.length;
        const totalGroupUSD = groupedEdges.reduce((sum, e) => sum + e.fiat_usd, 0);
        const groupNodeId = `group_${srcAddr}`;

        extraGroupNodes.push({
          address: groupNodeId,
          label: `+${groupCount} more wallets`,
          isGroupNode: true,
          parentAddress: srcAddr,
          groupCount,
          hop: (visibleNodes.find((n) => n.address.toLowerCase() === srcAddr)?.hop || 0) + 1,
          risk_score: 50,
        });

        finalEdges.push({
          id: `edge_${groupNodeId}`,
          source: srcAddr,
          target: groupNodeId,
          fiat_usd: totalGroupUSD,
          amount: 0,
          token: 'USDT/ETH',
          count: groupCount,
          raw_edges: groupedEdges,
        });
      } else {
        finalEdges.push(...outEdges);
      }
    });

    const allNodes = [...visibleNodes, ...extraGroupNodes];

    // Global cap of ~80 visible nodes
    const displayNodes = allNodes.slice(0, 80);
    const displayNodeSet = new Set(displayNodes.map((n) => n.address.toLowerCase()));

    const displayEdges = finalEdges.filter(
      (e) => displayNodeSet.has(e.source.toLowerCase()) && displayNodeSet.has(e.target.toLowerCase())
    );

    // Group nodes by hop distance for clear column separation
    const hopGroups = {};
    displayNodes.forEach((n) => {
      const hop = n.hop !== undefined && n.hop !== null ? Number(n.hop) : 0;
      if (!hopGroups[hop]) hopGroups[hop] = [];
      hopGroups[hop].push(n);
    });

    const hopKeys = Object.keys(hopGroups).map(Number).sort((a, b) => a - b);
    const maxHop = hopKeys.length ? Math.max(...hopKeys) : 0;
    const maxGroupCount = Math.max(...Object.values(hopGroups).map((g) => g.length), 1);

    const hopWidth = 260;
    const minVerticalGap = 75; // Guaranteed >= 75px vertical gap center-to-center
    const svgWidth = Math.max(950, (maxHop + 1) * hopWidth + 140);
    const svgHeight = Math.max(580, maxGroupCount * minVerticalGap + 120);

    const nodeCoords = {};
    hopKeys.forEach((hop) => {
      const group = hopGroups[hop];
      const x = 90 + hop * hopWidth;
      const count = group.length;
      const verticalSpacing = Math.max(minVerticalGap, (svgHeight - 120) / Math.max(count, 1));
      const startY = 60 + (svgHeight - 120 - (count - 1) * verticalSpacing) / 2;

      group.forEach((node, index) => {
        nodeCoords[node.address.toLowerCase()] = {
          x,
          y: startY + index * verticalSpacing,
          node,
        };
      });
    });

    return { nodes: displayNodes, edges: displayEdges, nodeCoords, svgWidth, svgHeight };
  }, [nodes, edges, showSpam, expandedGroups, maxHopFilter]);

  // Set of 1-hop direct neighbor addresses connected to the currently selected node
  const selectedNeighbors = useMemo(() => {
    if (!selectedNode) return new Set();
    const sAddr = selectedNode.address.toLowerCase();
    const set = new Set();
    processedData.edges.forEach((e) => {
      if (e.source.toLowerCase() === sAddr) set.add(e.target.toLowerCase());
      if (e.target.toLowerCase() === sAddr) set.add(e.source.toLowerCase());
    });
    return set;
  }, [selectedNode, processedData.edges]);

  // Mouse & Touch Dragging / Panning Handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'svg' || e.target.id === 'svg-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1) {
      setPan({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  const getRiskColor = (score = 0) => {
    if (score >= 90) return '#DC2626'; // Critical Red
    if (score >= 70) return '#EA580C'; // High Orange
    if (score >= 50) return '#D97706'; // Medium Yellow
    return '#2563EB'; // Low / Normal Blue
  };

  const getRiskBg = (score = 0) => {
    if (score >= 90) return '#FEF2F2';
    if (score >= 70) return '#FFF7ED';
    if (score >= 50) return '#FFFBEB';
    return '#EFF6FF';
  };

  const formatShortAddress = (addr = '') => {
    if (!addr) return '';
    if (addr.startsWith('group_')) return addr.replace('group_', '+');
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const copyAddress = (addr) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  // Connected transfers for the selected node inside Inspector
  const selectedNodeEdges = useMemo(() => {
    if (!selectedNode) return [];
    const sAddr = selectedNode.address.toLowerCase();
    return processedData.edges.filter(
      (e) => e.source.toLowerCase() === sAddr || e.target.toLowerCase() === sAddr
    );
  }, [selectedNode, processedData.edges]);

  return (
    <div 
      ref={containerRef}
      className={`graph-canvas-wrapper ${isFullscreen ? 'fullscreen-overlay' : ''}`}
      style={isFullscreen ? {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: 'var(--bg-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        margin: 0
      } : {
        position: 'relative',
        width: '100%',
        minHeight: '60vh',
        height: '580px',
        backgroundColor: 'var(--surface-color)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-card)',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Control Bar Header */}
      <div style={{
        position: isFullscreen ? 'relative' : 'absolute',
        top: isFullscreen ? 0 : 14,
        left: isFullscreen ? 0 : 'auto',
        right: isFullscreen ? 0 : 14,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isFullscreen ? '12px 24px' : '0',
        backgroundColor: isFullscreen ? 'var(--surface-color)' : 'transparent',
        borderBottom: isFullscreen ? '1px solid var(--border-color)' : 'none',
        gap: 10,
        flexWrap: 'wrap'
      }}>
        {isFullscreen ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Shield size={20} style={{ color: 'var(--accent-color)' }} />
            <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-color)' }}>
              Full-Screen Multi-Hop Fund-Flow Map
            </span>
          </div>
        ) : null}

        {/* Traced Depth Badge & "Show up to hop" Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge badge-neutral" style={{ fontSize: 11, textTransform: 'none', padding: '6px 10px' }}>
            Traced to {maxTracedDepth} {maxTracedDepth === 1 ? 'hop' : 'hops'}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--muted-color)', fontWeight: 600 }}>Show up to hop:</span>
            <select
              className="input-field"
              style={{ height: 38, padding: '0 8px', fontSize: 12, width: 'auto', minWidth: 90 }}
              value={maxHopFilter}
              onChange={(e) => setMaxHopFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 'all'].map((opt) => {
                const val = opt === 'all' ? 'all' : Number(opt);
                const isDisabled = opt !== 'all' && Number(opt) > maxTracedDepth;
                return (
                  <option
                    key={opt}
                    value={val}
                    disabled={isDisabled}
                    title={isDisabled ? 'Run a new trace with a deeper depth' : ''}
                  >
                    {opt === 'all' ? 'All Hops' : `Hop ${opt}`} {isDisabled ? '(Needs deeper trace)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <span style={{ fontSize: 11, color: 'var(--muted-color)', whiteSpace: 'nowrap' }}>
            ({processedData.nodes.length} nodes, {processedData.edges.length} edges)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {/* Spam / Dust Filter Toggle */}
          <button
            className={`btn ${showSpam ? 'btn-primary' : 'btn-secondary'}`}
            style={{ minHeight: 44, padding: '0 14px', fontSize: 13, borderRadius: 'var(--radius-input)' }}
            onClick={() => setShowSpam(!showSpam)}
            title="Toggle spam tokens and zero-value dust transfers"
          >
            <Filter size={15} />
            <span>{showSpam ? 'Hide Spam / Dust' : 'Show Spam / Dust'}</span>
          </button>

          {/* Zoom In (44px target) */}
          <button
            className="btn btn-secondary"
            style={{ width: 44, height: 44, padding: 0, borderRadius: 'var(--radius-input)' }}
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
            title="Zoom In (+)"
          >
            <ZoomIn size={18} />
          </button>

          {/* Zoom Out (44px target) */}
          <button
            className="btn btn-secondary"
            style={{ width: 44, height: 44, padding: 0, borderRadius: 'var(--radius-input)' }}
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
            title="Zoom Out (-)"
          >
            <ZoomOut size={18} />
          </button>

          {/* Fit to View (44px target) */}
          <button
            className="btn btn-secondary"
            style={{ width: 44, height: 44, padding: 0, borderRadius: 'var(--radius-input)' }}
            onClick={zoomToFit}
            title="Fit to Screen"
          >
            <Maximize2 size={18} />
          </button>

          {/* Fullscreen Expand / Close Button (44px target) */}
          <button
            className={`btn ${isFullscreen ? 'btn-danger' : 'btn-secondary'}`}
            style={{ width: 44, height: 44, padding: 0, borderRadius: 'var(--radius-input)' }}
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              setTimeout(() => zoomToFit(), 100);
            }}
            title={isFullscreen ? 'Close Fullscreen (Esc)' : 'Expand Fullscreen'}
          >
            {isFullscreen ? <X size={20} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Container */}
      <div style={{ flex: 1, position: 'relative', width: '100%', height: isFullscreen ? 'calc(100vh - 60px)' : '100%', overflow: 'hidden' }}>
        
        {/* Graph Legend */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          gap: 12,
          backgroundColor: 'var(--surface-color)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-input)',
          border: '1px solid var(--border-color)',
          fontSize: 12,
          color: 'var(--muted-color)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#DC2626' }}></span> Suspect / Origin
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#EA580C' }}></span> High Risk Hub
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#2563EB' }}></span> Intermediary / VASP
          </div>
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredItem && (
          <div
            style={{
              position: 'absolute',
              top: hoveredItem.y - (isFullscreen ? 60 : 40),
              left: hoveredItem.x + 12,
              zIndex: 30,
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              pointerEvents: 'none',
              maxWidth: 280
            }}
          >
            {hoveredItem.type === 'node' ? (
              <div>
                <strong style={{ color: 'var(--text-color)', display: 'block', fontSize: 13, wordBreak: 'break-all' }}>
                  {hoveredItem.data.label || formatShortAddress(hoveredItem.data.address)}
                </strong>
                <span style={{ color: 'var(--muted-color)', fontSize: 11 }}>Hop Distance: Hop {hoveredItem.data.hop ?? 0}</span>
                <div style={{ marginTop: 4, fontWeight: 600, color: getRiskColor(hoveredItem.data.risk_score) }}>
                  Risk Score: {hoveredItem.data.risk_score || 0} / 100
                </div>
                {hoveredItem.data.vasp_name && (
                  <div style={{ color: '#16A34A', fontSize: 11, fontWeight: 600, marginTop: 4 }}>
                    VASP: {hoveredItem.data.vasp_name}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <strong style={{ color: 'var(--accent-color)', display: 'block', fontSize: 14 }}>
                  {formatFiatUSD(hoveredItem.data.fiat_usd)}
                </strong>
                <span style={{ color: 'var(--muted-color)', fontSize: 12, display: 'block' }}>
                  {formatINR(hoveredItem.data.fiat_usd, usdInrRate)}
                </span>
                {hoveredItem.data.count > 1 && (
                  <span style={{ color: 'var(--text-color)', fontSize: 11, display: 'block', marginTop: 4 }}>
                    Merged Transfers: <strong>{hoveredItem.data.count}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Embedded Node Inspector Panel inside Fullscreen Mode */}
        {isFullscreen && selectedNode && (
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            bottom: 16,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-card)',
            zIndex: 40,
            padding: 20,
            boxShadow: 'var(--shadow-md)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Node Inspector</h3>
              <button 
                className="btn btn-secondary" 
                style={{ width: 32, height: 32, padding: 0 }}
                onClick={() => onSelectNode && onSelectNode(null)}
              >
                <X size={16} />
              </button>
            </div>

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
                <span style={{ fontSize: 11, color: 'var(--muted-color)' }}>Risk Score</span>
                <p style={{ fontWeight: 600, fontSize: 15, marginTop: 2, color: getRiskColor(selectedNode.risk_score) }}>
                  {selectedNode.risk_score || 0} / 100
                </p>
              </div>
            </div>

            {selectedNode.vasp_name && (
              <div style={{ backgroundColor: 'var(--status-low-bg)', border: '1px solid var(--status-low-border)', padding: 12, borderRadius: 'var(--radius-input)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--status-low-text)', fontWeight: 600 }}>
                  <Building2 size={16} />
                  <span>VASP: {selectedNode.vasp_name}</span>
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-color)', display: 'block', marginBottom: 8 }}>
                Connected Transfers ({selectedNodeEdges.length})
              </span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedNodeEdges.map((edge, i) => (
                  <div key={i} style={{ fontSize: 12, padding: 8, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-input)', backgroundColor: 'var(--surface-2-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>{edge.amount > 0 ? `${edge.amount} ${edge.token}` : edge.token}</span>
                      <span style={{ color: 'var(--accent-color)' }}>{formatFiatUSD(edge.fiat_usd)}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-color)', marginTop: 2 }} className="mono-address">
                      {edge.source.substring(0, 6)}... &rarr; {edge.target.substring(0, 6)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SVG Drawing Canvas */}
        <svg
          id="svg-bg"
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-color)" />
            </marker>
            <marker id="arrow-selected" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Render Thin 1px Edges (Arrowheads, dash pattern for ERC20) */}
            {processedData.edges.map((edge) => {
              const srcKey = (edge.source || '').toLowerCase();
              const tgtKey = (edge.target || '').toLowerCase();
              const src = processedData.nodeCoords[srcKey];
              const tgt = processedData.nodeCoords[tgtKey];

              if (!src || !tgt) return null;

              const isSelectedEdge = selectedNode && (
                selectedNode.address.toLowerCase() === srcKey || 
                selectedNode.address.toLowerCase() === tgtKey
              );

              const midX = (src.x + tgt.x) / 2;
              const midY = (src.y + tgt.y) / 2 - 6;

              return (
                <g 
                  key={edge.id}
                  onMouseEnter={(evt) => setHoveredItem({ type: 'edge', data: edge, x: evt.clientX, y: evt.clientY })}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isSelectedEdge ? '#3B82F6' : 'var(--border-color)'}
                    strokeWidth={isSelectedEdge ? 2 : Math.min(1 + (edge.count - 1) * 0.4, 3)}
                    strokeDasharray={edge.token?.includes('ETH') || edge.token?.includes('TRX') ? 'none' : '4 2'}
                    markerEnd={isSelectedEdge ? 'url(#arrow-selected)' : 'url(#arrow)'}
                  />

                  {/* Render Edge Label ONLY on Hover or Connected Node Selection */}
                  {isSelectedEdge && (
                    <text
                      x={midX}
                      y={midY}
                      fill="var(--accent-color)"
                      fontSize={11}
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                      textAnchor="middle"
                    >
                      {formatFiatUSD(edge.fiat_usd)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Decluttered Small Node Circles (Radius 7-10px) */}
            {processedData.nodes.map((node) => {
              const key = (node.address || '').toLowerCase();
              const coord = processedData.nodeCoords[key];
              if (!coord) return null;

              const isSelected = selectedNode && selectedNode.address.toLowerCase() === key;
              const riskColor = getRiskColor(node.risk_score);
              const h = node.hop !== undefined && node.hop !== null ? Number(node.hop) : 0;
              const isOrigin = h === 0 || node.role === 'origin';
              const isVasp = Boolean(node.vasp_name);
              const isGroup = node.isGroupNode;
              const isDirectNeighbor = selectedNeighbors.has(key);

              // Selective Node Label Rule (Origin, VASP, Selected, 1-Hop Neighbor, or Zoom >= 1.2)
              const showNodeLabel = 
                isOrigin || 
                isVasp || 
                isSelected || 
                isGroup || 
                isDirectNeighbor || 
                zoom >= 1.2;

              return (
                <g
                  key={node.address}
                  transform={`translate(${coord.x}, ${coord.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isGroup) {
                      setExpandedGroups((prev) => new Set(prev).add(node.parentAddress));
                    } else if (onSelectNode) {
                      onSelectNode(node);
                    }
                  }}
                  onMouseEnter={(evt) => setHoveredItem({ type: 'node', data: node, x: evt.clientX, y: evt.clientY })}
                  onMouseLeave={() => setHoveredItem(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Clean Node Circle (Radius 7-10px, Stroke color represents risk) */}
                  <circle
                    r={isOrigin || isVasp ? 9 : isGroup ? 11 : 7}
                    fill={getRiskBg(node.risk_score)}
                    stroke={riskColor}
                    strokeWidth={isSelected ? 3 : (isOrigin || isVasp ? 2 : 1.5)}
                  />

                  {/* Icon for Origin / VASP / Group Node */}
                  {isVasp ? (
                    <Building2 x={-5} y={-5} size={10} color={riskColor} />
                  ) : isOrigin ? (
                    <Shield x={-5} y={-5} size={10} color="#DC2626" />
                  ) : isGroup ? (
                    <text y={4} fill="var(--accent-color)" fontSize={10} fontWeight="bold" textAnchor="middle">
                      +{node.groupCount}
                    </text>
                  ) : null}

                  {/* Node Address & Label (Truncated as 0x1234...abcd) */}
                  {showNodeLabel && (
                    <g transform="translate(0, 20)">
                      <text
                        fill="var(--text-color)"
                        fontSize={11}
                        fontWeight={isOrigin || isVasp || isSelected ? '600' : '400'}
                        fontFamily="var(--font-mono)"
                        textAnchor="middle"
                      >
                        {formatShortAddress(node.address)}
                      </text>
                      {node.label && (
                        <text y={13} fill="var(--muted-color)" fontSize={10} textAnchor="middle">
                          {node.label.length > 18 ? `${node.label.substring(0, 16)}...` : node.label}
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
