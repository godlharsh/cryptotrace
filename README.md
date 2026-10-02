# CryptoTrace v2 - Real-Time Fraud-Linked Cryptocurrency Exchange Identification Platform

**Smart India Hackathon 2026**  
**Problem Statement ID 26183**: *"Real-Time Identification of Fraud-Linked Cryptocurrency Exchanges from Victim-Reported Suspect Wallet Addresses through Automated Blockchain Analytics"*  
**Team**: Quantam Quasar (Team ID: `155093`)

---

## 🚀 Overview

CryptoTrace v2 is an enterprise-grade automated cryptocurrency forensics and investigation platform designed for Law Enforcement Agencies (LEAs), Cyber Crime Cells, and Financial Intelligence Units (FIUs).

When a victim reports a fraud-linked suspect wallet address, CryptoTrace v2:
1. **Automates Multi-Hop Fund-Flow Tracing** across Ethereum (EVM/ERC-20), TRON (TRX/USDT-TRC20), and Bitcoin (BTC) mainnet blockchains up to 6 hops deep.
2. **Computes Node & Edge Risk Scores (0-100)** using hop distance decay, transaction volume anomalies ($50,000+ USD), and multi-recipient fan-out layering patterns.
3. **Identifies the Probable Destination Exchange (VASP)** with an automated confidence score (0-100%) by combining exact off-chain address signatures with multi-hop terminal deposit heuristics.
4. **Generates Gemini AI Executive Forensic Narratives** using `gemini-2.5-flash` model.
5. **Produces Legal Evidence-Linked PDF Dossiers** formatted with Section 91 CrPC subpoena templates for emergency account freeze requests to identified VASP compliance teams.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12+, FastAPI, Uvicorn, SQLAlchemy (PostgreSQL / SQLite WAL mode), NetworkX, Pydantic v2, Bcrypt, PyJWT.
- **Frontend**: React 18, Vite 5, React Router v6, Lucide React, Custom 2D SVG Interactive Graph Visualizer (`GraphCanvas.jsx`).
- **Database & Graph Engine**: Supabase PostgreSQL (production mode with SQLite WAL mode fallback), Neo4j Aura Graph Database.
- **Integrations**: Etherscan V2 API (EVM), TronGrid API (TRON), Mempool.space / Blockstream (Bitcoin), CoinGecko API (USD rates), Google Gemini API (`gemini-2.5-flash`).

---

## 📦 Project Architecture

```
cryptotrace-v2/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI application & API endpoints
│   │   ├── config.py                   # Environment configuration loader
│   │   ├── database.py                 # SQLAlchemy Supabase / SQLite engine
│   │   ├── models.py                   # User, Case, Wallet, Alert, GraphSnapshot ORM
│   │   ├── schemas.py                  # Pydantic request/response schemas
│   │   ├── auth.py                     # JWT Authentication & Bcrypt hashing
│   │   ├── neo4j_client.py             # Neo4j Graph Database connector
│   │   └── services/
│   │       ├── address_validator.py    # EVM, TRON, BTC chain auto-detector
│   │       ├── blockchain_clients.py   # Etherscan V2, TronGrid, Mempool, CoinGecko clients
│   │       ├── tracer_service.py       # BFS Multi-hop tracer with dust filter
│   │       ├── graph_store.py          # Neo4j + JSON Snapshot graph storage
│   │       ├── risk_engine.py          # Risk scoring engine (0-100)
│   │       ├── alert_engine.py         # Fraud alert generator (CRITICAL, HIGH, MEDIUM)
│   │       └── vasp_attribution.py     # VASP identification & Gemini LLM report generator
│   └── scripts/
│       ├── check_apis.py               # Live API key & integration auditor
│       ├── seed_demo_cases.py          # Pre-loads demo cases into database
│       └── verify_phase5_demo.py       # End-to-end automated system test
└── frontend/
    ├── src/
    │   ├── App.jsx                     # React Router & Auth/Theme Provider
    │   ├── main.jsx                    # Entry point
    │   ├── index.css                   # Government Design System CSS tokens
    │   ├── components/
    │   │   ├── AppShell.jsx            # 5-item sidebar navigation & dark theme toggle
    │   │   ├── GraphCanvas.jsx         # Interactive 2D SVG Graph Renderer
    │   │   ├── ErrorBoundary.jsx       # Error fallback component
    │   │   └── ProtectedRoute.jsx      # JWT Auth Guard
    │   └── pages/
    │       ├── LoginPage.jsx           # Login page with demo credentials
    │       ├── DashboardPage.jsx       # Metrics telemetry & recent cases
    │       ├── FundFlowPage.jsx        # Tracing workbench & node inspector drawer
    │       ├── AlertsPage.jsx          # Risk & fraud alerts center
    │       ├── ReportWalletPage.jsx    # VASP attribution & Gemini AI summary
    │       └── ReportsPage.jsx         # Section 91 CrPC LEA Subpoena PDF generator
```

---

## ⚡ Quick Start Guide

### 1. Environment Setup

Copy `.env.example` to `.env` inside `backend/`:
```env
ADMIN_EMAIL="admin@cryptotrace.gov.in"
ADMIN_PASSWORD="CT@2026#Quasar"
ETHERSCAN_API_KEY="your_etherscan_key"
TRONGRID_API_KEY="your_trongrid_key"
COINGECKO_API_KEY="your_coingecko_key"
GEMINI_API_KEY="your_gemini_key"
DATABASE_URL="postgresql://user:pass@supabase-host:5432/postgres"
```

### 2. Start Backend Server
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend API docs available at: `http://127.0.0.1:8000/docs`

### 3. Seed Demo Data
```bash
cd backend
python scripts/seed_demo_cases.py
```

### 4. Start Frontend Application
```bash
cd frontend
npm run dev
```
Access UI at: `http://localhost:5173`

**Demo Credentials**:
- **Email**: `admin@cryptotrace.gov.in`
- **Password**: `CT@2026#Quasar`

---

## ⚖️ License & Attribution

Developed for **Smart India Hackathon 2026** by **Team Quantam Quasar** (Team ID: `155093`).
All Rights Reserved.
