import re

from fastapi import APIRouter, HTTPException

from models.schemas import ExecuteRequest, ExecuteResult
from routers.accounts import _sessions
from services import injective_service, polymarket_service

router = APIRouter(prefix="/hedge", tags=["hedge"])

INJECTIVE_MARKETS = {
    "BTC": "0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9",
    "ETH": "0x70bc8d7feab38b23d5fdfb12b9c3726e400c265edbcbf449b6c80c31d63d3a02",
    "INJ": "0x17ef48032cb24375ba7c2e39f384e56433bcab20cbee9a7357e4cba2eb00abe6",
}


@router.post("/execute", response_model=ExecuteResult)
async def execute_hedge(req: ExecuteRequest):
    """
    Execute a hedge strategy on the appropriate platform.
    - REVERSE_HEDGE / OPTIONS -> Injective
    - POLYMARKET              -> Polymarket
    """
    strategy = req.strategy

    try:
        if strategy.type in ("REVERSE_HEDGE", "OPTIONS"):
            return await _execute_injective(strategy, req.wallet_address)

        if strategy.type == "POLYMARKET":
            return await _execute_polymarket(strategy)

        raise HTTPException(status_code=400, detail=f"Unknown strategy type: {strategy.type}")

    except Exception as e:
        return ExecuteResult(success=False, error=str(e))


async def _execute_injective(strategy, wallet_address):
    asset = _extract_asset(strategy.title, strategy.description)
    source_position = _find_source_position(asset)
    market_id = INJECTIVE_MARKETS.get(asset, INJECTIVE_MARKETS["BTC"])

    direction = "sell"
    quantity = 0.01
    summary = f"未找到匹配仓位，使用默认参数执行 {asset} 对冲。"

    if source_position:
        direction = "sell" if source_position.get("direction") == "long" else "buy"
        hedge_ratio = _parse_ratio(strategy.hedge_ratio, default=1.0 if strategy.type == "OPTIONS" else 0.4)
        current_price = max(float(source_position.get("current_price") or 0), 1.0)
        position_notional = max(float(source_position.get("size") or 0), current_price * 0.01)
        hedge_notional = max(position_notional * hedge_ratio, current_price * 0.001)
        quantity = round(hedge_notional / current_price, 6)
        summary = (
            f"按 {asset} 原仓位约 {position_notional:.0f} USDT、对冲比例 {hedge_ratio * 100:.0f}% "
            f"推导执行 {direction} {quantity:.4f}。"
        )

    result = await injective_service.execute_order(
        market_id=market_id,
        direction=direction,
        quantity=quantity,
        price=0,
    )

    return ExecuteResult(
        success=result.get("success", False),
        tx_hash=result.get("tx_hash"),
        explorer_url=result.get("explorer_url"),
        summary=summary,
        error=result.get("error"),
    )


async def _execute_polymarket(strategy):
    asset = _extract_asset(strategy.title, strategy.description)
    source_position = _find_source_position(asset)
    hedge_ratio = _parse_ratio(strategy.hedge_ratio, default=0.15)
    position_notional = float(source_position.get("size") or 0) if source_position else 1000.0
    order_size = round(max(position_notional * hedge_ratio, 50), 2)

    result = await polymarket_service.place_order(
        private_key="",
        token_id="demo-token",
        price=0.45,
        size=order_size,
    )
    return ExecuteResult(
        success=result.get("success", False),
        tx_hash=result.get("order_id"),
        summary=f"按 {asset} 仓位的 {hedge_ratio * 100:.0f}% 估算，事件市场名义下单约 {order_size} USDT。",
        error=result.get("error"),
    )


def _extract_asset(*texts):
    combined = " ".join([t for t in texts if t])
    for asset in ("BTC", "ETH", "INJ"):
        if asset in combined.upper():
            return asset
    return "BTC"


def _parse_ratio(raw_ratio, default=0.4):
    if not raw_ratio:
        return default
    match = re.search(r"(\d+(?:\.\d+)?)\s*%", str(raw_ratio))
    if not match:
        return default
    return max(min(float(match.group(1)) / 100, 1.0), 0.01)


def _find_source_position(asset):
    for session in _sessions.values():
        if not session.get("connected"):
            continue
        for position in session.get("positions", []) or []:
            symbol = str(position.get("symbol", "")).upper()
            if asset in symbol:
                return position
    return None
