import httpx

def main():
    print("Testing GET /health...")
    r = httpx.get("http://127.0.0.1:8000/health")
    print(f"Health Status Code: {r.status_code}")
    print(f"Health Response: {r.json()}")
    assert r.status_code == 200, "Health check failed"

    print("\nTesting POST /auth/login...")
    r2 = httpx.post(
        "http://127.0.0.1:8000/auth/login",
        json={"email": "admin@cryptotrace.gov.in", "password": "CT@2026#Quasar"}
    )
    print(f"Login Status Code: {r2.status_code}")
    login_data = r2.json()
    print(f"Login Response: {login_data}")
    assert r2.status_code == 200, "Login failed"
    token = login_data["access_token"]

    print("\nTesting GET /auth/me...")
    r3 = httpx.get("http://127.0.0.1:8000/auth/me", headers={"Authorization": f"Bearer {token}"})
    print(f"Auth Me Status Code: {r3.status_code}")
    print(f"Auth Me Response: {r3.json()}")
    assert r3.status_code == 200, "Auth me failed"

    print("\nTesting GET /stats...")
    r4 = httpx.get("http://127.0.0.1:8000/stats", headers={"Authorization": f"Bearer {token}"})
    print(f"Stats Status Code: {r4.status_code}")
    print(f"Stats Response: {r4.json()}")
    assert r4.status_code == 200, "Stats failed"

    print("\nALL BACKEND ENDPOINTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
