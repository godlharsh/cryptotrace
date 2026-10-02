import React from 'react';
import { AppShell } from '../components/AppShell';

export function ReportWalletPage() {
  return (
    <AppShell title="Report Wallet">
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '12px' }}>Report Suspect Wallet</h2>
        <p style={{ color: 'var(--muted-color)', fontSize: '13px' }}>
          Submit victim-reported wallet addresses for multi-hop automated blockchain fund-flow tracing. (Phase 2 & 4 implementation)
        </p>
      </div>
    </AppShell>
  );
}
