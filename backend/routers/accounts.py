import time

from fastapi import APIRouter, HTTPException

from models.schemas import AccountCreds, AccountStatus
from services import hyperliquid_service, injective_service, polymarket_service, sqlite_service

router = APIRouter(prefix="/accounts", tags=["accounts"])


class SessionStore(dict):
    def clear(self):
        super().clear()
        sqlite_service.clear_sessions()

    def pop(self, key, default=None):
        result = super().pop(key, default)
        sqlite_service.delete_session(key)
        return result


_sessions: dict = SessionStore(sqlite_service.load_sessions())
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
        _persist_sessions()
        raise HTTPException(status_code=401, detail="Account session expired")
    session["last_seen_at"] = _now()
    _persist_sessions()
    return session


def _sanitize_session_for_storage(session):
    return {
        "connected": session.get("connected"),
        "platform": session.get("platform"),
        "address": session.get("address"),
        "positions": session.get("positions", []),
        "trading_enabled": False,
        "mode": session.get("mode"),
        "connected_at": session.get("connected_at"),
        "last_seen_at": session.get("last_seen_at"),
        "expires_at": session.get("expires_at"),
        "support_status": session.get("support_status"),
        "read_status": session.get("read_status"),
        "refresh_enabled": session.get("refresh_enabled", False),
        "restored_without_credentials": True,
    }


def _persist_sessions():
    for platform, session in _sessions.items():
        if session.get("expires_at") and session["expires_at"] < _now():
            continue
        sqlite_service.upsert_session(
            platform,
            _sanitize_session_for_storage(session),
            expires_at=session.get("expires_at"),
        )


async def _refresh_positions_for_session(platform: str, session: dict):
    existing_positions = session.get("positions", [])
    if not session.get("refresh_enabled"):
        return existing_positions
    creds = session.get("creds", {})
    summary = session.get("account_summary")
    if platform == "hyperliquid":
        address = session.get("address") or creds.get("address") or creds.get("apiKey", "")
        if not address:
            return existing_positions
        positions = await hyperliquid_service.get_positions(address)
        try:
            summary = await hyperliquid_service.get_account_overview(address)
        except Exception:
            summary = session.get("account_summary")
    elif platform == "injective":
        address = session.get("address") or creds.get("address", "")
        if not address:
            return existing_positions
        positions = await injective_service.get_positions(address)
        try:
            summary = await injective_service.get_account_overview(address)
        except Exception:
            summary = session.get("account_summary")
    else:
        positions = existing_positions

    # Preserve the last known snapshot if a refresh unexpectedly returns empty.
    if not positions and existing_positions:
        positions = existing_positions

    session["positions"] = positions
    if summary:
        session["account_summary"] = summary
    session["last_seen_at"] = _now()
    _persist_sessions()
    return positions


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
            overview = await injective_service.get_account_overview(address)
            is_demo = address.strip().lower() == "demo"
            result = {
                "connected": True,
                "address": address,
                "balance": overview.get("account_value"),
                "account_summary": overview,
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
                "refresh_enabled": True,
                "connected_at": _now(),
                "last_seen_at": _now(),
                "expires_at": _session_expiry(),
            }
            _persist_sessions()
        return AccountStatus(platform=platform, **{k: v for k, v in result.items() if k != "positions" and k != "creds" and k != "mode"})

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{platform}/disconnect", response_model=AccountStatus)
async def disconnect_account(platform: str):
    """Disconnect an account and drop any in-memory credentials."""
    _sessions.pop(platform, None)
    _persist_sessions()
    return AccountStatus(platform=platform, connected=False, trading_enabled=False)


@router.get("/{platform}/positions")
async def get_positions(platform: str):
    """Fetch latest positions for a connected platform."""
    session = _get_active_session(platform)

    try:
        positions = await _refresh_positions_for_session(platform, session)
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

        try:
            positions = await _refresh_positions_for_session(platform, session)
            all_positions.extend(positions)
        except Exception:
            pass

    return {"positions": all_positions, "count": len(all_positions)}
