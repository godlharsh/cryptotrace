from typing import Optional, List, Dict, Any
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
    usd_inr_rate: float = 86.5

class ErrorResponse(BaseModel):
    error: bool = True
    message: str

class TraceRequest(BaseModel):
    case_ref: Optional[str] = None
    title: str = "Suspect Wallet Investigation"
    complaint_details: Optional[str] = ""
    amount_lost: Optional[float] = 0.0
    suspect_wallet: str
    blockchain: Optional[str] = None  # ethereum, tron, bitcoin
    depth: Optional[int] = 4
    force_new: Optional[bool] = False

class TraceStatusResponse(BaseModel):
    case_ref: str
    status: str
    progress_percent: int
    stage: str
    current_hop: int
    wallets_found: int
    error: Optional[str] = None

class GraphResponse(BaseModel):
    case_ref: str
    nodes: list
    edges: list
    vasp_summary: Optional[dict] = None
    ai_summary: Optional[str] = None

class AlertItem(BaseModel):
    id: Optional[int] = None
    case_id: Optional[int] = None
    title: str
    severity: str
    risk_score: float
    reason: str
    status: str = "ACTIVE"
    path_json: Optional[str] = None

class AlertsResponse(BaseModel):
    case_ref: str
    alerts_count: int
    alerts: List[AlertItem]

class VASPSummaryResponse(BaseModel):
    case_ref: str
    probable_vasp: str
    confidence_score: float
    target_node: str
    attribution_method: str
    ai_summary: str

class CaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    case_ref: str
    title: str
    complaint_details: Optional[str] = None
    amount_lost: Optional[float] = 0.0
    amount_lost_usd: Optional[float] = 0.0
    usd_inr_rate: Optional[float] = 86.5
    rate_at: Optional[Any] = None
    suspect_wallet: str
    blockchain: str
    depth: int
    status: str
    created_at: Any

