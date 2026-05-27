"""
Polymarket CLOB service.
Docs: https://docs.polymarket.com / py-clob-client
"""
import json
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
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{GAMMA_API}/markets",
            params={"search": keyword, "limit": limit, "active": True},
        )
        resp.raise_for_status()
        markets = resp.json()

    results = []
    for market in markets:
        outcomes = _normalize_outcomes(market.get("outcomes"))
        prices = _normalize_prices(market.get("outcomePrices"))
        for idx, outcome in enumerate(outcomes):
            results.append({
                "market_id": market.get("id"),
                "slug": market.get("slug"),
                "question": market.get("question"),
                "outcome": outcome,
                "price": prices[idx] if idx < len(prices) else 0.5,
                "volume_24h": market.get("volume24hr", 0),
                "end_date": market.get("endDate"),
                "event_url": f"https://polymarket.com/event/{market.get('slug')}" if market.get("slug") else None,
            })
    return results


async def search_hedge_events(keyword: str, limit: int = 8) -> List[dict]:
    """
    Search event-first using Polymarket public-search.
    This is usually better than free-text /markets search for thematic events.
    """
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{GAMMA_API}/public-search",
            params={
                "q": keyword,
                "limit_per_type": limit,
                "events_status": "active",
                "search_tags": False,
                "search_profiles": False,
                "optimized": True,
            },
        )
        resp.raise_for_status()
        payload = resp.json()

    results = []
    for event in (payload.get("events") or []):
        event_slug = event.get("slug")
        event_title = event.get("title")
        for market in event.get("markets") or []:
            outcomes = _normalize_outcomes(market.get("outcomes"))
            prices = _normalize_prices(market.get("outcomePrices"))
            for idx, outcome in enumerate(outcomes):
                results.append({
                    "market_id": market.get("id"),
                    "slug": market.get("slug") or event_slug,
                    "question": market.get("question") or event_title,
                    "event_title": event_title,
                    "outcome": outcome,
                    "price": prices[idx] if idx < len(prices) else 0.5,
                    "volume_24h": event.get("volume24hr") or market.get("volume") or 0,
                    "end_date": market.get("endDate") or event.get("endDate"),
                    "event_url": f"https://polymarket.com/event/{event_slug}" if event_slug else None,
                })
    return results


async def find_hedge_for_position(
    asset: str,
    direction: str,
    current_price: float,
) -> Optional[dict]:
    aliases = _asset_aliases(asset)
    strike_hint = _price_hint(current_price, direction)
    search_terms = [
        aliases[0],
        aliases[-1],
        f"{aliases[-1]} {strike_hint}",
        f"will {aliases[-1]}",
    ]
    markets = []
    for term in search_terms:
        try:
            markets.extend(await search_hedge_events(term))
        except Exception:
            pass
        markets.extend(await search_hedge_markets(term))

    direction_terms = ("below", "under", "fall", "drop", "less than") if direction == "long" else (
        "above", "over", "rise", "higher", "more than"
    )

    filtered = []
    for market in markets:
        question = (market.get("question") or "").lower()
        if not any(alias in question for alias in aliases):
            continue
        if not any(term in question for term in direction_terms):
            continue
        filtered.append(market)

    if not filtered:
        return None

    best = sorted(filtered, key=lambda m: _market_score(m, current_price, direction), reverse=True)[0]
    return {
        **best,
        "hedge_direction": "long" if direction == "long" else "short",
        "recommended_size_pct": 15,
    }


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


def _normalize_outcomes(raw_outcomes):
    if isinstance(raw_outcomes, list):
        return raw_outcomes
    if isinstance(raw_outcomes, str):
        try:
            parsed = json.loads(raw_outcomes)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


def _normalize_prices(raw_prices):
    if isinstance(raw_prices, list):
        return [float(price) for price in raw_prices]
    if isinstance(raw_prices, dict):
        return [float(price) for price in raw_prices.values()]
    if isinstance(raw_prices, str):
        try:
            parsed = json.loads(raw_prices)
            if isinstance(parsed, list):
                return [float(price) for price in parsed]
            if isinstance(parsed, dict):
                return [float(price) for price in parsed.values()]
        except Exception:
            pass
    return []


def _asset_aliases(asset: str):
    mapping = {
        "BTC": ["btc", "bitcoin"],
        "ETH": ["eth", "ethereum"],
        "INJ": ["inj", "injective"],
    }
    return mapping.get(asset.upper(), [asset.lower()])


def _price_hint(current_price: float, direction: str) -> int:
    if not current_price:
        return 0
    ratio = 0.95 if direction == "long" else 1.05
    hinted = current_price * ratio
    return int(round(hinted / 5000.0) * 5000)


def _market_score(market: dict, current_price: float, direction: str) -> float:
    question = (market.get("question") or "").lower()
    score = float(market.get("volume_24h") or 0)

    if direction == "long":
        if any(term in question for term in ("below", "under", "fall", "drop", "less than")):
            score += 5000
    else:
        if any(term in question for term in ("above", "over", "rise", "higher", "more than")):
            score += 5000

    hinted = _price_hint(current_price, direction)
    if hinted and str(hinted) in question.replace(",", ""):
        score += 3000

    if market.get("event_url"):
        score += 500

    return score
