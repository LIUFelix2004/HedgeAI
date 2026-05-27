from fastapi import APIRouter, HTTPException

from models.schemas import AccountCreds, AccountStatus
from services import hyperliquid_service, injective_service, polymarket_service

router = APIRouter(prefix="/accounts", tags=["accounts"])

# In-memory session store (replace with Redis in production)
_sessions: dict = {}


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
            result = {
                "connected": True,
                "address": address,
                "positions": positions,
                "trading_enabled": bool(creds.privateKey),
            }
        elif platform == "polymarket":
            result = await polymarket_service.verify_credentials(creds.apiKey or creds.privateKey or "")
        elif platform == "binance":
            result = {"connected": True, "trading_enabled": False}
        else:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

        _sessions[platform] = {**result, "creds": creds.model_dump()}
        return AccountStatus(platform=platform, **{k: v for k, v in result.items() if k != "positions" and k != "creds"})

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{platform}/positions")
async def get_positions(platform: str):
    """Fetch latest positions for a connected platform."""
    session = _sessions.get(platform)
    if not session:
        raise HTTPException(status_code=404, detail="Account not connected")

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
    for platform, session in _sessions.items():
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
