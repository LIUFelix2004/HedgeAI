from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any


# ── Account ──
class AccountCreds(BaseModel):
    apiKey: Optional[str] = None
    apiSecret: Optional[str] = None
    address: Optional[str] = None   # Injective wallet


class AccountStatus(BaseModel):
    connected: bool
    platform: str
    address: Optional[str] = None
    balance: Optional[float] = None


# ── Position ──
class Position(BaseModel):
    platform: str
    symbol: str
    direction: str          # long | short
    size: float             # USDT notional
    leverage: float
    entry_price: float
    current_price: float
    unrealized_pnl_pct: float
    margin_used: float
    liquidation_price: float
    liquidation_distance_pct: float


# ── Hedge Strategy ──
class HedgeStrategy(BaseModel):
    id: str                        # A | B | C
    type: str                      # REVERSE_HEDGE | POLYMARKET | OPTIONS
    title: str
    description: str
    hedge_ratio: str
    estimated_cost: str
    complexity: str
    pros: str
    cons: str
    injective_action: str


class AnalysisResult(BaseModel):
    risk_level: str                # HIGH | MEDIUM | LOW
    risk_summary: str
    liquidation_distance_pct: float
    urgency: str                   # IMMEDIATE | MONITOR | SAFE
    strategies: List[HedgeStrategy]


# ── Chat ──
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


# ── Execute ──
class ExecuteRequest(BaseModel):
    strategy: HedgeStrategy
    wallet_address: Optional[str] = None


class ExecuteResult(BaseModel):
    success: bool
    tx_hash: Optional[str] = None
    explorer_url: Optional[str] = None
    summary: Optional[str] = None
    error: Optional[str] = None
