from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str
    role: str

class HealthIntegrations(BaseModel):
    postgres_sqlite: bool
    db_mode: str
    neo4j: bool
    etherscan: bool
    trongrid: bool
    coingecko: bool
    gemini: bool

class HealthResponse(BaseModel):
    status: str
    version: str = "2.0.0"
    integrations: HealthIntegrations

class StatsResponse(BaseModel):
    wallets_tracked: int = 0
    transactions_mapped: int = 0
    probable_vasps: int = 0
    high_risk_clusters: int = 0

class ErrorResponse(BaseModel):
    error: bool = True
    message: str
