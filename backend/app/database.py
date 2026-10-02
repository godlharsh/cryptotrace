import os
import re
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from fastapi import HTTPException
from app import config

logger = logging.getLogger("cryptotrace.database")
Base = declarative_base()

db_type = "unknown"
db_connected = False
db_error_message = ""
engine = None
SessionLocal = None

def mask_credentials(url_or_msg: str) -> str:
    if not url_or_msg:
        return ""
    return re.sub(r"://([^:]+):([^@]+)@", r"://\1:****@", url_or_msg)

def init_db():
    global engine, SessionLocal, db_type, db_connected, db_error_message
    use_sqlite = os.getenv("USE_SQLITE", "false").lower() == "true"

    if use_sqlite:
        logger.info("USE_SQLITE=true explicitly set. Using local SQLite database.")
        db_type = "sqlite"
        db_connected = True
        engine = create_engine("sqlite:///./local.db", connect_args={"check_same_thread": False, "timeout": 30})
        with engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL;"))
    else:
        pg_url = config.DATABASE_URL
        if pg_url and pg_url.startswith("postgresql://"):
            pg_url = pg_url.replace("postgresql://", "postgresql+psycopg2://", 1)

        masked_url = mask_credentials(pg_url)
        logger.info(f"Connecting to Supabase PostgreSQL database: {masked_url}")

        try:
            test_engine = create_engine(pg_url, pool_pre_ping=True, connect_args={"connect_timeout": 10})
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            db_type = "postgres (Supabase)"
            db_connected = True
            db_error_message = ""
            logger.info("Successfully connected to Supabase PostgreSQL database.")
        except Exception as e:
            db_type = "postgres (Disconnected)"
            db_connected = False
            err_str = mask_credentials(str(e))
            db_error_message = err_str
            logger.error(f"Supabase PostgreSQL connection failed: {db_error_message}")
            engine = None

    if engine is not None:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    else:
        SessionLocal = None

init_db()

def get_db():
    if not db_connected or SessionLocal is None:
        raise HTTPException(
            status_code=503,
            detail={"message": f"Database not connected. {db_error_message}"}
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

