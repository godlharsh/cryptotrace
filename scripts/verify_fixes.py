import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_fixes():
    print("--- 1. Testing Health & Stats Endpoint ---")
    try:
        r = requests.get(f"{BASE_URL}/stats")
        print("Stats status:", r.status_code)
        print("Stats body:", r.json())
    except Exception as e:
        print("Error connecting to backend:", e)
        return

    print("\n--- 2. Testing Chain Mismatch Validation ---")
    tron_address = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    payload_mismatch = {
        "title": "TRON Mismatch Test",
        "suspect_wallet": tron_address,
        "blockchain": "ethereum",
        "depth": 2
    }
    r = requests.post(f"{BASE_URL}/cases/trace", json=payload_mismatch)
    print("Mismatch status code (expected 400):", r.status_code)
    print("Mismatch response:", r.json())

    print("\n--- 3. Testing Case Creation and Duplicate Prevention ---")
    payload_valid = {
        "title": "TRON Valid Case",
        "suspect_wallet": tron_address,
        "blockchain": "tron",
        "depth": 2
    }
    r1 = requests.post(f"{BASE_URL}/cases/trace", json=payload_valid)
    print("First trace status code (expected 200):", r1.status_code)
    print("First trace response:", r1.json())

    # Try duplicate without force_new
    r2 = requests.post(f"{BASE_URL}/cases/trace", json=payload_valid)
    print("Duplicate status code (expected 409):", r2.status_code)
    print("Duplicate response:", r2.json())

    print("\n--- 4. Testing Deleted Test Cases ---")
    r_cases = requests.get(f"{BASE_URL}/cases")
    cases = r_cases.json()
    refs = [c.get("case_ref") for c in cases]
    print("Cases count:", len(cases))
    print("CT-593293 in cases?", "CT-593293" in refs)
    print("CT-566760 in cases?", "CT-566760" in refs)

    print("\n--- 5. Checking Mislabeled DB Rows ---")
    mislabeled = [c for c in cases if c["suspect_wallet"].startswith("T") and c["blockchain"] != "tron"]
    print("Mislabeled TRON cases count (expected 0):", len(mislabeled))
    if mislabeled:
        print("Mislabeled:", mislabeled)
    else:
        print("All TRON addresses correctly assigned 'tron' chain!")

if __name__ == "__main__":
    test_fixes()
