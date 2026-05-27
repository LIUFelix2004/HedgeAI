"""
Options market discovery service.
Uses Derive public market data to find a live options reference for hedging.
"""
import math
from datetime import datetime, timezone
from typing import Optional

import httpx

DERIVE_API = "https://api.lyra.finance/public/get_all_instruments"
DERIVE_OPTIONS_PAGE = "https://app.derive.xyz/trade/options"


async def find_option_for_position(
    asset: str,
    direction: str,
    current_price: float,
) -> Optional[dict]:
    currency = asset.upper()
    option_type = "P" if direction == "long" else "C"
    target_strike = current_price * (0.95 if option_type == "P" else 1.05)

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            DERIVE_API,
            params={
                "expired": "false",
                "instrument_type": "option",
                "currency": currency,
                "page": 1,
                "page_size": 200,
            },
        )
        resp.raise_for_status()
        payload = resp.json()

    instruments = (payload.get("result") or {}).get("instruments") or []
    candidates = []
    for item in instruments:
        if not item.get("is_active"):
            continue
        details = item.get("option_details") or {}
        if details.get("option_type") != option_type:
            continue
        try:
            strike = float(details.get("strike"))
            expiry_ts = int(details.get("expiry"))
        except (TypeError, ValueError):
            continue

        days_to_expiry = max((expiry_ts - int(datetime.now(timezone.utc).timestamp())) / 86400, 0)
        if days_to_expiry < 1:
            continue

        candidates.append({
            "instrument_name": item.get("instrument_name"),
            "strike": strike,
            "expiry_ts": expiry_ts,
            "option_type": option_type,
            "days_to_expiry": round(days_to_expiry, 1),
            "api_url": (
                "https://api.lyra.finance/public/get_all_instruments"
                f"?expired=false&instrument_type=option&currency={currency}"
            ),
        })

    if not candidates:
        return None

    def score(item):
        strike_gap = abs(item["strike"] - target_strike) / max(current_price, 1)
        expiry_penalty = abs(item["days_to_expiry"] - 14) / 30
        return strike_gap + expiry_penalty

    best = min(candidates, key=score)
    expiry_text = datetime.fromtimestamp(best["expiry_ts"], tz=timezone.utc).strftime("%Y-%m-%d")
    return {
        **best,
        "options_page_url": DERIVE_OPTIONS_PAGE,
        "reference_summary": (
            f"实时参考期权：{best['instrument_name']}，到期日 {expiry_text}，"
            f"行权价 {best['strike']:.0f}，距离到期约 {best['days_to_expiry']} 天。"
        ),
        "display_label": f"{currency} {expiry_text} {best['strike']:.0f} {option_type}",
    }
