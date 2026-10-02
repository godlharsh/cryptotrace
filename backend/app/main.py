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
    # Phase 1: Return zero stats
    return schemas.StatsResponse(
        wallets_tracked=0,
        transactions_mapped=0,
        probable_vasps=0,
        high_risk_clusters=0
    )
