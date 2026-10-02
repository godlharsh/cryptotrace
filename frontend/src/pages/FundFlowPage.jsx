import React from 'react';
import { AppShell } from '../components/AppShell';

export function FundFlowPage() {
  return (
    <AppShell title="Fund-Flow Map">
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '12px' }}>Interactive Fund-Flow Map</h2>
        <p style={{ color: 'var(--muted-color)', fontSize: '13px' }}>
          Interactive multi-hop graph, cluster detection, VASP attribution analysis, and transaction records. (Phase 2 & 4 implementation)
        </p>
      </div>
    </AppShell>
  );
}
