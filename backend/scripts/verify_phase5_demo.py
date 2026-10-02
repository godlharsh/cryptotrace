"""
CryptoTrace v2 - Phase 5 Final Verification Script
Tests seeded demo data, stats API, graph snapshots, risk alerts, and VASP attribution endpoints.
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8000"

def run_phase5_verification():
    print("=== CryptoTrace v2: Phase 5 Final System Verification ===", flush=True)

    # 1. Health check
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"[1] System Health OK - Database Mode: {health['integrations']['db_mode']}, Gemini API: {health['integrations']['gemini']}", flush=True)

    # 2. Login
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@cryptotrace.gov.in", "password": "CT@2026#Quasar"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[2] Admin JWT Authentication OK", flush=True)

    # 3. Stats Endpoint
    r = requests.get(f"{BASE_URL}/stats", headers=headers)
    assert r.status_code == 200, f"Stats API failed: {r.text}"
    stats = r.json()
    assert stats["wallets_tracked"] > 0, "Wallets count is 0"
    assert stats["probable_vasps"] > 0, "Probable VASPs count is 0"
    print(f"[3] Stats Telemetry OK - Wallets Tracked: {stats['wallets_tracked']}, Mapped Tx: {stats['transactions_mapped']}, VASPs: {stats['probable_vasps']}, High-Risk Clusters: {stats['high_risk_clusters']}", flush=True)

    # 4. List Cases Endpoint
    r = requests.get(f"{BASE_URL}/cases", headers=headers)
    assert r.status_code == 200, f"Cases API failed: {r.text}"
    cases = r.json()
    assert len(cases) >= 2, f"Expected at least 2 cases, got {len(cases)}"
    print(f"[4] Cases List OK - {len(cases)} cases available in database", flush=True)
    for c in cases:
        print(f"    - Case Ref: {c['case_ref']} | Chain: {c['blockchain'].upper()} | Status: {c['status']}", flush=True)

    # 5. Graph Snapshot Endpoint for Seeded Case
    case_ref = "CT-2026-ETH-9912"
    r = requests.get(f"{BASE_URL}/cases/{case_ref}/graph", headers=headers)
    assert r.status_code == 200, f"Graph fetch failed: {r.text}"
    graph = r.json()
    assert len(graph["nodes"]) > 0, "Nodes list empty"
    assert len(graph["edges"]) > 0, "Edges list empty"
    assert graph["vasp_summary"]["probable_vasp"] == "Binance", f"Unexpected VASP: {graph['vasp_summary']}"
    print(f"[5] Case Graph Snapshot OK - Nodes: {len(graph['nodes'])}, Edges: {len(graph['edges'])}, VASP: {graph['vasp_summary']['probable_vasp']}", flush=True)

    # 6. Alerts Endpoint
    r = requests.get(f"{BASE_URL}/cases/{case_ref}/alerts", headers=headers)
    assert r.status_code == 200, f"Alerts fetch failed: {r.text}"
    alerts_data = r.json()
    alerts = alerts_data.get("alerts", [])
    assert len(alerts) > 0, "Alerts list empty"
    print(f"[6] Fraud Risk Alerts OK - {len(alerts)} alerts registered", flush=True)

    # 7. VASP Summary Endpoint
    r = requests.get(f"{BASE_URL}/cases/{case_ref}/vasp-summary", headers=headers)
    assert r.status_code == 200, f"VASP summary failed: {r.text}"
    vasp = r.json()
    assert vasp["probable_vasp"] == "Binance", f"Mismatch VASP: {vasp['probable_vasp']}"
    assert vasp["confidence_score"] == 98.0, f"Mismatch confidence: {vasp['confidence_score']}"
    print(f"[7] VASP Attribution Endpoint OK - {vasp['probable_vasp']} (Confidence: {vasp['confidence_score']}%)", flush=True)

    print("\n=== CryptoTrace v2 Phase 5 Verification Complete: ALL TESTS PASSED! ===", flush=True)

if __name__ == "__main__":
    run_phase5_verification()
