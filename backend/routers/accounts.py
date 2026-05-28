import time

from fastapi import APIRouter, HTTPException

from models.schemas import AccountCreds, AccountStatus
from services import hyperliquid_service, injective_service, polymarket_service

router = APIRouter(prefix="/accounts", tags=["accounts"])

# In-memory session store (replace with Redis in production)
_sessions: dict = {}
SESSION_TTL_SECONDS = 60 * 60
SUPPORT_MATRIX = {
    "hyperliquid": {
        "read_status": "partial",
        "trade_status": "partial",
        "note": "Read positions and guarded execution paths are partially implemented.",
    },
    "injective": {
        "read_status": "partial",
        "trade_status": "partial",
        "note": "Demo/testnet read and guarded execution paths are partially implemented.",
    },
    "polymarket": {
        "read_status": "partial",
        "trade_status": "dry_run",
        "note": "Market discovery and dry-run previews are implemented; real orders are blocked.",
    },
    "binance": {
        "read_status": "planned",
        "trade_status": "unsupported",
        "note": "Read-only integration is planned and not yet connected.",
    },
    "okx": {
        "read_status": "planned",
        "trade_status": "unsupported",
        "note": "Read-only integration is planned and not yet connected.",
    },
    "bybit": {
        "read_status": "planned",
        "trade_status": "unsupported",
        "note": "Read-only integration is planned and not yet connected.",
    },
}


def _now():
    return time.time()


def _session_expiry():
    return _now() + SESSION_TTL_SECONDS


def _get_active_session(platform: str):
    session = _sessions.get(platform)
    if not session:
        raise HTTPException(status_code=404, detail="Account not connected")
    if session.get("expires_at") and session["expires_at"] < _now():
        _sessions.pop(platform, None)
        raise HTTPException(status_code=401, detail="Account session expired")
    session["last_seen_at"] = _now()
    return session


@router.get("/support-matrix")
async def support_matrix():
    return {"platforms": SUPPORT_MATRIX}


@router.post("/{platform}/connect", response_model=AccountStatus)
async def connect_account(platform: str, creds: AccountCreds):
    """Connect a trading account and verify credentials."""
    try:
        if platform == "hyperliquid":
            address = creds.address or creds.apiKey or ""
            private_key = creds.privateKey or creds.apiSecret or ""
            result = await hyperliquid_service.verify_credentials(address, private_key)
        elif platform == "injective":
            address = creds.address or creds.apiKey or ""
            positions = await injective_service.get_positions(address)
            is_demo = address.strip().lower() == "demo"
            result = {
                "connected": True,
                "address": address,
                "positions": positions,
                "trading_enabled": False if is_demo else bool(creds.privateKey),
                "mode": "demo" if is_demo else "real",
            }
        elif platform == "polymarket":
            result = await polymarket_service.verify_credentials(creds.apiKey or creds.privateKey or "")
        elif platform == "binance":
            result = {
                "connected": False,
                "trading_enabled": False,
                "support_status": "planned",
                "read_status": SUPPORT_MATRIX["binance"]["read_status"],
            }
        elif platform in {"okx", "bybit"}:
            result = {
                "connected": False,
                "trading_enabled": False,
                "support_status": "planned",
                "read_status": SUPPORT_MATRIX[platform]["read_status"],
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

        session_creds = creds.model_dump()
        if result.get("mode") == "demo":
            session_creds = {"address": address}
        if result.get("connected"):
            _sessions[platform] = {
                **result,
                "creds": session_creds,
                "connected_at": _now(),
                "last_seen_at": _now(),
                "expires_at": _session_expiry(),
            }
        return AccountStatus(platform=platform, **{k: v for k, v in result.items() if k != "positions" and k != "creds" and k != "mode"})

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{platform}/disconnect", response_model=AccountStatus)
async def disconnect_account(platform: str):
    """Disconnect an account and drop any in-memory credentials."""
    _sessions.pop(platform, None)
    return AccountStatus(platform=platform, connected=False, trading_enabled=False)


@router.get("/{platform}/positions")
async def get_positions(platform: str):
    """Fetch latest positions for a connected platform."""
    session = _get_active_session(platform)

    creds = session.get("creds", {})
    try:
        if platform == "hyperliquid":
            address = creds.get("address") or creds.get("apiKey", "")
            positions = await hyperliquid_service.get_positions(address)
        elif platform == "injective":
            positions = await injective_service.get_positions(
                session.get("address") or creds.get("address", "")
            )
        else:
            positions = session.get("positions", [])
        session["positions"] = positions
        return {"platform": platform, "positions": positions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/positions/all")
async def get_all_positions():
    """Aggregate positions across all connected platforms."""
    all_positions = []
    for platform in list(_sessions.keys()):
        try:
            session = _get_active_session(platform)
        except HTTPException as exc:
            if exc.status_code == 401:
                raise
            continue
        if not session.get("connected"):
            continue

        creds = session.get("creds", {})
        try:
            if platform == "hyperliquid":
                address = creds.get("address") or creds.get("apiKey", "")
                positions = await hyperliquid_service.get_positions(address)
            elif platform == "injective":
                positions = await injective_service.get_positions(
                    session.get("address") or creds.get("address", "")
                )
            else:
                positions = session.get("positions", [])

            session["positions"] = positions
            all_positions.extend(positions)
        except Exception:
            pass

    return {"positions": all_positions, "count": len(all_positions)}
