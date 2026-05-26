"""
Hyperliquid API service.
Docs: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
"""
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)
HL_API = "https://api.hyperliquid.xyz/info"


async def verify_credentials(api_key: str, api_secret: str) -> dict:
    """
    Hyperliquid uses wallet address (not API key) for read access.
    api_key here is treated as the wallet address.
    """
    address = api_key.strip()
    try:
        positions = await get_positions(address)
        return {
            "connected": True,
            "address": address,
            "positions": positions,
        }
    except Exception as e:
        logger.error(f"HL verify error: {e}")
        raise ValueError(f"无法连接 Hyperliquid: {str(e)}")


async def get_positions(wallet_address: str) -> list:
    """Fetch open perpetual positions from Hyperliquid."""
    payload = {
        "type": "clearinghouseState",
        "user": wallet_address,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(HL_API, json=payload)
        resp.raise_for_status()
        data = resp.json()

    positions = []
    asset_positions = data.get("assetPositions", [])
    meta = await _get_meta()

    for ap in asset_positions:
        p = ap.get("position", {})
        szi = float(p.get("szi", 0))
        if szi == 0:
            continue

        coin      = p.get("coin", "")
        entry     = float(p.get("entryPx", 0))
        unrealized = float(p.get("unrealizedPnl", 0))
        liq       = float(p.get("liquidationPx") or 0)
        leverage  = float(p.get("leverage", {}).get("value", 1))
        margin    = float(p.get("marginUsed", 0))

        # get current mark price
        mark = await _get_mark_price(coin)
        pnl_pct = ((mark - entry) / entry) * (1 if szi > 0 else -1) * leverage * 100

        positions.append({
            "platform": "hyperliquid",
            "symbol": f"{coin}/USDT",
            "direction": "long" if szi > 0 else "short",
            "size": abs(szi) * mark,
            "leverage": leverage,
            "entry_price": entry,
            "current_price": mark,
            "unrealized_pnl_pct": round(pnl_pct, 2),
            "margin_used": margin,
            "liquidation_price": liq,
            "liquidation_distance_pct": round(abs(mark - liq) / mark * 100, 2) if liq else 99,
        })

    return positions


async def _get_mark_price(coin: str) -> float:
    payload = {"type": "allMids"}
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.post(HL_API, json=payload)
        resp.raise_for_status()
        data = resp.json()
    return float(data.get(coin, 0))


async def _get_meta() -> dict:
    payload = {"type": "meta"}
    async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.post(HL_API, json=payload)
        resp.raise_for_status()
        return resp.json()
