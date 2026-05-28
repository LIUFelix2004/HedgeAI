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
from routers.accounts import _get_active_session, _sessions
from services import hyperliquid_service, injective_service, options_market_service, polymarket_service

router = APIRouter(prefix="/hedge", tags=["hedge"])

SOURCE_POSITION_NOT_FOUND = "未找到 {asset} 的已连接来源仓位。"
DEMO_POSITION_BLOCKED = "Demo 仓位只能用于演示或 dry-run，不能触发真实交易执行。"
REAL_CONFIRMATION_REQUIRED = "Real execution requires explicit confirmation."
POLYMARKET_REAL_DISABLED = "Polymarket 实盘执行尚未启用，请先使用 dry-run 订单预览。"
OPTIONS_REAL_DISABLED = "Options 实盘执行尚未启用，请先使用 dry-run 执行清单。"
MAX_REAL_ORDER_NOTIONAL = 100_000
_execution_idempotency_keys = set()


@router.post("/execute", response_model=ExecuteResult)
async def execute_hedge(req: ExecuteRequest):
    strategy = req.strategy

    try:
        if req.mode == ExecuteMode.REAL and not req.confirmed:
            raise ValueError(REAL_CONFIRMATION_REQUIRED)
        if req.mode in {ExecuteMode.DEMO, ExecuteMode.DRY_RUN}:
            return await _preview_execution(strategy, req.mode)

        if strategy.type == "REVERSE_HEDGE":
            return await _execute_reverse_hedge(strategy, req.idempotency_key)
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


async def _execute_reverse_hedge(strategy, idempotency_key=None):
    asset = _extract_asset(strategy.title, strategy.description)
    source_position = _find_source_position(asset)
    if not source_position:
        raise ValueError(SOURCE_POSITION_NOT_FOUND.format(asset=asset))
    if _is_demo_position(source_position):
        raise ValueError(DEMO_POSITION_BLOCKED)

    direction, quantity, hedge_ratio, position_notional, _current_price = _derive_execution_params(strategy, source_position)
    _precheck_real_execution(idempotency_key, position_notional * hedge_ratio)
    source_platform = source_position.get("platform")

    if source_platform == "hyperliquid":
        injective_pk = _get_injective_private_key()
        if not injective_pk:
            raise ValueError("Hyperliquid 仓位要做真实反向对冲，请先连接带私钥的 Injective 账户。")

        market_id = injective_service.get_derivative_market_id(asset)
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
            raw_response=result.get("raw_response"),
            summary=(
                f"基于 Hyperliquid 原仓位约 {position_notional:.0f} USDT，按 {hedge_ratio * 100:.0f}% "
                f"在 Injective 执行 {direction} {quantity:.4f} {asset} 反向对冲。"
            ),
            error=_map_injective_error(result.get("error")),
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


def _precheck_real_execution(idempotency_key, order_notional):
    if order_notional > MAX_REAL_ORDER_NOTIONAL:
        raise ValueError(
            f"Order notional {order_notional:.0f} USDT exceeds limit {MAX_REAL_ORDER_NOTIONAL:.0f} USDT."
        )
    if not idempotency_key:
        raise ValueError("Real execution requires an idempotency key.")
    if idempotency_key in _execution_idempotency_keys:
        raise ValueError("Duplicate execution request blocked by idempotency key.")
    _execution_idempotency_keys.add(idempotency_key)


async def _preview_execution(strategy, mode):
    asset = _extract_asset(strategy.title, strategy.description)
    mode_value = mode.value if isinstance(mode, ExecuteMode) else str(mode)
    if strategy.type == "POLYMARKET" and mode_value == ExecuteMode.DRY_RUN.value:
        return await _preview_polymarket_execution(strategy)

    source_position = _find_source_position(asset)
    direction, quantity, hedge_ratio, position_notional, _current_price = _derive_execution_params(
        strategy,
        source_position or {"direction": "long", "size": 1000, "current_price": 1},
    )
    label = "Demo 模拟执行" if mode_value == ExecuteMode.DEMO.value else "Dry-run preview 订单预览"
    steps = [
        "校验执行模式",
        "读取来源仓位",
        "生成模拟订单" if mode_value == ExecuteMode.DEMO.value else "生成订单预览",
        "返回演示结果" if mode_value == ExecuteMode.DEMO.value else "返回预览结果",
    ]
    order_preview = None
    if strategy.type == "REVERSE_HEDGE" and mode_value == ExecuteMode.DRY_RUN.value:
        order_preview = injective_service.build_order_preview(
            asset=asset,
            direction=direction,
            quantity=quantity,
            price=0,
            leverage=max(int((source_position or {}).get("leverage") or 1), 1),
            notional=position_notional * hedge_ratio,
            source_platform=(source_position or {}).get("platform") or "preview",
        )

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
        order_preview=order_preview,
    )


async def _preview_polymarket_execution(strategy):
    asset = _extract_asset(strategy.title, strategy.description)
    source_position = _find_source_position(asset)
    hedge_ratio = _parse_ratio(strategy.hedge_ratio, default=0.15)
    position_notional = float(source_position.get("size") or 1000.0) if source_position else 1000.0
    snapshot = strategy.market_snapshot or _snapshot_from_market_links(strategy.market_links)
    price = float(snapshot.get("price") or 0.5)
    order_size = round(max(position_notional * hedge_ratio, 50), 2)
    token_id = snapshot.get("token_id")
    outcome = snapshot.get("outcome")

    order_preview = {
        "venue": "polymarket",
        "side": "buy",
        "token_id": token_id,
        "price": price,
        "size": order_size,
        "outcome": outcome,
        "question": snapshot.get("question"),
        "url": snapshot.get("url"),
    }
    return ExecuteResult(
        success=True,
        execution_mode=ExecuteMode.DRY_RUN.value,
        venue="polymarket",
        summary=(
            f"Polymarket order preview：按 {asset} 仓位的 {hedge_ratio * 100:.0f}% 估算，"
            f"预览 buy {outcome or 'selected outcome'}，价格 {price:.2f}，名义规模约 {order_size} USDT。"
        ),
        steps=["校验执行模式", "读取市场快照", "生成订单预览", "返回预览结果"],
        warnings=["未提交真实 Polymarket 订单。"],
        order_preview=order_preview,
    )


def _snapshot_from_market_links(market_links):
    if not market_links:
        return {}
    first = market_links[0]
    if hasattr(first, "model_dump"):
        return first.model_dump()
    return dict(first)


def _extract_asset(*texts):
    combined = " ".join([t for t in texts if t])
    for asset in ("BTC", "ETH", "INJ"):
        if asset in combined.upper():
            return asset
    quoted_pair = re.search(r"\b([A-Z]{2,10})/(?:USDT|USDC|USD)\b", combined.upper())
    if quoted_pair:
        return quoted_pair.group(1)
    for asset in ("DOGE", "SOL", "XRP", "BNB", "ADA", "AVAX", "LINK"):
        if re.search(rf"\b{asset}\b", combined.upper()):
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
    for session in _active_sessions():
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
    for session in _active_sessions():
        if not session.get("connected"):
            continue
        positions.extend(session.get("positions", []) or [])
    if not positions:
        return None
    return sorted(positions, key=lambda p: float(p.get("size") or 0), reverse=True)[0]


def _get_hyperliquid_trade_creds():
    session = _get_trade_session("hyperliquid")
    creds = session.get("creds", {})
    account_address = session.get("address") or creds.get("address") or creds.get("apiKey") or ""
    private_key = creds.get("privateKey") or creds.get("apiSecret") or ""
    return account_address, private_key


def _get_injective_private_key():
    session = _get_trade_session("injective")
    if not session:
        return ""
    creds = session.get("creds", {})
    return creds.get("privateKey") or os.getenv("INJECTIVE_PRIVATE_KEY", "")


def _active_sessions():
    for platform in list(_sessions.keys()):
        try:
            yield _get_active_session(platform)
        except HTTPException:
            continue


def _get_trade_session(platform):
    try:
        return _get_active_session(platform)
    except HTTPException:
        return {}


def _map_injective_error(error):
    if not error:
        return None
    raw = str(error)
    lowered = raw.lower()
    if "private key" in lowered:
        return "Injective 私钥缺失，请重新连接带执行私钥的账户。"
    if "unsupported injective market" in lowered or "unsupported injective market id" in lowered:
        return raw
    if "insufficient" in lowered or "balance" in lowered or "margin" in lowered:
        return "Injective 余额或保证金不足，请检查账户资金后重试。"
    if "gas" in lowered:
        return "Injective 链上交易 gas 估算失败，请稍后重试或检查网络状态。"
    return raw


async def _enrich_single_strategy(strategy, source_position):
    asset = _extract_asset(strategy.title, strategy.description)
    direction = (source_position or {}).get("direction", "long")
    current_price = float((source_position or {}).get("current_price") or 0)

    strategy_data = strategy.model_dump()
    strategy_data.setdefault("market_links", [])
    strategy_data.setdefault("reference_summary", None)
    strategy_data.setdefault("market_snapshot", None)

    if strategy.type == "POLYMARKET":
        market = await _load_polymarket_reference(asset, direction, current_price)
        if market:
            market_url = market.get("event_url") or f"https://polymarket.com/event/{market['slug']}"
            strategy_data["market_snapshot"] = {
                "question": market.get("question"),
                "outcome": market.get("outcome"),
                "price": market.get("price"),
                "probability": market.get("probability", market.get("price")),
                "token_id": market.get("token_id"),
                "updated_at": market.get("updated_at") or market.get("updatedAt"),
                "url": market_url,
            }
            strategy_data["reference_summary"] = (
                f"实时事件市场：{market['question']} · 结果 {market['outcome']} · 当前价格约 {market['price']}。"
            )
            strategy_data["market_links"] = [
                StrategyMarketLink(
                    label="Polymarket 事件页",
                    url=market_url,
                    venue="Polymarket",
                    note=market["question"],
                    outcome=market.get("outcome"),
                    price=market.get("price"),
                    probability=market.get("probability", market.get("price")),
                    updated_at=market.get("updated_at") or market.get("updatedAt"),
                    token_id=market.get("token_id"),
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
