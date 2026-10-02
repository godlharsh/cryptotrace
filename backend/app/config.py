import os
from pathlib import Path
from dotenv import load_dotenv

# Load backend/.env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

ETHERSCAN_API_KEY = os.getenv("ETHERSCAN_API_KEY", "")
TRONGRID_API_KEY = os.getenv("TRONGRID_API_KEY", "")
COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./local.db")

NEO4J_URI = os.getenv("NEO4J_URI", "")
NEO4J_USER = os.getenv("NEO4J_USER", "")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "")

JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkeythatshouldbeoverridden32byteslong!")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@cryptotrace.gov.in")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "CT@2026#Quasar").strip('"').strip("'")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
FALLBACK_USD_INR = float(os.getenv("FALLBACK_USD_INR", "86.5"))
PORT = int(os.getenv("PORT", "8000"))
