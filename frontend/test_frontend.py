import httpx

def main():
    print("Testing Vite Dev Server (http://localhost:5173)...")
    r = httpx.get("http://localhost:5173")
    print(f"Vite Status Code: {r.status_code}")
    assert r.status_code == 200, "Vite dev server not running"

    print("Testing Vite Dev Proxy (http://localhost:5173/api/health)...")
    r2 = httpx.get("http://localhost:5173/api/health")
    print(f"Proxy Health Status Code: {r2.status_code}")
    print(f"Proxy Health Response: {r2.json()}")
    assert r2.status_code == 200, "Vite /api proxy not working"

    print("\nALL FRONTEND & PROXY CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
