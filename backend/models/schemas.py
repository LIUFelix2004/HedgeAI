from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict


class AccountCreds(BaseModel):
    apiKey: Optional[str] = None
    apiSecret: Optional[str] = None
    address: Optional[str] = None
    privateKey: Optional[str] = None


class AccountStatus(BaseModel):
    connected: bool
    platform: str
    address: Optional[str] = None
    balance: Optional[float] = None
    trading_enabled: Optional[bool] = None
    support_status: Optional[str] = None
    read_status: Optional[str] = None


class Position(BaseModel):
    platform: str
    symbol: str
    direction: str
    size: float
    leverage: float
    entry_price: float
    current_price: float
    unrealized_pnl_pct: float
    margin_used: float
    liquidation_price: float
    liquidation_distance_pct: float


class StrategyMarketLink(BaseModel):
    label: str
    url: str
    venue: Optional[str] = None
    note: Optional[str] = None
    outcome: Optional[str] = None
    price: Optional[float] = None
    probability: Optional[float] = None
    updated_at: Optional[str] = None
    token_id: Optional[str] = None


class HedgeStrategy(BaseModel):
    id: str
    type: str
    title: str
    description: str
    hedge_ratio: str
    estimated_cost: str
    complexity: str
    pros: str
    cons: str
    injective_action: str
    execution_venue: Optional[str] = None
    reference_summary: Optional[str] = None
    market_links: Optional[List[StrategyMarketLink]] = None
    market_snapshot: Optional[dict] = None


class ExecuteMode(str, Enum):
    DEMO = "demo"
    DRY_RUN = "dry_run"
    REAL = "real"


class AnalysisResult(BaseModel):
    risk_level: str
    risk_summary: str
    liquidation_distance_pct: float
    urgency: str
    strategies: List[HedgeStrategy]


class HistoryMessage(BaseModel):
    role: str
    content: str


class ConnectedAccount(BaseModel):
    platform: str
    connected: bool = True
    address: Optional[str] = None
    positions: Optional[List[Any]] = None


class ChatRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    message: str
    model: str = "claude"
    model_api_key: Optional[str] = None
    accounts: List[ConnectedAccount] = []
    history: List[HistoryMessage] = []


class ExecuteRequest(BaseModel):
    strategy: HedgeStrategy
    wallet_address: Optional[str] = None
    mode: ExecuteMode = ExecuteMode.DEMO
    confirmed: bool = False
    idempotency_key: Optional[str] = None


class EnrichStrategiesRequest(BaseModel):
    strategies: List[HedgeStrategy]
    accounts: List[ConnectedAccount] = []


class ExecuteResult(BaseModel):
    success: bool
    execution_mode: Optional[str] = None
    steps: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    order_preview: Optional[dict] = None
    venue: Optional[str] = None
    order_id: Optional[str] = None
    tx_hash: Optional[str] = None
    explorer_url: Optional[str] = None
    raw_response: Optional[dict] = None
    audit_id: Optional[str] = None
    error_code: Optional[str] = None
    summary: Optional[str] = None
    error: Optional[str] = None
