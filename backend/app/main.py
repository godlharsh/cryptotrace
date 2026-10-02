import time
import json
import asyncio
import httpx
from fastapi import FastAPI, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import config, models, schemas, auth
from app.database import engine, get_db, db_type, db_connected, Base
from app.neo4j_client import check_neo4j_connection, close_neo4j
from app.services.address_validator import detect_and_validate_address
from app.services.tracer_service import TracerService, get_trace_progress, update_trace_progress
from app.services.graph_store import GraphStore
from app.services.risk_engine import RiskEngine
from app.services.alert_engine import AlertEngine
from app.services.vasp_attribution import VASPAttributionService

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
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Metadata create_all initial attempt: {e}")
        
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        auth.seed_admin_user(db)
        
        # Clean up specified test cases
        target_cases = db.query(models.Case).filter(models.Case.case_ref.in_(["CT-593293", "CT-566760"])).all()
        target_ids = [c.id for c in target_cases]
        if target_ids:
            db.query(models.Alert).filter(models.Alert.case_id.in_(target_ids)).delete(synchronize_session=False)
        db.query(models.GraphSnapshot).filter(models.GraphSnapshot.case_ref.in_(["CT-593293", "CT-566760"])).delete(synchronize_session=False)
        db.query(models.Case).filter(models.Case.case_ref.in_(["CT-593293", "CT-566760"])).delete(synchronize_session=False)

        # Fix existing mislabeled rows in database by re-detecting chain from address
        cases_list = db.query(models.Case).all()
        for c in cases_list:
            is_valid, detected, _ = detect_and_validate_address(c.suspect_wallet)
            if is_valid and c.blockchain != detected:
                print(f"[+] Correcting DB case {c.case_ref} chain: {c.blockchain} -> {detected}")
                c.blockchain = detected

        wallets_list = db.query(models.Wallet).all()
        for w in wallets_list:
            is_valid, detected, _ = detect_and_validate_address(w.address)
            if is_valid and w.chain != detected:
                print(f"[+] Correcting DB wallet {w.address} chain: {w.chain} -> {detected}")
                w.chain = detected

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Startup DB correction notice: {e}")
    finally:
        db.close()

@app.on_event("shutdown")
def on_shutdown():
    close_neo4j()

@app.get("/health", response_model=schemas.HealthResponse)
async def health_check():
    neo4j_ok = check_neo4j_connection()
    etherscan_ok = bool(config.ETHERSCAN_API_KEY)
    trongrid_ok = bool(config.TRONGRID_API_KEY)
    coingecko_ok = bool(config.COINGECKO_API_KEY)
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
    from app.services.blockchain_clients import CoinGeckoClient
    wallets_count = db.query(models.Wallet).count()
    cases_count = db.query(models.Case).count()
    alerts_count = db.query(models.Alert).filter(models.Alert.severity.in_(["HIGH", "CRITICAL"])).count()
    rates = CoinGeckoClient.get_prices()
    inr_rate = rates.get("USD_INR", 86.5)

    return schemas.StatsResponse(
        wallets_tracked=wallets_count,
        transactions_mapped=cases_count * 15,
        probable_vasps=db.query(models.Wallet).filter(models.Wallet.vasp_name.isnot(None)).count(),
        high_risk_clusters=alerts_count,
        usd_inr_rate=inr_rate
    )

# --- BACKGROUND PIPELINE (PHASE 2 + PHASE 3) ---

async def run_background_trace(case_ref: str, wallet: str, chain: str, depth: int, db_session_factory):
    db = db_session_factory()
    try:
        case_obj = db.query(models.Case).filter(models.Case.case_ref == case_ref).first()
        case_id = case_obj.id if case_obj else None
        amount_lost = case_obj.amount_lost if case_obj else 0.0

        # 1. Multi-hop Blockchain Tracing
        nodes, edges = await asyncio.to_thread(
            TracerService.trace_wallet,
            case_ref,
            wallet,
            chain,
            depth
        )

        # 2. VASP Attribution Analysis
        update_trace_progress(case_ref, "Analyzing VASP Attribution", 80, hop=depth, wallets=len(nodes))
        nodes, vasp_summary = VASPAttributionService.analyze_attribution(nodes, edges, chain, wallet)

        # 3. Risk Engine Scoring
        update_trace_progress(case_ref, "Scoring Risk Patterns", 85, hop=depth, wallets=len(nodes))
        nodes, edges = RiskEngine.calculate_risk(nodes, edges, wallet, amount_lost)

        # 4. Alert Engine Generation
        update_trace_progress(case_ref, "Generating Fraud Alerts", 90, hop=depth, wallets=len(nodes))
        alerts_list = AlertEngine.generate_alerts(
            nodes, edges, case_ref, case_id=case_id, amount_lost=amount_lost, suspect_wallet=wallet
        )

        # 5. AI Executive Summary Generation (Gemini LLM)
        update_trace_progress(case_ref, "Generating AI Report", 95, hop=depth, wallets=len(nodes))
        ai_summary = VASPAttributionService.generate_ai_summary(
            case_ref, wallet, chain, amount_lost, nodes, edges, vasp_summary, alerts_list
        )

        # Save graph to Neo4j
        GraphStore.save_graph_to_neo4j(case_ref, nodes, edges)

        # Save graph snapshot JSON to DB
        graph_dict = {
            "nodes": nodes,
            "edges": edges,
            "vasp_summary": vasp_summary,
            "ai_summary": ai_summary
        }
        graph_json_str = json.dumps(graph_dict)

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

        # Save Alerts to DB
        if case_id:
            db.query(models.Alert).filter(models.Alert.case_id == case_id).delete()
            for a in alerts_list:
                alert_obj = models.Alert(
                    case_id=case_id,
                    title=a["title"],
                    severity=a["severity"],
                    risk_score=a["risk_score"],
                    reason=a["reason"],
                    status=a["status"],
                    path_json=a.get("path_json")
                )
                db.add(alert_obj)

        # Save Wallets to DB
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
            else:
                w_obj.risk_score = max(w_obj.risk_score or 0.0, n.get("risk_score", 0.0))
                if n.get("vasp_name"):
                    w_obj.vasp_name = n.get("vasp_name")
                    w_obj.vasp_confidence = n.get("vasp_confidence", 0.0)

        if case_obj:
            case_obj.status = "COMPLETED"

        db.commit()
        update_trace_progress(case_ref, "Done", 100, hop=depth, wallets=len(nodes), status="COMPLETED")

    except Exception as e:
        db.rollback()
        update_trace_progress(case_ref, "Failed", 0, status="FAILED", error=str(e))
    finally:
        db.close()

# --- CASE MANAGEMENT & TRACING ENDPOINTS ---

@app.post("/cases/trace")
async def initiate_trace(
    request: schemas.TraceRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    suspect_addr = request.suspect_wallet.strip()
    is_valid, detected_chain, err_msg = detect_and_validate_address(suspect_addr)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Validate selected blockchain against detected chain format
    if request.blockchain and request.blockchain.lower() != detected_chain:
        raise HTTPException(
            status_code=400,
            detail=f"This looks like a {detected_chain.upper()} address."
        )

    chain = detected_chain

    # Prevent Duplicate Cases for same wallet + chain
    if not request.force_new:
        existing_dup = db.query(models.Case).filter(
            models.Case.suspect_wallet.ilike(suspect_addr),
            models.Case.blockchain == chain
        ).first()

        if existing_dup:
            return JSONResponse(
                status_code=409,
                content={
                    "error": True,
                    "duplicate": True,
                    "existing_case_ref": existing_dup.case_ref,
                    "message": "A case for this wallet exists. Open it or create a new trace?"
                }
            )

    case_ref = request.case_ref or f"CT-{int(time.time())}"

    existing = db.query(models.Case).filter(models.Case.case_ref == case_ref).first()
    if not existing:
        case_obj = models.Case(
            case_ref=case_ref,
            title=request.title,
            complaint_details=request.complaint_details,
            amount_lost=request.amount_lost,
            suspect_wallet=suspect_addr,
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
        edges=graph_data.get("edges", []),
        vasp_summary=graph_data.get("vasp_summary"),
        ai_summary=graph_data.get("ai_summary")
    )

@app.get("/cases/{case_ref}/alerts", response_model=schemas.AlertsResponse)
async def get_case_alerts(case_ref: str, db: Session = Depends(get_db)):
    case_obj = db.query(models.Case).filter(models.Case.case_ref == case_ref).first()
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case reference not found")

    alerts = db.query(models.Alert).filter(models.Alert.case_id == case_obj.id).all()
    alert_items = [
        schemas.AlertItem(
            id=a.id,
            case_id=a.case_id,
            title=a.title,
            severity=a.severity,
            risk_score=a.risk_score,
            reason=a.reason,
            status=a.status,
            path_json=a.path_json
        )
        for a in alerts
    ]
    return schemas.AlertsResponse(
        case_ref=case_ref,
        alerts_count=len(alert_items),
        alerts=alert_items
    )

@app.get("/cases/{case_ref}/vasp-summary", response_model=schemas.VASPSummaryResponse)
async def get_case_vasp_summary(case_ref: str, db: Session = Depends(get_db)):
    snapshot = db.query(models.GraphSnapshot).filter(models.GraphSnapshot.case_ref == case_ref).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Graph snapshot not found")

    graph_data = json.loads(snapshot.graph_json)
    vasp_info = graph_data.get("vasp_summary", {})
    ai_sum = graph_data.get("ai_summary", "No summary available.")

    return schemas.VASPSummaryResponse(
        case_ref=case_ref,
        probable_vasp=vasp_info.get("probable_vasp", "Unknown"),
        confidence_score=vasp_info.get("confidence_score", 0.0),
        target_node=vasp_info.get("target_node", "N/A"),
        attribution_method=vasp_info.get("attribution_method", "Analysis"),
        ai_summary=ai_sum
    )

@app.get("/cases")
async def list_cases(db: Session = Depends(get_db)):
    cases = db.query(models.Case).order_by(models.Case.created_at.desc()).all()
    return cases
