import os
import re

from fastapi import APIRouter, HTTPException

from models.schemas import (
    EnrichStrategiesRequest,
    ExecuteMode,
    ExecuteRequest,
    ExecuteResult,
    StrategyMarketLink,
)
from routers.accounts import _sessions
from services import hyperliquid_service, injective_service, options_market_service, polymarket_service

router = APIRouter(prefix="/hedge", tags=["hedge"])

INJECTIVE_MARKETS = {
    "BTC": "0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9",
    "ETH": "0x70bc8d7feab38b23d5fdfb12b9c3726e400c265edbcbf449b6c80c31d63d3a02",
    "INJ": "0x17ef48032cb24375ba7c2e39f384e56433bcab20cbee9a7357e4cba2eb00abe6",
}

SOURCE_POSITION_NOT_FOUND = "未找到 {asset} 的已连接来源仓位。"
DEMO_POSITION_BLOCKED = "Demo 仓位只能用于演示或 dry-run，不能触发真实交易执行。"
REAL_CONFIRMATION_REQUIRED = "Real execution requires explicit confirmation."
POLYMARKET_REAL_DISABLED = "Polymarket 实盘执行尚未启用，请先使用 dry-run 订单预览。"
OPTIONS_REAL_DISABLED = "Options 实盘执行尚未启用，请先使用 dry-run 执行清单。"


@router.post("/execute", response_model=ExecuteResult)
async def execute_hedge(req: ExecuteRequest):
    strategy = req.strategy

    try:
        if req.mode == ExecuteMode.REAL and not req.confirmed:
            raise ValueError(REAL_CONFIRMATION_REQUIRED)
        if req.mode in {ExecuteMode.DEMO, ExecuteMode.DRY_RUN}:
            return await _preview_execution(strategy, req.mode)

        if strategy.type == "REVERSE_HEDGE":
            return await _execute_reverse_hedge(strategy)
        if strategy.type == "OPTIONS":
            raise ValueError(OPTIONS_REAL_DISABLED)
        if strategy.type == "POLYMARKET":
            raise ValueError(POLYMARKET_REAL_DISABLED)

        raise HTTPException(status_code=400, detail=f"Unknown strategy type: {strategy.type}")
    except Exception as e:
        return ExecuteResult(success=False, execution_mode="blocked", error=str(e))


@router.post("/enrich-strategies")
async def enrich_strategies(req: EnrichStrategiesRequest):
    source_position = _find_source_position_from_accounts(req.accounts) or _find_source_position_from_sessions()
    enriched = []

    for strategy in req.strategies:
        enriched.append(await _enrich_single_strategy(strategy, source_position))

    return {"strategies": enriched}


async def _execute_reverse_hedge(strategy):
    asset = _extract_asset(strategy.title, strategy.description)
    source_position = _find_source_position(asset)
    if not source_position:
        raise ValueError(SOURCE_POSITION_NOT_FOUND.format(asset=asset))
    if _is_demo_position(source_position):
        raise ValueError(DEMO_POSITION_BLOCKED)

    direction, quantity, hedge_ratio, position_notional, _current_price = _derive_execution_params(strategy, source_position)
    source_platform = source_position.get("platform")

    if source_platform == "hyperliquid":
        injective_pk = _get_injective_private_key()
        if not injective_pk:
            raise ValueError("Hyperliquid 仓位要做真实反向对冲，请先连接带私钥的 Injective 账户。")

        market_id = INJECTIVE_MARKETS.get(asset, INJECTIVE_MARKETS["BTC"])
        result = await injective_service.execute_order(
            market_id=market_id,
            direction=direction,
            quantity=quantity,
            price=0,
            private_key=injective_pk,
            allow_demo=False,
        )
        return ExecuteResult(
            success=result.get("success", False),
            execution_mode="real",
            venue="injective",
            tx_hash=result.get("tx_hash"),
            explorer_url=result.get("explorer_url"),
            summary=(
                f"基于 Hyperliquid 原仓位约 {position_notional:.0f} USDT，按 {hedge_ratio * 100:.0f}% "
                f"在 Injective 执行 {direction} {quantity:.4f} {asset} 反向对冲。"
            ),
            error=result.get("error"),
        )

    if source_platform == "injective":
        account_address, private_key = _get_hyperliquid_trade_creds()
        if not private_key:
            raise ValueError("Injective 仓位要做真实反向对冲，请先连接带私钥的 Hyperliquid 账户。")

        result = await hyperliquid_service.execute_order(
            asset=asset,
            direction=direction,
            quantity=quantity,
            account_address=account_address,
            private_key=private_key,
            leverage=max(int(source_position.get("leverage") or 1), 1),
        )
        return ExecuteResult(
            success=result.get("success", False),
            execution_mode="real",
            venue="hyperliquid",
            order_id=result.get("order_id"),
            summary=(
                f"基于 Injective 原仓位约 {position_notional:.0f} USDT，按 {hedge_ratio * 100:.0f}% "
                f"在 Hyperliquid 执行 {direction} {quantity:.4f} {asset} 反向对冲。"
            ),
            error=result.get("error"),
        )

    raise ValueError(f"暂不支持从 {source_platform} 来源仓位做反向对冲。")


async def _preview_execution(strategy, mode):
    asset = _extract_asset(strategy.title, strategy.description)
    source_position = _find_source_position(asset)
    direction, quantity, hedge_ratio, position_notional, _current_price = _derive_execution_params(
        strategy,
        source_position or {"direction": "long", "size": 1000, "current_price": 1},
    )
    mode_value = mode.value if isinstance(mode, ExecuteMode) else str(mode)
    label = "Demo 模拟执行" if mode_value == ExecuteMode.DEMO.value else "Dry-run preview 订单预览"
    steps = [
        "校验执行模式",
        "读取来源仓位",
        "生成模拟订单" if mode_value == ExecuteMode.DEMO.value else "生成订单预览",
        "返回演示结果" if mode_value == ExecuteMode.DEMO.value else "返回预览结果",
    ]
    return ExecuteResult(
        success=True,
        execution_mode=mode_value,
        venue=strategy.execution_venue or "preview",
        summary=(
            f"{label}：{asset} {direction} {quantity:.4f}，对冲比例 {hedge_ratio * 100:.0f}%，"
            f"来源仓位名义价值约 {position_notional:.0f} USDT。"
        ),
        steps=steps,
        warnings=["未提交真实订单。"],
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


def _derive_execution_params(strategy, source_position):
    direction = "sell" if source_position.get("direction") == "long" else "buy"
    hedge_ratio = _parse_ratio(strategy.hedge_ratio, default=1.0 if strategy.type == "OPTIONS" else 0.4)
    current_price = max(float(source_position.get("current_price") or 0), 1.0)
    position_notional = max(float(source_position.get("size") or 0), current_price * 0.01)
    hedge_notional = max(position_notional * hedge_ratio, current_price * 0.001)
    quantity = round(hedge_notional / current_price, 6)
    return direction, quantity, hedge_ratio, position_notional, current_price


def _find_source_position(asset):
    candidates = []
    for session in _sessions.values():
        if not session.get("connected"):
            continue
        for position in session.get("positions", []) or []:
            symbol = str(position.get("symbol", "")).upper()
            if asset in symbol:
                candidates.append({**position, "mode": position.get("mode") or session.get("mode")})

    if not candidates:
        return None

    return sorted(candidates, key=lambda p: float(p.get("size") or 0), reverse=True)[0]


def _is_demo_position(position):
    return str(position.get("mode", "")).lower() == "demo"


def _find_source_position_from_accounts(accounts):
    positions = []
    for account in accounts or []:
        if not account.connected:
            continue
        for position in account.positions or []:
            positions.append(position)
    if not positions:
        return None
    return sorted(positions, key=lambda p: float(p.get("size") or 0), reverse=True)[0]


def _find_source_position_from_sessions():
    positions = []
    for session in _sessions.values():
        if not session.get("connected"):
            continue
        positions.extend(session.get("positions", []) or [])
    if not positions:
        return None
    return sorted(positions, key=lambda p: float(p.get("size") or 0), reverse=True)[0]


def _get_hyperliquid_trade_creds():
    session = _sessions.get("hyperliquid") or {}
    creds = session.get("creds", {})
    account_address = session.get("address") or creds.get("address") or creds.get("apiKey") or ""
    private_key = creds.get("privateKey") or creds.get("apiSecret") or ""
    return account_address, private_key


def _get_injective_private_key():
    session = _sessions.get("injective") or {}
    creds = session.get("creds", {})
    return creds.get("privateKey") or os.getenv("INJECTIVE_PRIVATE_KEY", "")


async def _enrich_single_strategy(strategy, source_position):
    asset = _extract_asset(strategy.title, strategy.description)
    direction = (source_position or {}).get("direction", "long")
    current_price = float((source_position or {}).get("current_price") or 0)

    strategy_data = strategy.model_dump()
    strategy_data.setdefault("market_links", [])
    strategy_data.setdefault("reference_summary", None)

    if strategy.type == "POLYMARKET":
        market = await _load_polymarket_reference(asset, direction, current_price)
        if market:
            strategy_data["reference_summary"] = (
                f"实时事件市场：{market['question']} · 结果 {market['outcome']} · 当前价格约 {market['price']}。"
            )
            strategy_data["market_links"] = [
                StrategyMarketLink(
                    label="Polymarket 事件页",
                    url=f"https://polymarket.com/event/{market['slug']}",
                    venue="Polymarket",
                    note=market["question"],
                ).model_dump(),
            ]

    if strategy.type == "OPTIONS":
        option_ref = await _load_options_reference(asset, direction, current_price)
        if option_ref:
            strategy_data["reference_summary"] = option_ref["reference_summary"]
            strategy_data["market_links"] = [
                StrategyMarketLink(
                    label="Derive 期权交易页",
                    url=option_ref["options_page_url"],
                    venue="Derive",
                    note=option_ref["display_label"],
                ).model_dump(),
                StrategyMarketLink(
                    label="Derive 实时合约查询",
                    url=option_ref["api_url"],
                    venue="Derive API",
                    note=option_ref["instrument_name"],
                ).model_dump(),
            ]

    if strategy.type == "REVERSE_HEDGE":
        strategy_data["reference_summary"] = (
            f"该方案使用实时仓位做反向对冲，当前参考标的 {asset}；"
            "建议按策略比例在对侧 venue 建立对冲仓位。"
        )

    return strategy_data


async def _load_polymarket_reference(asset, direction, current_price):
    try:
        return await polymarket_service.find_hedge_for_position(asset, direction, current_price)
    except Exception:
        return None


async def _load_options_reference(asset, direction, current_price):
    try:
        return await options_market_service.find_option_for_position(asset, direction, current_price)
    except Exception:
        return None
