"""
CryptoTrace v2 - Phase 3 Verification Script
Automated test script for Risk Scoring, Alert Generation, and VASP Attribution.
"""

import sys
import time
import requests

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    print("=== CryptoTrace v2: Phase 3 Verification ===", flush=True)
    
    # 1. Health check
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"[1] Health Check OK - DB: {health['integrations']['db_mode']}, Gemini API: {health['integrations']['gemini']}", flush=True)

    # 2. Login
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@cryptotrace.gov.in", "password": "CT@2026#Quasar"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    print("[2] Login OK - Bearer token obtained", flush=True)

    # 3. Initiate trace for Vitalik Buterin's public wallet
    case_ref = f"TEST-P3-{int(time.time())}"
    wallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
    payload = {
        "case_ref": case_ref,
        "title": "Phase 3 Verification Case",
        "complaint_details": "Verification test of risk scoring and VASP attribution",
        "amount_lost": 25000.0,
        "suspect_wallet": wallet,
        "blockchain": "ethereum",
        "depth": 2
    }
    r = requests.post(f"{BASE_URL}/cases/trace", json=payload)
    assert r.status_code == 200, f"Trace initiation failed: {r.text}"
    print(f"[3] Trace Initiated OK - Case Ref: {case_ref}", flush=True)

    # 4. Poll status until completed (Max 60s wait)
    max_wait = 60
    start = time.time()
    completed = False
    while time.time() - start < max_wait:
        r = requests.get(f"{BASE_URL}/cases/{case_ref}/status")
        if r.status_code == 200:
            st = r.json()
            print(f"    Polling status: {st['status']} ({st['progress_percent']}% - {st['stage']})", flush=True)
            if st['status'] == "COMPLETED":
                completed = True
                break
            elif st['status'] == "FAILED":
                raise Exception(f"Trace background task failed: {st.get('error')}")
        time.sleep(2.5)

    assert completed, "Tracing timed out or did not complete within 60 seconds."
    print("[4] Tracing Background Task Completed Successfully", flush=True)

    # 5. Verify Graph & Risk Scores
    r = requests.get(f"{BASE_URL}/cases/{case_ref}/graph")
    assert r.status_code == 200, f"Graph fetch failed: {r.text}"
    graph = r.json()
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    vasp_sum = graph.get("vasp_summary", {})
    ai_sum = graph.get("ai_summary", "")

    assert len(nodes) > 0, "No nodes returned in graph snapshot."
    assert len(edges) > 0, "No edges returned in graph snapshot."
    print(f"[5] Graph Fetch OK - Nodes: {len(nodes)}, Edges: {len(edges)}", flush=True)
    
    # Assert node risk score exists
    for n in nodes:
        assert "risk_score" in n, f"Node missing risk_score: {n}"
        assert 0.0 <= n["risk_score"] <= 100.0, f"Invalid node risk score: {n['risk_score']}"
    print("    -> Node Risk Scores verified (Range: 0-100)", flush=True)

    # 6. Verify Alerts Endpoint
    r = requests.get(f"{BASE_URL}/cases/{case_ref}/alerts")
    assert r.status_code == 200, f"Alerts fetch failed: {r.text}"
    alerts_resp = r.json()
    alerts = alerts_resp.get("alerts", [])
    assert len(alerts) > 0, "Expected at least 1 risk alert generated."
    print(f"[6] Alerts Fetch OK - Generated Alerts Count: {len(alerts)}", flush=True)
    for a in alerts:
        print(f"    - Alert: [{a['severity']}] {a['title']} (Risk: {a['risk_score']})", flush=True)

    # 7. Verify VASP Summary Endpoint
    r = requests.get(f"{BASE_URL}/cases/{case_ref}/vasp-summary")
    assert r.status_code == 200, f"VASP summary fetch failed: {r.text}"
    vasp_resp = r.json()
    assert "probable_vasp" in vasp_resp, "Missing probable_vasp"
    assert "confidence_score" in vasp_resp, "Missing confidence_score"
    assert len(vasp_resp["ai_summary"]) > 50, "AI summary text is too short or missing."
    print(f"[7] VASP Summary OK - Probable VASP: {vasp_resp['probable_vasp']} (Confidence: {vasp_resp['confidence_score']}%)", flush=True)
    print(f"    AI Executive Summary Length: {len(vasp_resp['ai_summary'])} chars", flush=True)
    print(f"\n--- AI Summary Sample ---\n{vasp_resp['ai_summary'][:300]}...\n", flush=True)

    print("=== Phase 3 Verification Passed Successfully! ===", flush=True)

if __name__ == "__main__":
    run_test()
