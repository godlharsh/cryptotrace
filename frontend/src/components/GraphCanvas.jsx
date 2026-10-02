import React, { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Shield, ArrowRight, Building2, AlertTriangle, Layers } from 'lucide-react';

/**
 * Custom 2D SVG Graph Renderer for CryptoTrace v2
 * Renders nodes grouped by hop levels with risk score styling, arrows, and hover details.
 */
export default function GraphCanvas({ nodes = [], edges = [], onSelectNode, selectedNode }) {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Group nodes by hop distance for clear layered layout
  const layout = useMemo(() => {
    if (!nodes.length) return { nodeCoords: {}, svgWidth: 900, svgHeight: 600 };

    const hopGroups = {};
    nodes.forEach((n) => {
      const hop = n.hop !== undefined ? n.hop : 0;
      if (!hopGroups[hop]) hopGroups[hop] = [];
      hopGroups[hop].push(n);
    });

    const maxHop = Math.max(...Object.keys(hopGroups).map(Number), 0);
    const hopWidth = 260;
    const svgWidth = Math.max(950, (maxHop + 1) * hopWidth + 120);
    const svgHeight = 650;

    const nodeCoords = {};
    Object.keys(hopGroups).forEach((hopStr) => {
      const hop = Number(hopStr);
      const group = hopGroups[hop];
      const x = 100 + hop * hopWidth;
      const count = group.length;
      const verticalSpacing = Math.min(130, (svgHeight - 120) / Math.max(count, 1));
      const startY = (svgHeight - (count - 1) * verticalSpacing) / 2;

      group.forEach((node, index) => {
        nodeCoords[node.address.lower ? node.address.lower() : node.address] = {
          x,
          y: startY + index * verticalSpacing,
          node,
        };
      });
    });

    return { nodeCoords, svgWidth, svgHeight };
  }, [nodes]);

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

  const getRiskColor = (score = 0) => {
    if (score >= 90) return '#DC2626'; // Critical red
    if (score >= 70) return '#EA580C'; // High orange
    if (score >= 50) return '#D97706'; // Medium yellow
    return '#2563EB'; // Low / Normal blue
  };

  return (
    <div className="graph-container" style={{ position: 'relative', width: '100%', height: '580px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-card)', overflow: 'hidden', userSelect: 'none' }}>
      {/* Zoom Controls */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 6, backgroundColor: 'var(--surface-2-color)', padding: 6, borderRadius: 'var(--radius-input)', border: '1px solid var(--border-color)' }}>
        <button className="btn btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button className="btn btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button className="btn btn-secondary" style={{ width: 32, height: 32, padding: 0 }} onClick={() => { setZoom(1.0); setPan({ x: 40, y: 40 }); }} title="Fit to View">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Graph Legend */}
      <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 10, display: 'flex', gap: 12, backgroundColor: 'var(--surface-2-color)', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-color)', fontSize: 12, color: 'var(--muted-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#DC2626' }}></span> Suspect / High Risk (90+)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#EA580C' }}></span> Layering Hub (70-89)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#2563EB' }}></span> Intermediary / VASP Deposit</div>
      </div>

      <svg
        id="svg-bg"
        width="100%"
        height="100%"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-color)" />
          </marker>
          <marker id="arrow-selected" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
          </marker>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const srcKey = edge.source ? edge.source.toLowerCase() : '';
            const tgtKey = edge.target ? edge.target.toLowerCase() : '';
            const src = layout.nodeCoords[srcKey] || layout.nodeCoords[edge.source];
            const tgt = layout.nodeCoords[tgtKey] || layout.nodeCoords[edge.target];

            if (!src || !tgt) return null;

            const isSelectedEdge = selectedNode && (selectedNode.address.toLowerCase() === srcKey || selectedNode.address.toLowerCase() === tgtKey);
            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y + tgt.y) / 2 - 8;

            return (
              <g key={edge.id || idx}>
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isSelectedEdge ? '#3B82F6' : 'var(--border-color)'}
                  strokeWidth={isSelectedEdge ? 2.5 : 1.5}
                  strokeDasharray={edge.token === 'ETH' || edge.token === 'TRX' || edge.token === 'BTC' ? 'none' : '4 2'}
                  markerEnd={isSelectedEdge ? 'url(#arrow-selected)' : 'url(#arrow)'}
                />
                {edge.fiat_usd > 0 && (
                  <text x={midX} y={midY} fill="var(--muted-color)" fontSize={11} fontFamily="var(--font-mono)" textAnchor="middle">
                    ${edge.fiat_usd >= 1000 ? `${(edge.fiat_usd / 1000).toFixed(1)}k` : edge.fiat_usd.toFixed(0)} ({edge.token})
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const key = node.address ? node.address.toLowerCase() : '';
            const coord = layout.nodeCoords[key] || layout.nodeCoords[node.address];
            if (!coord) return null;

            const isSelected = selectedNode && selectedNode.address.toLowerCase() === key;
            const riskColor = getRiskColor(node.risk_score);
            const isOrigin = node.hop === 0 || node.role === 'origin';
            const isVasp = Boolean(node.vasp_name);
            const shortAddr = `${node.address.substring(0, 6)}...${node.address.substring(node.address.length - 4)}`;

            return (
              <g
                key={node.address}
                transform={`translate(${coord.x}, ${coord.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectNode) onSelectNode(node);
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Outer Ring */}
                <circle
                  r={isOrigin ? 26 : 22}
                  fill="var(--surface-color)"
                  stroke={riskColor}
                  strokeWidth={isSelected ? 3.5 : (isOrigin ? 3 : 2)}
                  style={{ filter: isSelected ? 'drop-shadow(0 0 8px rgba(59,130,246,0.6))' : 'none' }}
                />

                {/* Node Icon */}
                {isVasp ? (
                  <Building2 x={-9} y={-9} size={18} color={riskColor} />
                ) : isOrigin ? (
                  <Shield x={-9} y={-9} size={18} color="#DC2626" />
                ) : (
                  <Layers x={-8} y={-8} size={16} color="var(--muted-color)" />
                )}

                {/* Risk Score Pill */}
                {node.risk_score > 0 && (
                  <g transform="translate(14, -14)">
                    <rect x={-2} y={-9} width={26} height={14} rx={4} fill={riskColor} />
                    <text x={11} y={1} fill="#FFFFFF" fontSize={9} fontWeight="bold" textAnchor="middle">
                      {Math.round(node.risk_score)}
                    </text>
                  </g>
                )}

                {/* Node Label Text */}
                <text y={36} fill="var(--text-color)" fontSize={12} fontWeight={isOrigin || isVasp ? '600' : '400'} fontFamily="var(--font-mono)" textAnchor="middle">
                  {shortAddr}
                </text>
                {node.label && (
                  <text y={50} fill="var(--muted-color)" fontSize={10} textAnchor="middle">
                    {node.label.length > 22 ? `${node.label.substring(0, 20)}...` : node.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
