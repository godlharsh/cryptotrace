import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app import config

logger = logging.getLogger("cryptotrace.database")
Base = declarative_base()

db_type = "unknown"
db_connected = False
engine = None
SessionLocal = None

def init_db():
    global engine, SessionLocal, db_type, db_connected
    pg_url = config.DATABASE_URL
    if pg_url and pg_url.startswith("postgres"):
        if pg_url.startswith("postgresql://"):
            pg_url = pg_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        try:
            logger.info("Attempting connection to Postgres database...")
            # Try connecting to Postgres with a short timeout
            test_engine = create_engine(pg_url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            db_type = "postgres"
            db_connected = True
            logger.info("Successfully connected to Postgres database.")
        except Exception as e:
            logger.warning(f"Postgres connection failed: {e}. Falling back to local SQLite database.")
            db_type = "sqlite (fallback)"
            db_connected = True
            engine = create_engine("sqlite:///./local.db", connect_args={"check_same_thread": False})
    else:
        db_type = "sqlite"
        db_connected = True
        engine = create_engine("sqlite:///./local.db", connect_args={"check_same_thread": False})

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
