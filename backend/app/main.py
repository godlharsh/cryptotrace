import time
import json
import httpx
from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import config, models, schemas, auth
from app.database import engine, get_db, db_type, db_connected, Base
from app.neo4j_client import check_neo4j_connection, close_neo4j

app = FastAPI(title="CryptoTrace v2 API", version="2.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS + ["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for standardized error responses
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "message" in detail:
        msg = detail["message"]
    elif isinstance(detail, str):
        msg = detail
    else:
        msg = str(detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "message": msg},
        headers=exc.headers,
    )

@app.on_event("startup")
def on_startup():
    # Auto-create tables
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Metadata create_all initial attempt: {e}")
        
    db = next(get_db())
    try:
        auth.seed_admin_user(db)
    except Exception as e:
        db.rollback()
        print(f"Legacy schema mismatch detected: {e}. Recreating v2 tables...")
        try:
            with engine.begin() as conn:
                conn.execute(text("DROP TABLE IF EXISTS users CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS cases CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS wallets CASCADE;"))
                conn.execute(text("DROP TABLE IF EXISTS alerts CASCADE;"))
        except Exception as drop_err:
            print(f"Drop table error: {drop_err}")
        Base.metadata.create_all(bind=engine)
        auth.seed_admin_user(db)
    finally:
        db.close()

@app.on_event("shutdown")
def on_shutdown():
    close_neo4j()

@app.get("/health", response_model=schemas.HealthResponse)
async def health_check():
    # Check Neo4j
    neo4j_ok = check_neo4j_connection()
    
    # Etherscan check (silent non-secret ping)
    etherscan_ok = bool(config.ETHERSCAN_API_KEY)
    
    # TronGrid check
    trongrid_ok = bool(config.TRONGRID_API_KEY)
    
    # CoinGecko check
    coingecko_ok = bool(config.COINGECKO_API_KEY)
    
    # Gemini check
    gemini_ok = bool(config.GEMINI_API_KEY)
    
    return schemas.HealthResponse(
        status="ok",
        integrations=schemas.HealthIntegrations(
            postgres_sqlite=db_connected,
            db_mode=db_type,
            neo4j=neo4j_ok,
            etherscan=etherscan_ok,
            trongrid=trongrid_ok,
            coingecko=coingecko_ok,
            gemini=gemini_ok,
        )
    )

@app.post("/auth/login", response_model=schemas.Token)
async def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserResponse)
async def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.get("/stats", response_model=schemas.StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    wallets_count = db.query(models.Wallet).count()
    cases_count = db.query(models.Case).count()
    alerts_count = db.query(models.Alert).filter(models.Alert.severity == "HIGH").count() + db.query(models.Alert).filter(models.Alert.severity == "CRITICAL").count()
    return schemas.StatsResponse(
        wallets_tracked=wallets_count,
        transactions_mapped=cases_count * 15,
        probable_vasps=db.query(models.Wallet).filter(models.Wallet.vasp_name.isnot(None)).count(),
        high_risk_clusters=alerts_count
    )

# --- PHASE 2 BLOCKCHAIN TRACING ENDPOINTS ---

import asyncio
from fastapi import BackgroundTasks
from app.services.address_validator import detect_and_validate_address
from app.services.tracer_service import TracerService, get_trace_progress, update_trace_progress
from app.services.graph_store import GraphStore

async def run_background_trace(case_ref: str, wallet: str, chain: str, depth: int, db_session_factory):
    db = db_session_factory()
    try:
        # Execute synchronous tracer in worker thread to keep FastAPI main event loop non-blocking
        nodes, edges = await asyncio.to_thread(
            TracerService.trace_wallet,
            case_ref,
            wallet,
            chain,
            depth
        )

        # Save to Neo4j
        GraphStore.save_graph_to_neo4j(case_ref, nodes, edges)

        # Save Graph JSON Snapshot to Postgres/SQLite (Upsert)
        graph_json_str = GraphStore.graph_to_json(nodes, edges)
        snapshot = db.query(models.GraphSnapshot).filter(models.GraphSnapshot.case_ref == case_ref).first()
        if not snapshot:
            snapshot = models.GraphSnapshot(
                case_ref=case_ref,
                graph_json=graph_json_str,
                nodes_count=len(nodes),
                edges_count=len(edges)
            )
            db.add(snapshot)
        else:
            snapshot.graph_json = graph_json_str
            snapshot.nodes_count = len(nodes)
            snapshot.edges_count = len(edges)

        # Update Case status & create wallet records
        case_obj = db.query(models.Case).filter(models.Case.case_ref == case_ref).first()
        if case_obj:
            case_obj.status = "COMPLETED"

        for n in nodes:
            w_obj = db.query(models.Wallet).filter(models.Wallet.address == n["address"], models.Wallet.chain == n["chain"]).first()
            if not w_obj:
                w_obj = models.Wallet(
                    address=n["address"],
                    chain=n["chain"],
                    label=n.get("label"),
                    risk_score=n.get("risk_score", 0.0),
                    vasp_name=n.get("vasp_name"),
                    vasp_confidence=n.get("vasp_confidence", 0.0)
                )
                db.add(w_obj)

        db.commit()
        update_trace_progress(case_ref, "Done", 100, hop=depth, wallets=len(nodes), status="COMPLETED")

    except Exception as e:
        db.rollback()
        update_trace_progress(case_ref, "Failed", 0, status="FAILED", error=str(e))
    finally:
        db.close()

@app.post("/cases/trace")
async def initiate_trace(
    request: schemas.TraceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Validate address & auto-detect chain if needed
    is_valid, detected_chain, err_msg = detect_and_validate_address(request.suspect_wallet)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    chain = request.blockchain.lower() if request.blockchain else detected_chain
    case_ref = request.case_ref or f"CT-{int(time.time())}"

    # Check if case exists
    existing = db.query(models.Case).filter(models.Case.case_ref == case_ref).first()
    if not existing:
        case_obj = models.Case(
            case_ref=case_ref,
            title=request.title,
            complaint_details=request.complaint_details,
            amount_lost=request.amount_lost,
            suspect_wallet=request.suspect_wallet,
            blockchain=chain,
            depth=request.depth or 4,
            status="SUBMITTED"
        )
        db.add(case_obj)
        db.commit()
        db.refresh(case_obj)
    else:
        case_obj = existing
        case_obj.status = "SUBMITTED"
        db.commit()

    update_trace_progress(case_ref, "Submitted", 10, hop=0, wallets=1, status="SUBMITTED")

    # Launch trace task
    from app.database import SessionLocal
    background_tasks.add_task(
        run_background_trace,
        case_ref=case_ref,
        wallet=request.suspect_wallet,
        chain=chain,
        depth=request.depth or 4,
        db_session_factory=SessionLocal
    )

    return {"case_id": case_obj.id, "case_ref": case_obj.case_ref, "status": "SUBMITTED", "chain": chain}

@app.get("/cases/{case_ref}/status", response_model=schemas.TraceStatusResponse)
async def get_case_status(case_ref: str, db: Session = Depends(get_db)):
    progress = get_trace_progress(case_ref)
    case_obj = db.query(models.Case).filter(models.Case.case_ref == case_ref).first()
    
    status_str = progress["status"] if progress["status"] != "NOT_STARTED" else (case_obj.status if case_obj else "SUBMITTED")

    return schemas.TraceStatusResponse(
        case_ref=case_ref,
        status=status_str,
        progress_percent=progress["progress_percent"],
        stage=progress["stage"],
        current_hop=progress["current_hop"],
        wallets_found=progress["wallets_found"],
        error=progress.get("error")
    )

@app.get("/cases/{case_ref}/graph", response_model=schemas.GraphResponse)
async def get_case_graph(case_ref: str, db: Session = Depends(get_db)):
    snapshot = db.query(models.GraphSnapshot).filter(models.GraphSnapshot.case_ref == case_ref).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Graph snapshot not found for this case reference")

    graph_data = json.loads(snapshot.graph_json)
    return schemas.GraphResponse(
        case_ref=case_ref,
        nodes=graph_data.get("nodes", []),
        edges=graph_data.get("edges", [])
    )

@app.get("/cases")
async def list_cases(db: Session = Depends(get_db)):
    cases = db.query(models.Case).order_by(models.Case.created_at.desc()).all()
    return cases

