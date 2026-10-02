"""
CryptoTrace v2 - Demo Seed Data Script
Pre-loads realistic multi-hop fraud cases for Ethereum, TRON (USDT-TRC20), and Bitcoin
into Supabase Postgres / SQLite database for instant SIH 2026 jury demonstrations.
"""

import sys
import json
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, engine, Base
from app import models, auth, config

def seed_data():
    print("=== CryptoTrace v2: Seeding Demo Cases ===")
    
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Seed Admin User
        auth.seed_admin_user(db)
        print("[+] Admin user verified: admin@cryptotrace.gov.in")

        # --- CASE 1: Ethereum Phishing Scam ($150,000 USD) ---
        case1_ref = "CT-2026-ETH-9912"
        existing1 = db.query(models.Case).filter(models.Case.case_ref == case1_ref).first()
        if not existing1:
            case1 = models.Case(
                case_ref=case1_ref,
                title="Ethereum Approval Phishing Investigation",
                complaint_details="Victim reported 46.8 ETH ($150,000 USD) drained via malicious ERC-20 permit signature.",
                amount_lost=150000.0,
                suspect_wallet="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
                blockchain="ethereum",
                depth=4,
                status="COMPLETED"
            )
            db.add(case1)
            db.flush()

            nodes1 = [
                {"id": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum", "role": "origin", "label": "Victim Suspect Wallet", "risk_score": 98.0, "hop": 0},
                {"id": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "address": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "chain": "ethereum", "role": "intermediary", "label": "Layering Hub A (Router)", "risk_score": 85.0, "hop": 1},
                {"id": "0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be", "address": "0x3f5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE", "chain": "ethereum", "role": "vasp_deposit", "label": "Binance Hot Wallet", "risk_score": 90.0, "hop": 2, "vasp_name": "Binance", "vasp_confidence": 98.0},
            ]
            edges1 = [
                {"id": "tx_eth_1", "source": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "target": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "amount": 46.8, "token": "ETH", "fiat_usd": 150000.0, "tx_hash": "0xa1b2c3d4e5f6...", "timestamp": int(time.time()) - 3600, "risk_score": 92.0},
                {"id": "tx_eth_2", "source": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", "target": "0x3f5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE", "amount": 46.5, "token": "ETH", "fiat_usd": 149000.0, "tx_hash": "0xf6e5d4c3b2a1...", "timestamp": int(time.time()) - 1800, "risk_score": 95.0},
            ]
            vasp_sum1 = {"probable_vasp": "Binance", "confidence_score": 98.0, "target_node": "0x3f5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE", "attribution_method": "Exact Signature Tag"}
            ai_sum1 = "### Executive Summary (Case: CT-2026-ETH-9912)\n\n1. **Intake & Loss Overview:** 46.8 ETH ($150,000 USD) was drained from suspect wallet `0xd8dA...6045` following an unauthorized permit signature.\n2. **Fund-Flow Path:** Funds were immediately routed through intermediary hub `0x7a25...488d` before consolidating into a single deposit transaction.\n3. **VASP Attribution:** Terminal deposit node `0x3f5C...f0bE` was conclusively attributed to **Binance** with 98% confidence. Recommended action: Issue Section 91 CrPC LEA freeze request."

            db.add(models.GraphSnapshot(case_ref=case1_ref, graph_json=json.dumps({"nodes": nodes1, "edges": edges1, "vasp_summary": vasp_sum1, "ai_summary": ai_sum1}), nodes_count=3, edges_count=2))
            db.add(models.Alert(case_id=case1.id, title="Probable Binance Exchange Deposit Identified (VASP Exit)", severity="CRITICAL", risk_score=95.0, reason="46.5 ETH ($149,000 USD) deposited directly into Binance Hot Wallet.", status="ACTIVE"))
            print(f"[+] Seeded Case 1: {case1_ref}")

        # --- CASE 2: TRON USDT-TRC20 Pig Butchering ($85,000 USDT) ---
        case2_ref = "CT-2026-TRON-8841"
        existing2 = db.query(models.Case).filter(models.Case.case_ref == case2_ref).first()
        if not existing2:
            case2 = models.Case(
                case_ref=case2_ref,
                title="TRON USDT Investment Scam (Pig Butchering)",
                complaint_details="Victim lost 85,000 USDT transferred across fake trading platform portal.",
                amount_lost=85000.0,
                suspect_wallet="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
                blockchain="tron",
                depth=3,
                status="COMPLETED"
            )
            db.add(case2)
            db.flush()

            nodes2 = [
                {"id": "tr7nhqjekqxgtcik8q8zy4pl8otszgjlj6t", "address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "chain": "tron", "role": "origin", "label": "Suspect TRON Deposit Wallet", "risk_score": 98.0, "hop": 0},
                {"id": "tnd27599vthv96t56x9s5d597k6k862c4a", "address": "TND27599vthV96T56X9S5d597k6k862c4a", "chain": "tron", "role": "vasp_deposit", "label": "Binance TRON Deposit Hub", "risk_score": 90.0, "hop": 1, "vasp_name": "Binance (TRON)", "vasp_confidence": 98.0},
            ]
            edges2 = [
                {"id": "tx_tron_1", "source": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "target": "TND27599vthV96T56X9S5d597k6k862c4a", "amount": 85000.0, "token": "USDT", "fiat_usd": 85000.0, "tx_hash": "e3b0c44298fc...", "timestamp": int(time.time()) - 7200, "risk_score": 94.0},
            ]
            vasp_sum2 = {"probable_vasp": "Binance (TRON)", "confidence_score": 98.0, "target_node": "TND27599vthV96T56X9S5d597k6k862c4a", "attribution_method": "Exact Signature Tag"}
            ai_sum2 = "### Executive Summary (Case: CT-2026-TRON-8841)\n\n1. **Intake & Loss Overview:** 85,000 USDT-TRC20 was transferred to fraudulent investment pool.\n2. **Fund-Flow Path:** Funds were directly transferred to TRON exchange deposit address.\n3. **VASP Attribution:** Destination address `TND27599...` matched **Binance (TRON)** with 98% confidence. Recommended action: Submit LEA subpoena to Binance Compliance."

            db.add(models.GraphSnapshot(case_ref=case2_ref, graph_json=json.dumps({"nodes": nodes2, "edges": edges2, "vasp_summary": vasp_sum2, "ai_summary": ai_sum2}), nodes_count=2, edges_count=1))
            db.add(models.Alert(case_id=case2.id, title="High-Value USDT TRC20 Deposit ($85,000)", severity="HIGH", risk_score=88.0, reason="Direct single-transfer of 85,000 USDT into exchange deposit wallet.", status="ACTIVE"))
            print(f"[+] Seeded Case 2: {case2_ref}")

        # Seed Wallets Table
        wallets_to_seed = [
            ("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "ethereum", "Victim Suspect Wallet", 98.0, None, 0.0),
            ("0x3f5CE5FBFe3E9af3971dD833D26BA9b5C936f0bE", "ethereum", "Binance Hot Wallet", 90.0, "Binance", 98.0),
            ("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", "tron", "Suspect TRON Deposit Wallet", 98.0, None, 0.0),
            ("TND27599vthV96T56X9S5d597k6k862c4a", "tron", "Binance TRON Deposit Hub", 90.0, "Binance (TRON)", 98.0),
        ]

        for addr, ch, lbl, r_score, v_name, v_conf in wallets_to_seed:
            w_existing = db.query(models.Wallet).filter(models.Wallet.address == addr).first()
            if not w_existing:
                db.add(models.Wallet(
                    address=addr,
                    chain=ch,
                    label=lbl,
                    risk_score=r_score,
                    vasp_name=v_name,
                    vasp_confidence=v_conf
                ))

        db.commit()
        print("=== Seeding Completed Successfully ===")

    except Exception as e:
        db.rollback()
        print(f"[-] Seeding error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
