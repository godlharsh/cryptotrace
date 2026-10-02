import React from 'react';
import { AppShell } from '../components/AppShell';

export function AlertsPage() {
  return (
    <AppShell title="Risk Alerts">
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: '12px' }}>Automated Risk Alerts</h2>
        <p style={{ color: 'var(--muted-color)', fontSize: '13px' }}>
          Real-time pattern anomaly detection, sanctioned address hits, and high-risk hop alerts. (Phase 3 & 4 implementation)
        </p>
      </div>
    </AppShell>
  );
}
