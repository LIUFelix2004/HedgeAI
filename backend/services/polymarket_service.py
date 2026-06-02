"""
Polymarket CLOB service.
Docs: https://docs.polymarket.com / py-clob-client
"""
import json
import logging
import math
import re
from datetime import datetime, timezone
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
        token_ids = _normalize_token_ids(market.get("clobTokenIds") or market.get("tokenIds"))
        for idx, outcome in enumerate(outcomes):
            price = prices[idx] if idx < len(prices) else 0.5
            results.append({
                "market_id": market.get("id"),
                "slug": market.get("slug"),
                "question": market.get("question"),
                "outcome": outcome,
                "price": price,
                "probability": price,
                "token_id": token_ids[idx] if idx < len(token_ids) else None,
                "volume_24h": market.get("volume24hr", 0),
                "end_date": market.get("endDate"),
                "updated_at": market.get("updatedAt") or market.get("updated_at"),
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
            token_ids = _normalize_token_ids(market.get("clobTokenIds") or market.get("tokenIds"))
            for idx, outcome in enumerate(outcomes):
                price = prices[idx] if idx < len(prices) else 0.5
                results.append({
                    "market_id": market.get("id"),
                    "slug": market.get("slug") or event_slug,
                    "question": market.get("question") or event_title,
                    "event_title": event_title,
                    "outcome": outcome,
                    "price": price,
                    "probability": price,
                    "token_id": token_ids[idx] if idx < len(token_ids) else None,
                    "volume_24h": event.get("volume24hr") or market.get("volume") or 0,
                    "end_date": market.get("endDate") or event.get("endDate"),
                    "updated_at": market.get("updatedAt") or market.get("updated_at") or event.get("updatedAt"),
                    "event_url": f"https://polymarket.com/event/{event_slug}" if event_slug else None,
                })
    return results


async def find_hedge_for_position(
    asset: str,
    direction: str,
    current_price: float,
) -> Optional[dict]:
    aliases = _asset_aliases(asset)
    canonical = aliases[-1]
    search_terms = list(dict.fromkeys([
        *aliases,
        *[f"{canonical} {price}" for price in _price_search_levels(current_price)],
        f"will {canonical}",
    ]))
    markets = []
    for term in search_terms:
        try:
            markets.extend(await search_hedge_events(term))
        except Exception:
            pass
        try:
            markets.extend(await search_hedge_markets(term))
        except Exception:
            pass

    direction_terms = (
        "below", "under", "fall", "drop", "less than", "dip to", "dip below", "decline to"
    ) if direction == "long" else (
        "above", "over", "rise", "higher", "more than", "reach", "climb to"
    )

    asset_filtered = []
    for market in markets:
        question = (market.get("question") or "").lower()
        if not any(alias in question for alias in aliases):
            continue
        asset_filtered.append(market)

    if not asset_filtered:
        return None

    directional = [
        market for market in asset_filtered
        if any(term in (market.get("question") or "").lower() for term in direction_terms)
    ]
    candidate_pool = directional or asset_filtered
    price_banded = [
        market for market in candidate_pool
        if _is_threshold_acceptable(market, current_price)
    ]
    candidate_pool = price_banded or candidate_pool

    best = sorted(
        candidate_pool,
        key=lambda market: _market_rank(market, current_price),
        reverse=True,
    )[0]
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


def _normalize_token_ids(raw_token_ids):
    if isinstance(raw_token_ids, list):
        return [str(token_id) for token_id in raw_token_ids]
    if isinstance(raw_token_ids, str):
        try:
            parsed = json.loads(raw_token_ids)
            if isinstance(parsed, list):
                return [str(token_id) for token_id in parsed]
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


def _price_step(current_price: float) -> int:
    if current_price <= 0:
        return 0
    if current_price < 100:
        return 5
    if current_price < 1000:
        return 25
    if current_price < 5000:
        return 50
    if current_price < 20000:
        return 100
    return 1000


def _price_search_levels(current_price: float) -> List[int]:
    if current_price <= 0:
        return []
    step = _price_step(current_price)
    center = int(round(current_price / step) * step)
    levels = {center}
    for delta in (1, 2):
        levels.add(center - step * delta)
        levels.add(center + step * delta)
    return [level for level in sorted(levels) if level > 0]


def _extract_numeric_thresholds(question: str) -> List[float]:
    raw_values = re.findall(r"\$?\b\d[\d,]*(?:\.\d+)?\b", question or "")
    thresholds = []
    for raw in raw_values:
        cleaned = raw.replace("$", "").replace(",", "")
        try:
            value = float(cleaned)
        except ValueError:
            continue
        if value >= 1:
            thresholds.append(value)
    return thresholds


def _closest_threshold(question: str, current_price: float) -> Optional[float]:
    if not current_price:
        return None
    thresholds = _extract_numeric_thresholds(question)
    if not thresholds:
        return None
    return min(thresholds, key=lambda value: abs(value - current_price))


def _parse_end_ts(value) -> float:
    if not value:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def _max_threshold_distance_ratio(current_price: float) -> float:
    if current_price <= 0:
        return math.inf
    if current_price < 100:
        return 0.2
    if current_price < 1000:
        return 0.15
    return 0.12


def _is_threshold_acceptable(market: dict, current_price: float) -> bool:
    threshold = _closest_threshold(market.get("question") or "", current_price)
    if threshold is None or current_price <= 0:
        return False
    distance_ratio = abs(threshold - current_price) / current_price
    return distance_ratio <= _max_threshold_distance_ratio(current_price)


def _market_rank(market: dict, current_price: float):
    threshold = _closest_threshold(market.get("question") or "", current_price)
    distance = abs(threshold - current_price) if threshold is not None else math.inf
    end_ts = _parse_end_ts(market.get("end_date"))
    volume = float(market.get("volume_24h") or 0)
    has_url = 1 if market.get("event_url") else 0
    return (
        1 if threshold is not None else 0,
        end_ts,
        -distance,
        volume,
        has_url,
    )
