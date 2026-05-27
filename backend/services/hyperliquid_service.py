"""
Hyperliquid API service.
Uses official read API and the official Python SDK for trading.
"""
import asyncio
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

HYPERLIQUID_NETWORK = os.getenv("HYPERLIQUID_NETWORK", "mainnet").strip().lower()
HYPERLIQUID_API_BASE = (
    "https://api.hyperliquid-testnet.xyz"
    if HYPERLIQUID_NETWORK == "testnet"
    else "https://api.hyperliquid.xyz"
)
HL_INFO_API = f"{HYPERLIQUID_API_BASE}/info"


async def verify_credentials(address: str, private_key: str = "") -> dict:
    """
    Hyperliquid read access uses the public account address.
    Trading requires an API wallet private key or wallet private key.
    """
    wallet_address = (address or "").strip()
    if not wallet_address:
        raise ValueError("Hyperliquid address is required")

    positions = await get_positions(wallet_address)
    trading_enabled = False
    if private_key:
        _load_local_account(private_key)
        trading_enabled = True

    return {
        "connected": True,
        "address": wallet_address,
        "positions": positions,
        "trading_enabled": trading_enabled,
    }


async def get_positions(wallet_address: str) -> list:
    """Fetch open perpetual positions from Hyperliquid."""
    if not wallet_address:
        return []

    state = await _post_info({"type": "clearinghouseState", "user": wallet_address})
    mids = await _post_info({"type": "allMids"})

    positions = []
    for ap in state.get("assetPositions", []):
        p = ap.get("position", {})
        szi = float(p.get("szi", 0))
        if szi == 0:
            continue

        coin = p.get("coin", "")
        entry = float(p.get("entryPx", 0) or 0)
        liq = float(p.get("liquidationPx") or 0)
        leverage = float(p.get("leverage", {}).get("value", 1) or 1)
        margin = float(p.get("marginUsed", 0) or 0)
        mark = float(mids.get(coin, 0) or 0)

        pnl_pct = 0.0
        if entry and mark:
            pnl_pct = ((mark - entry) / entry) * (1 if szi > 0 else -1) * leverage * 100

        positions.append({
            "platform": "hyperliquid",
            "symbol": f"{coin}/USDT",
            "direction": "long" if szi > 0 else "short",
            "size": round(abs(szi) * mark, 4) if mark else 0,
            "leverage": leverage,
            "entry_price": entry,
            "current_price": mark,
            "unrealized_pnl_pct": round(pnl_pct, 2),
            "margin_used": margin,
            "liquidation_price": liq,
            "liquidation_distance_pct": round(abs(mark - liq) / mark * 100, 2) if mark and liq else 99,
        })

    return positions


async def execute_order(
    asset: str,
    direction: str,
    quantity: float,
    account_address: str,
    private_key: str,
    leverage: Optional[int] = None,
) -> dict:
    """Place a market-style order on Hyperliquid using the official SDK."""
    if not account_address:
        raise ValueError("Hyperliquid account address is required for trading")
    if not private_key:
        raise ValueError("Hyperliquid private key is required for real execution")

    return await asyncio.to_thread(
        _execute_order_sync,
        asset.upper(),
        direction,
        float(quantity),
        account_address,
        private_key,
        leverage,
    )


def _execute_order_sync(
    asset: str,
    direction: str,
    quantity: float,
    account_address: str,
    private_key: str,
    leverage: Optional[int],
) -> dict:
    from hyperliquid.exchange import Exchange
    from hyperliquid.info import Info

    wallet = _load_local_account(private_key)
    info = Info(base_url=HYPERLIQUID_API_BASE, skip_ws=True)
    exchange = Exchange(wallet, base_url=HYPERLIQUID_API_BASE, account_address=account_address)

    if leverage:
        exchange.update_leverage(max(int(leverage), 1), asset, is_cross=True)

    resp = exchange.market_open(asset, is_buy=(direction == "buy"), sz=quantity)
    order_id = _extract_hyperliquid_order_id(resp)
    success = resp.get("status") == "ok"

    return {
        "success": success,
        "order_id": order_id,
        "raw_response": resp,
        "venue": "hyperliquid",
    }


async def _post_info(payload: dict) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(HL_INFO_API, json=payload)
        resp.raise_for_status()
        return resp.json()


def _load_local_account(private_key: str):
    from eth_account import Account

    try:
        return Account.from_key(private_key)
    except Exception as exc:
        raise ValueError("Invalid Hyperliquid private key format") from exc


def _extract_hyperliquid_order_id(resp: dict) -> Optional[str]:
    try:
        statuses = resp.get("response", {}).get("data", {}).get("statuses", [])
        if not statuses:
            return None
        status = statuses[0]
        if "resting" in status:
            return str(status["resting"].get("oid"))
        if "filled" in status:
            return str(status["filled"].get("oid"))
        if "error" in status:
            return None
    except Exception:
        return None
    return None
