from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), default="Administrator")
    role = Column(String(50), default="ADMIN")
    created_at = Column(DateTime, default=datetime.utcnow)

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_ref = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    complaint_details = Column(Text, nullable=True)
    amount_lost = Column(Float, nullable=True)
    suspect_wallet = Column(String(255), nullable=False)
    blockchain = Column(String(50), nullable=False)  # ethereum, tron, bitcoin
    depth = Column(Integer, default=4)
    status = Column(String(50), default="SUBMITTED")  # SUBMITTED, FETCHING, TRACING, SCORING, COMPLETED, FAILED
    created_at = Column(DateTime, default=datetime.utcnow)

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String(255), index=True, nullable=False)
    chain = Column(String(50), nullable=False)
    label = Column(String(255), nullable=True)
    risk_score = Column(Float, default=0.0)
    vasp_name = Column(String(255), nullable=True)
    vasp_confidence = Column(Float, default=0.0)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW
    risk_score = Column(Float, default=0.0)
    reason = Column(Text, nullable=False)
    status = Column(String(50), default="ACTIVE")  # ACTIVE, CONFIRMED, FALSE_POSITIVE
    path_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
