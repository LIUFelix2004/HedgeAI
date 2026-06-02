from fastapi import APIRouter

from fastapi import HTTPException

from routers.accounts import _get_active_session, _refresh_positions_for_session, _sessions

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

    for platform in list(_sessions.keys()):
        try:
            session = _get_active_session(platform)
        except HTTPException:
            continue
        if not session.get("connected"):
            continue
        try:
            positions = await _refresh_positions_for_session(platform, session)

            for p in positions:
                dist = p.get("liquidation_distance_pct", 100)
                pnl = p.get("unrealized_pnl_pct", 0)

                if dist < RISK_THRESHOLDS["immediate"]:
                    alerts.append({
                        "id": f"{platform}-{p.get('symbol')}-{dist}",
                        "platform": platform,
                        "symbol": p.get("symbol"),
                        "severity": "IMMEDIATE",
                        "liquidation_distance_pct": dist,
                        "unrealized_pnl_pct": pnl,
                        "position": p,
                        "message": (
                            f"{p.get('symbol')} {p.get('direction')} {p.get('leverage')}x | "
                            f"浮动盈亏 {pnl}% | 距强平仅 {dist}%"
                        ),
                    })
                elif dist < RISK_THRESHOLDS["monitor"]:
                    alerts.append({
                        "id": f"{platform}-{p.get('symbol')}-{dist}",
                        "platform": platform,
                        "symbol": p.get("symbol"),
                        "severity": "MONITOR",
                        "liquidation_distance_pct": dist,
                        "unrealized_pnl_pct": pnl,
                        "position": p,
                        "message": f"{p.get('symbol')} 浮动盈亏 {pnl}%，距强平 {dist}%，建议尽快复核仓位。",
                    })

        except Exception:
            pass

    return {"alerts": alerts, "count": len(alerts)}
