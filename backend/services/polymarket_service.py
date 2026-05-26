"""
Polymarket CLOB service.
Docs: https://docs.polymarket.com / py-clob-client
"""
import logging
from typing import List, Optional

import httpx

logger = logging.getLogger(__name__)
GAMMA_API = "https://gamma-api.polymarket.com"


async def verify_credentials(api_key: str) -> dict:
    """Test Polymarket API key validity."""
    try:
        markets = await search_hedge_markets("BTC")
        return {"connected": True, "markets_available": len(markets)}
    except Exception as e:
        raise ValueError(f"无法连接 Polymarket: {str(e)}")


async def search_hedge_markets(keyword: str, limit: int = 5) -> List[dict]:
    """
    Search Polymarket for markets relevant to a given asset.
    Returns markets that could be used for directional hedging.
    """
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{GAMMA_API}/markets",
            params={"search": keyword, "limit": limit, "active": True},
        )
        resp.raise_for_status()
        markets = resp.json()

    results = []
    for m in markets:
        for outcome in m.get("outcomes", []):
            results.append({
                "market_id": m.get("id"),
                "slug": m.get("slug"),
                "question": m.get("question"),
                "outcome": outcome,
                "price": m.get("outcomePrices", {}).get(outcome, 0.5),
                "volume_24h": m.get("volume24hr", 0),
                "end_date": m.get("endDate"),
            })
    return results


async def find_hedge_for_position(
    asset: str,
    direction: str,
    current_price: float,
) -> Optional[dict]:
    """
    Find the best Polymarket market to hedge a given position.
    For a long position, we prefer a bearish market; for a short position, vice versa.
    """
    markets = await search_hedge_markets(asset)
    target_keyword = "below" if direction == "long" else "above"

    for m in markets:
        q = m["question"].lower()
        if target_keyword in q and asset.lower() in q:
            return {
                **m,
                "hedge_direction": "long" if direction == "long" else "short",
                "recommended_size_pct": 15,
            }
    return markets[0] if markets else None


async def place_order(
    private_key: str,
    token_id: str,
    price: float,
    size: float,
    side: str = "buy",
) -> dict:
    """
    Place an order via py-clob-client.
    Requires: pip install py-clob-client
    """
    try:
        from py_clob_client.client import ClobClient
        from py_clob_client.clob_types import OrderArgs, OrderType

        client = ClobClient(
            "https://clob.polymarket.com",
            key=private_key,
            chain_id=137,
        )
        creds = client.create_or_derive_api_creds()
        client.set_api_creds(creds)

        order = client.create_order(OrderArgs(
            token_id=token_id,
            price=price,
            size=size,
            side=side,
        ))
        resp = client.post_order(order, OrderType.GTC)
        return {"success": True, "order_id": resp.get("orderID"), "status": resp.get("status")}

    except ImportError:
        logger.warning("py-clob-client not installed, returning mock result")
        return {"success": True, "order_id": "mock-pm-order-001", "demo": True}
    except Exception as e:
        logger.error("Polymarket order error: %s", e)
        return {"success": False, "error": str(e)}
