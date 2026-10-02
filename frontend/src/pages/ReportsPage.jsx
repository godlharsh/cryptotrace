import React from 'react';
import { AppShell } from '../components/AppShell';

export function ReportsPage() {
  return (
    <AppShell title="Reports">
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '12px' }}>Investigation Reports</h2>
        <p style={{ color: 'var(--muted-color)', fontSize: '13px' }}>
          Court-ready evidence PDF reports, chain of custody logs, and freeze request drafts. (Phase 4 implementation)
        </p>
      </div>
    </AppShell>
  );
}
