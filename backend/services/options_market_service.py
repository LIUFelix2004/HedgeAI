"""
Options market discovery service.
Uses Derive public market data plus a lightweight RL-style option scoring layer
to find a live options reference for hedging.
"""
from datetime import datetime, timezone
from typing import Optional

import httpx

from services.rl_option_pricing_service import build_option_analysis

DERIVE_API = "https://api.lyra.finance/public/get_all_instruments"
DERIVE_OPTIONS_PAGE = "https://app.derive.xyz/trade/options"


async def find_option_for_position(
    asset: str,
    direction: str,
    current_price: float,
    position_notional: float = 0.0,
) -> Optional[dict]:
    currency = asset.upper()
    option_type = "P" if direction == "long" else "C"

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

        analysis = build_option_analysis(
            asset=currency,
            option_type=option_type,
            current_price=current_price,
            strike=strike,
            days_to_expiry=days_to_expiry,
            position_notional=position_notional,
        )
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
            **analysis,
        })

    if not candidates:
        return None

    best = max(candidates, key=lambda item: item["rl_policy_score"])
    expiry_text = datetime.fromtimestamp(best["expiry_ts"], tz=timezone.utc).strftime("%Y-%m-%d")
    premium_text = f"{best['premium_estimate']:.2f} USDT"
    delta_text = f"{best['delta']:.4f}"
    return {
        **best,
        "expiry_date": expiry_text,
        "options_page_url": DERIVE_OPTIONS_PAGE,
        "reference_summary": (
            f"实时参考期权：{best['instrument_name']}，到期日 {expiry_text}，行权价 {best['strike']:.0f}。"
            f"RL 评分 {best['rl_policy_score']}/100，理论权利金约 {premium_text}，Delta {delta_text}。"
        ),
        "display_label": f"{currency} {expiry_text} {best['strike']:.0f} {option_type}",
    }
