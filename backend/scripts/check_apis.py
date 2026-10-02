import os
import sys
from pathlib import Path

# Add app directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import httpx
from dotenv import load_dotenv
from app import config
from app.database import engine, db_type
from sqlalchemy import text
from app.neo4j_client import check_neo4j_connection

def mask_secret(value: str) -> str:
    if not value or len(value) < 6:
        return "****"
    return f"{value[:3]}****{value[-3:]}"

def check_postgres() -> tuple[bool, str]:
    try:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT 1")).scalar()
            return True, f"PASS ({db_type})"
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def check_neo4j() -> tuple[bool, str]:
    try:
        ok = check_neo4j_connection()
        return (True, "PASS") if ok else (False, "FAIL (connection refused/auth error)")
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def check_etherscan() -> tuple[bool, str]:
    if not config.ETHERSCAN_API_KEY:
        return False, "FAIL (No Key)"
    url = f"https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=0x0000000000000000000000000000000000000000&startblock=0&endblock=1&sort=asc&apikey={config.ETHERSCAN_API_KEY}"
    try:
        r = httpx.get(url, timeout=8.0)
        data = r.json()
        if r.status_code == 200 and (data.get("status") in ["1", "0"] or "result" in data):
            return True, "PASS"
        return False, f"FAIL (status={r.status_code})"
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def check_trongrid() -> tuple[bool, str]:
    if not config.TRONGRID_API_KEY:
        return False, "FAIL (No Key)"
    url = "https://api.trongrid.io/v1/accounts/TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
    headers = {"TRON-PRO-API-KEY": config.TRONGRID_API_KEY}
    try:
        r = httpx.get(url, headers=headers, timeout=8.0)
        if r.status_code == 200:
            return True, "PASS"
        return False, f"FAIL (status={r.status_code})"
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def check_mempool() -> tuple[bool, str]:
    url = "https://mempool.space/api/blocks/tip/height"
    try:
        r = httpx.get(url, timeout=8.0)
        if r.status_code == 200 and r.text.isdigit():
            return True, f"PASS (Height: {r.text})"
        return False, f"FAIL (status={r.status_code})"
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def check_coingecko() -> tuple[bool, str]:
    if not config.COINGECKO_API_KEY:
        return False, "FAIL (No Key)"
    url = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,inr"
    headers = {"x-cg-demo-api-key": config.COINGECKO_API_KEY}
    try:
        r = httpx.get(url, headers=headers, timeout=8.0)
        if r.status_code == 200:
            return True, "PASS"
        return False, f"FAIL (status={r.status_code})"
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def check_gemini() -> tuple[bool, str]:
    if not config.GEMINI_API_KEY:
        return False, "FAIL (No Key)"
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={config.GEMINI_API_KEY}"
    try:
        r = httpx.get(url, timeout=10.0)
        if r.status_code == 200:
            data = r.json()
            models_list = data.get("models", [])
            flash_models = [
                m["name"].replace("models/", "")
                for m in models_list
                if "flash" in m["name"].lower() and "generateContent" in m.get("supportedGenerationMethods", [])
            ]
            chosen_model = flash_models[0] if flash_models else "gemini-1.5-flash"
            
            # Update .env GEMINI_MODEL
            env_file = backend_dir / ".env"
            if env_file.exists():
                lines = env_file.read_text().splitlines()
                new_lines = []
                found = False
                for line in lines:
                    if line.startswith("GEMINI_MODEL="):
                        new_lines.append(f"GEMINI_MODEL={chosen_model}")
                        found = True
                    else:
                        new_lines.append(line)
                if not found:
                    new_lines.append(f"GEMINI_MODEL={chosen_model}")
                env_file.write_text("\n".join(new_lines) + "\n")
            
            return True, f"PASS (Model: {chosen_model})"
        return False, f"FAIL (status={r.status_code})"
    except Exception as e:
        return False, f"FAIL ({str(e)[:40]})"

def main():
    print("======================================================")
    print("       CryptoTrace v2 - API Readiness Audit           ")
    print("======================================================")
    
    results = [
        ("Database (Postgres/SQLite)", *check_postgres()),
        ("Graph DB (Neo4j Aura)", *check_neo4j()),
        ("Ethereum (Etherscan V2)", *check_etherscan()),
        ("TRON (TronGrid API)", *check_trongrid()),
        ("Bitcoin (Mempool.space)", *check_mempool()),
        ("Market Data (CoinGecko)", *check_coingecko()),
        ("AI Provider (Gemini API)", *check_gemini()),
    ]
    
    print(f"{'Service':<30} | {'Status':<10} | {'Details'}")
    print("-" * 65)
    for service, status_ok, details in results:
        status_str = "PASS" if status_ok else "FAIL"
        print(f"{service:<30} | {status_str:<10} | {details}")
    print("======================================================\n")

if __name__ == "__main__":
    main()
