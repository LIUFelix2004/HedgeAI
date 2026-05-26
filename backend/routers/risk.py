from fastapi import APIRouter

from routers.accounts import _sessions
from services import hyperliquid_service, injective_service

router = APIRouter(prefix="/risk", tags=["risk"])

RISK_THRESHOLDS = {
    "immediate": 5,
    "monitor": 15,
}


@router.get("/scan")
async def scan_risk():
    """
    Scan all connected accounts for high-risk positions.
    Returns alerts for positions near liquidation.
    """
    alerts = []

    for platform, session in _sessions.items():
        if not session.get("connected"):
            continue
        creds = session.get("creds", {})

        try:
            if platform == "hyperliquid":
                positions = await hyperliquid_service.get_positions(creds.get("apiKey", ""))
            elif platform == "injective":
                positions = await injective_service.get_positions(
                    session.get("address") or creds.get("address", "")
                )
            else:
                positions = session.get("positions", [])

            session["positions"] = positions

            for p in positions:
                dist = p.get("liquidation_distance_pct", 100)
                pnl = p.get("unrealized_pnl_pct", 0)

                if dist < RISK_THRESHOLDS["immediate"]:
                    alerts.append({
                        "id": f"{platform}-{p.get('symbol')}-{dist}",
                        "platform": platform,
                        "symbol": p.get("symbol"),
                        "severity": "IMMEDIATE",
                        "message": (
                            f"{p.get('symbol')} {p.get('direction')} {p.get('leverage')}x | "
                            f"浮盈亏 {pnl}% | 距强平仅 {dist}%"
                        ),
                    })
                elif dist < RISK_THRESHOLDS["monitor"]:
                    alerts.append({
                        "id": f"{platform}-{p.get('symbol')}-{dist}",
                        "platform": platform,
                        "symbol": p.get("symbol"),
                        "severity": "MONITOR",
                        "message": f"{p.get('symbol')} 浮盈亏 {pnl}%，距强平 {dist}%，建议尽快复核仓位。",
                    })

        except Exception:
            pass

    return {"alerts": alerts, "count": len(alerts)}
