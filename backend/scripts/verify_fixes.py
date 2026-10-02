"""
CryptoTrace v2 - User Requested Fixes Verification Script
"""

import sys
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_fixes():
    print("=== CryptoTrace v2: Verifying Requested Fixes ===", flush=True)

    # 1. Login
    r = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@cryptotrace.gov.in", "password": "CT@2026#Quasar"})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[1] Authentication OK", flush=True)

    # 2. Test Chain Detection & Mismatch Error
    payload_mismatch = {
        "suspect_wallet": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",  # TRON address
        "blockchain": "ethereum",
        "depth": 2
    }
    r = requests.post(f"{BASE_URL}/cases/trace", json=payload_mismatch, headers=headers)
    assert r.status_code == 400, f"Expected 400 for chain mismatch, got {r.status_code}: {r.text}"
    err_text = r.json().get("message", "")
    assert "This looks like a TRON address" in err_text, f"Unexpected error message: {err_text}"
    print(f"[2] Chain Mismatch Error Verified: '{err_text}'", flush=True)

    # 3. Test Duplicate Case Prevention (409 Conflict)
    payload_dup = {
        "suspect_wallet": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", # Ethereum address with existing case
        "blockchain": "ethereum",
        "depth": 2
    }
    r = requests.post(f"{BASE_URL}/cases/trace", json=payload_dup, headers=headers)
    assert r.status_code == 409, f"Expected 409 Conflict for duplicate case, got {r.status_code}: {r.text}"
    dup_res = r.json()
    assert dup_res.get("duplicate") is True, "Missing duplicate flag"
    print(f"[3] Duplicate Case Detection Verified: '{dup_res.get('message')}' (Existing Ref: {dup_res.get('existing_case_ref')})", flush=True)

    # 4. Verify test cases CT-593293 and CT-566760 deleted
    r = requests.get(f"{BASE_URL}/cases", headers=headers)
    assert r.status_code == 200
    cases = r.json()
    case_refs = [c["case_ref"] for c in cases]
    assert "CT-593293" not in case_refs, "CT-593293 was not deleted!"
    assert "CT-566760" not in case_refs, "CT-566760 was not deleted!"
    print(f"[4] Removed Test Cases CT-593293 & CT-566760 Verified (Active Cases: {len(cases)})", flush=True)

    # 5. Check all TRON addresses in database have blockchain='tron'
    for c in cases:
        if c["suspect_wallet"].startswith("T"):
            assert c["blockchain"] == "tron", f"Wrong chain for TRON wallet {c['suspect_wallet']}: {c['blockchain']}"
    print("[5] Database Chain Correction Verified — All TRON addresses have blockchain='tron'", flush=True)

    # 6. Verify Stats USD/INR Rate
    r = requests.get(f"{BASE_URL}/stats", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    assert "usd_inr_rate" in stats, "Missing usd_inr_rate in stats"
    print(f"[6] USD/INR Rate Verified: ₹{stats['usd_inr_rate']} INR per USD", flush=True)

    print("\n=== ALL FIXES VERIFIED SUCCESSFULLY ON BACKEND! ===", flush=True)

if __name__ == "__main__":
    test_fixes()
