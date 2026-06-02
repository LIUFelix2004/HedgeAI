import hashlib
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
from routers.accounts import _get_active_session, _refresh_positions_for_session, _sessions
from services import (
    audit_service,
    hyperliquid_service,
    injective_service,
    options_market_service,
    polymarket_service,
    strategy_history_service,
)

router = APIRouter(prefix="/hedge", tags=["hedge"])

SOURCE_POSITION_NOT_FOUND = "未找到 {asset} 的已连接来源仓位。"
DEMO_POSITION_BLOCKED = "Demo 仓位只能用于演示或 dry-run，不能触发真实交易执行。"
REAL_CONFIRMATION_REQUIRED = "Real execution requires explicit confirmation."
POLYMARKET_REAL_DISABLED = "Polymarket 实盘执行尚未启用，请先使用 dry-run 订单预览。"
OPTIONS_REAL_DISABLED = "Options 实盘执行尚未启用，请先使用 dry-run 执行清单。"
POLYMARKET_MARKET_UNAVAILABLE = "当前未找到与该持仓直接对应的 Polymarket 事件市场，此方案仅可作为思路参考，暂不可执行。"
MAX_REAL_ORDER_NOTIONAL = 100_000
_execution_idempotency_keys = set()
POSITION_RECONFIRM_REQUIRED = "Position changed after precheck. Please review the latest snapshot and confirm again."
TARGET_BALANCE_UNKNOWN = "Unable to automatically verify target venue balance."
TARGET_MARGIN_UNKNOWN = "Unable to automatically verify target venue margin."
HELIX_FUTURES_BASE_URL = "https://helixapp.com/futures"
KNOWN_ASSETS = (
    "BTC", "ETH", "INJ",
    "DOGE", "SOL", "XRP", "BNB", "ADA", "AVAX", "LINK",
    "AAPL", "TSLA", "NVDA", "META", "AMZN", "MSFT", "GOOG", "GOOGL",
    "PLTR", "MSTR", "COIN", "HOOD", "CRCL",
    "GBP", "EUR", "JPY", "AUD", "CHF", "CAD",
    "XAU", "GOLD", "XAG", "SILVER", "OIL",
)


@router.post("/execute", response_model=ExecuteResult)
async def execute_hedge(req: ExecuteRequest):
    strategy = req.strategy
    audit_id = audit_service.new_audit_id("exec")

    try:
        if req.mode == ExecuteMode.REAL and not req.confirmed:
            raise ValueError(REAL_CONFIRMATION_REQUIRED)
        if req.mode in {ExecuteMode.DEMO, ExecuteMode.DRY_RUN}:
            return _finalize_execution_result(await _preview_execution(strategy, req.mode), audit_id, req)

        if strategy.type == "REVERSE_HEDGE":
            return _finalize_execution_result(
                await _execute_reverse_hedge(strategy, req.idempotency_key, req.precheck_signature),
                audit_id,
                req,
            )
        if strategy.type == "OPTIONS":
            raise ValueError(OPTIONS_REAL_DISABLED)
        if strategy.type == "POLYMARKET":
            raise ValueError(POLYMARKET_REAL_DISABLED)

        raise HTTPException(status_code=400, detail=f"Unknown strategy type: {strategy.type}")
    except Exception as e:
        error_code = _classify_execution_error(e)
        result = ExecuteResult(
            success=False,
            execution_mode="blocked",
            audit_id=audit_id,
            error_code=error_code,
            error=str(e),
        )
        _record_execution_audit(req, result)
        return result


@router.post("/enrich-strategies")
async def enrich_strategies(req: EnrichStrategiesRequest):
    source_position = _find_source_position_from_accounts(req.accounts) or _find_source_position_from_sessions()
    enriched = []

    for strategy in req.strategies:
        enriched.append(await _enrich_single_strategy(strategy, source_position))

    return {"strategies": enriched}


@router.get("/history")
async def strategy_history(limit: int = 50):
    return {"items": strategy_history_service.list_strategy_history(limit=limit)}


@router.get("/audit")
async def audit_history(limit: int = 100):
    return {"items": audit_service.list_audit_events(limit=limit)}


@router.post("/precheck")
async def precheck_hedge(req: ExecuteRequest):
    return await _build_execution_precheck(req.strategy, req.mode)


async def _execute_reverse_hedge(strategy, idempotency_key=None, precheck_signature=None):
    asset = _extract_asset(strategy.title, strategy.description)
    await _refresh_candidate_source_positions(asset)
    source_position = _find_source_position(asset)
    if not source_position:
        raise ValueError(SOURCE_POSITION_NOT_FOUND.format(asset=asset))
    current_signature = _build_position_signature(source_position)
    if precheck_signature and current_signature != precheck_signature:
        raise ValueError(POSITION_RECONFIRM_REQUIRED)
    if _is_demo_position(source_position):
        raise ValueError(DEMO_POSITION_BLOCKED)

    direction, quantity, hedge_ratio, position_notional, _current_price = _derive_execution_params(strategy, source_position)
    target_summary = await _load_target_account_summary(source_position)
    _precheck_real_execution(idempotency_key, position_notional * hedge_ratio, source_position, target_summary)
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


def _precheck_real_execution(idempotency_key, order_notional, source_position=None, target_summary=None):
    if order_notional > MAX_REAL_ORDER_NOTIONAL:
        raise ValueError(
            f"Order notional {order_notional:.0f} USDT exceeds limit {MAX_REAL_ORDER_NOTIONAL:.0f} USDT."
        )
    if not idempotency_key:
        raise ValueError("Real execution requires an idempotency key.")
    if idempotency_key in _execution_idempotency_keys:
        raise ValueError("Duplicate execution request blocked by idempotency key.")
    if target_summary:
        required_margin = _estimate_required_margin(order_notional, source_position or {})
        available_balance = target_summary.get("available_balance")
        if available_balance is not None and available_balance < required_margin:
            raise ValueError(
                f"Target venue available balance {available_balance:.2f} USDT is below required margin {required_margin:.2f} USDT."
            )
    _execution_idempotency_keys.add(idempotency_key)


async def _preview_execution(strategy, mode):
    if strategy.type == "POLYMARKET" and strategy.execution_available is False:
        return ExecuteResult(
            success=False,
            execution_mode="blocked",
            venue="polymarket",
            error_code="MARKET_UNAVAILABLE",
            error=strategy.execution_block_reason or POLYMARKET_MARKET_UNAVAILABLE,
            summary=strategy.execution_block_reason or POLYMARKET_MARKET_UNAVAILABLE,
        )
    asset = _extract_asset(
        strategy.title,
        strategy.description,
        _symbol_text_from_market_snapshot(getattr(strategy, "market_snapshot", None)),
        _texts_from_market_links(getattr(strategy, "market_links", None)),
    )
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
    if strategy.execution_available is False:
        return ExecuteResult(
            success=False,
            execution_mode="blocked",
            venue="polymarket",
            error_code="MARKET_UNAVAILABLE",
            error=strategy.execution_block_reason or POLYMARKET_MARKET_UNAVAILABLE,
            summary=strategy.execution_block_reason or POLYMARKET_MARKET_UNAVAILABLE,
        )
    asset = _extract_asset(
        strategy.title,
        strategy.description,
        _symbol_text_from_market_snapshot(getattr(strategy, "market_snapshot", None)),
        _texts_from_market_links(getattr(strategy, "market_links", None)),
    )
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
    upper = combined.upper()
    for asset in KNOWN_ASSETS:
        if re.search(rf"\b{re.escape(asset)}\b", upper):
            return asset
    quoted_pair = re.search(r"\b([A-Z]{2,10})/(?:USDT|USDC|USD)\b", upper)
    if quoted_pair:
        return quoted_pair.group(1)
    return "BTC"


def _symbol_text_from_market_snapshot(snapshot):
    if not isinstance(snapshot, dict):
        return ""
    values = [
        snapshot.get("symbol"),
        snapshot.get("question"),
        snapshot.get("display_label"),
        snapshot.get("instrument_name"),
        snapshot.get("note"),
        snapshot.get("url"),
    ]
    return " ".join(str(value) for value in values if value)


def _texts_from_market_links(market_links):
    parts = []
    for link in market_links or []:
        if hasattr(link, "model_dump"):
            link = link.model_dump()
        if isinstance(link, dict):
            parts.extend([
                str(link.get("label") or ""),
                str(link.get("note") or ""),
                str(link.get("url") or ""),
            ])
    return " ".join(part for part in parts if part)


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


async def _refresh_candidate_source_positions(asset):
    for platform in list(_sessions.keys()):
        try:
            session = _get_active_session(platform)
        except HTTPException:
            continue
        if not session.get("connected"):
            continue
        symbols = " ".join(str(p.get("symbol", "")) for p in session.get("positions", []) or [])
        should_refresh = platform in {"hyperliquid", "injective"}
        if asset:
            should_refresh = should_refresh and (asset in symbols.upper() or not symbols.strip())
        if not should_refresh:
            continue
        try:
            await _refresh_positions_for_session(platform, session)
        except Exception:
            continue


async def _build_execution_precheck(strategy, mode):
    asset = _extract_asset(
        strategy.title,
        strategy.description,
        _symbol_text_from_market_snapshot(getattr(strategy, "market_snapshot", None)),
        _texts_from_market_links(getattr(strategy, "market_links", None)),
    )
    await _refresh_candidate_source_positions(asset)
    source_position = _find_source_position(asset)
    if not source_position:
        return {
            "can_execute": False,
            "source_signature": None,
            "checks": [{
                "key": "source_position",
                "status": "fail",
                "label": "Source position",
                "message": SOURCE_POSITION_NOT_FOUND.format(asset=asset),
            }],
        }

    direction, quantity, hedge_ratio, position_notional, current_price = _derive_execution_params(strategy, source_position)
    order_notional = position_notional * hedge_ratio
    leverage = max(int(source_position.get("leverage") or 1), 1)
    target_venue = _derive_target_venue(source_position)
    target_summary = await _load_target_account_summary(source_position)
    required_margin = _estimate_required_margin(order_notional, source_position)
    checks = [
        {
            "key": "source_position",
            "status": "pass",
            "label": "Source position",
            "message": f"{source_position.get('symbol')} {source_position.get('direction')} {source_position.get('leverage')}x",
        },
        {
            "key": "risk_limit",
            "status": "pass" if order_notional <= MAX_REAL_ORDER_NOTIONAL else "fail",
            "label": "Order notional limit",
            "message": f"Estimated order notional {order_notional:.2f} / limit {MAX_REAL_ORDER_NOTIONAL:.2f} USDT",
        },
    ]
    checks.extend(_build_balance_checks(target_summary, required_margin))

    return {
        "can_execute": all(check["status"] != "fail" for check in checks),
        "mode": mode.value if isinstance(mode, ExecuteMode) else str(mode),
        "source_signature": _build_position_signature(source_position),
        "source_position": {
            "platform": source_position.get("platform"),
            "symbol": source_position.get("symbol"),
            "direction": source_position.get("direction"),
            "size": source_position.get("size"),
            "leverage": source_position.get("leverage"),
            "current_price": current_price,
            "margin_used": source_position.get("margin_used"),
            "liquidation_distance_pct": source_position.get("liquidation_distance_pct"),
        },
        "estimated_order": {
            "asset": asset,
            "target_venue": target_venue,
            "side": direction,
            "quantity": quantity,
            "hedge_ratio": round(hedge_ratio * 100, 2),
            "order_notional": round(order_notional, 2),
            "required_margin": round(required_margin, 2),
            "reference_leverage": leverage,
        },
        "target_account": target_summary or {"venue": target_venue},
        "checks": checks,
    }


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


async def _load_target_account_summary(source_position):
    source_platform = source_position.get("platform")
    if source_platform == "injective":
        session = _get_trade_session("hyperliquid")
        address = session.get("address") or session.get("creds", {}).get("address") or session.get("creds", {}).get("apiKey")
        if not address:
            return {
                "venue": "hyperliquid",
                "available_balance": None,
                "total_margin_used": None,
                "credential_ready": False,
                "balance_check": "missing_address",
            }
        try:
            summary = await hyperliquid_service.get_account_overview(address)
        except Exception:
            summary = session.get("account_summary") or {}
        summary["credential_ready"] = bool(session.get("creds", {}).get("privateKey") or session.get("creds", {}).get("apiSecret"))
        return summary

    if source_platform == "hyperliquid":
        session = _get_trade_session("injective")
        summary = dict(session.get("account_summary") or {})
        if not summary:
            summary = {
                "venue": "injective",
                "available_balance": None,
                "total_margin_used": None,
                "balance_check": "unavailable",
            }
        summary["credential_ready"] = bool(session.get("creds", {}).get("privateKey") or os.getenv("INJECTIVE_PRIVATE_KEY", ""))
        return summary

    return {}


def _derive_target_venue(source_position):
    source_platform = source_position.get("platform")
    if source_platform == "injective":
        return "hyperliquid"
    if source_platform == "hyperliquid":
        return "injective"
    return "unknown"


def _estimate_required_margin(order_notional, source_position):
    leverage = max(float(source_position.get("leverage") or 1), 1.0)
    return max(order_notional / leverage, 0.0)


def _build_balance_checks(target_summary, required_margin):
    if not target_summary:
        return [{
            "key": "target_balance",
            "status": "warn",
            "label": "Target balance",
            "message": TARGET_BALANCE_UNKNOWN,
        }]

    checks = []
    if not target_summary.get("credential_ready"):
        checks.append({
            "key": "target_credentials",
            "status": "fail",
            "label": "Target credentials",
            "message": "Target venue trade credentials are not connected.",
        })

    available_balance = target_summary.get("available_balance")
    if available_balance is None:
        checks.append({
            "key": "target_balance",
            "status": "warn",
            "label": "Target balance",
            "message": TARGET_BALANCE_UNKNOWN,
        })
    else:
        checks.append({
            "key": "target_balance",
            "status": "pass" if available_balance >= required_margin else "fail",
            "label": "Target balance",
            "message": f"Available balance {available_balance:.2f} USDT, required margin {required_margin:.2f} USDT",
        })

    total_margin_used = target_summary.get("total_margin_used")
    if total_margin_used is None:
        checks.append({
            "key": "target_margin",
            "status": "warn",
            "label": "Target margin",
            "message": TARGET_MARGIN_UNKNOWN,
        })
    else:
        checks.append({
            "key": "target_margin",
            "status": "pass",
            "label": "Target margin",
            "message": f"Existing margin usage {total_margin_used:.2f} USDT",
        })

    return checks


def _build_position_signature(position):
    base = "|".join([
        str(position.get("platform") or ""),
        str(position.get("symbol") or ""),
        str(position.get("direction") or ""),
        f"{float(position.get('size') or 0):.4f}",
        f"{float(position.get('current_price') or 0):.4f}",
        f"{float(position.get('leverage') or 0):.2f}",
        f"{float(position.get('margin_used') or 0):.4f}",
    ])
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:16]


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


def _finalize_execution_result(result, audit_id, req):
    result.audit_id = audit_id
    if not result.success and result.error:
        result.error_code = _classify_execution_error(result.error)
    _record_execution_audit(req, result)
    return result


def _record_execution_audit(req, result):
    audit_service.record_audit_event({
        "audit_id": result.audit_id,
        "status": "success" if result.success else "blocked",
        "execution_mode": result.execution_mode,
        "error_code": result.error_code,
        "strategy_id": req.strategy.id,
        "strategy_type": req.strategy.type,
        "venue": result.venue or req.strategy.execution_venue,
        "summary": result.summary,
        "order_id": result.order_id,
        "tx_hash": result.tx_hash,
    })
    strategy_history_service.record_strategy_history({
        "audit_id": result.audit_id,
        "strategy_id": req.strategy.id,
        "strategy_title": req.strategy.title,
        "strategy_type": req.strategy.type,
        "hedge_ratio": req.strategy.hedge_ratio,
        "execution_mode": result.execution_mode,
        "status": "success" if result.success else "blocked",
        "venue": result.venue or req.strategy.execution_venue,
        "result_summary": result.summary,
        "error_code": result.error_code,
        "order_id": result.order_id,
        "tx_hash": result.tx_hash,
    })


def _classify_execution_error(error):
    message = str(error)
    lowered = message.lower()
    if message == REAL_CONFIRMATION_REQUIRED or "confirmation" in lowered or "confirm" in lowered:
        return "EXEC_CONFIRMATION_REQUIRED"
    if "duplicate" in lowered:
        return "EXEC_DUPLICATE_REQUEST"
    if "idempotency" in lowered:
        return "EXEC_IDEMPOTENCY_REQUIRED"
    if "notional" in lowered or "limit" in lowered:
        return "RISK_LIMIT_EXCEEDED"
    if "unsupported injective market" in lowered or "unknown injective market" in lowered:
        return "MARKET_UNSUPPORTED"
    if "private key" in lowered or "私钥" in message or "凭证" in message:
        return "CREDENTIAL_REQUIRED"
    if "未找到" in message or "not found" in lowered:
        return "POSITION_NOT_FOUND"
    if "dry-run" in lowered or "尚未启用" in message:
        return "EXEC_UNSUPPORTED_VENUE"
    return "EXECUTION_FAILED"


def _classify_execution_error_v2(error):
    message = str(error)
    lowered = message.lower()
    if "changed after precheck" in lowered:
        return "POSITION_RECONFIRM_REQUIRED"
    if message == REAL_CONFIRMATION_REQUIRED or "confirmation" in lowered or "confirm" in lowered:
        return "EXEC_CONFIRMATION_REQUIRED"
    if "duplicate" in lowered:
        return "EXEC_DUPLICATE_REQUEST"
    if "idempotency" in lowered:
        return "EXEC_IDEMPOTENCY_REQUIRED"
    if "notional" in lowered or "limit" in lowered:
        return "RISK_LIMIT_EXCEEDED"
    if "unsupported injective market" in lowered or "unknown injective market" in lowered:
        return "MARKET_UNSUPPORTED"
    if "balance" in lowered or "margin" in lowered:
        return "INSUFFICIENT_FUNDS"
    if "private key" in lowered or "credential" in lowered:
        return "CREDENTIAL_REQUIRED"
    if "not found" in lowered:
        return "POSITION_NOT_FOUND"
    if "暂不可执行" in message or "market unavailable" in lowered:
        return "MARKET_UNAVAILABLE"
    if "dry-run" in lowered:
        return "EXEC_UNSUPPORTED_VENUE"
    if "demo" in lowered:
        return "DEMO_POSITION_BLOCKED"
    return "EXECUTION_FAILED"


_classify_execution_error = _classify_execution_error_v2


async def _enrich_single_strategy(strategy, source_position):
    source_symbol = (source_position or {}).get("symbol")
    asset = _extract_asset(
        source_symbol,
        strategy.title,
        strategy.description,
        _symbol_text_from_market_snapshot(strategy.model_dump().get("market_snapshot")),
        _texts_from_market_links(strategy.model_dump().get("market_links")),
    )
    direction = (source_position or {}).get("direction", "long")
    current_price = float((source_position or {}).get("current_price") or 0)

    strategy_data = strategy.model_dump()
    strategy_data["market_links"] = strategy_data.get("market_links") or []
    strategy_data["reference_summary"] = strategy_data.get("reference_summary")
    strategy_data["market_snapshot"] = strategy_data.get("market_snapshot")

    if strategy.type == "POLYMARKET":
        market = await _load_polymarket_reference(asset, direction, current_price)
        if market:
            strategy_data["execution_available"] = True
            strategy_data["execution_block_reason"] = None
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
        else:
            strategy_data["execution_available"] = False
            strategy_data["execution_block_reason"] = POLYMARKET_MARKET_UNAVAILABLE
            strategy_data["reference_summary"] = (
                f"{asset} 当前未检索到可直接映射的 Polymarket 事件市场。"
                "建议保留该卡片作为对冲思路参考，或优先使用反向合约/期权类方案。"
            )
            strategy_data["market_snapshot"] = {
                "unavailable": True,
                "reason": POLYMARKET_MARKET_UNAVAILABLE,
                "asset": asset,
            }
            strategy_data["market_links"] = []

    if strategy.type == "OPTIONS":
        position_notional = float((source_position or {}).get("size") or 0)
        option_ref = await _load_options_reference(asset, direction, current_price, position_notional)
        if option_ref:
            option_snapshot = _build_option_snapshot(option_ref, direction)
            strategy_data["reference_summary"] = option_ref["reference_summary"]
            strategy_data["market_snapshot"] = option_snapshot
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
        strategy_data["market_links"] = strategy_data["market_links"] or _build_reverse_hedge_market_links(
            asset,
            source_symbol or f"{asset}/USDT",
        )

    return strategy_data


def _build_reverse_hedge_market_links(asset, symbol_text):
    normalized_symbol = str(symbol_text or f"{asset}/USDT").upper().replace(" PERP", "").strip()
    if "/" in normalized_symbol:
        base, quote = normalized_symbol.split("/", 1)
    else:
        base, quote = (asset or "BTC").upper(), "USDT"
    if quote in {"USDC", "USD"}:
        quote = "USDT"
    slug = f"{base.lower()}-{quote.lower()}-perp"
    return [
        StrategyMarketLink(
            label="Helix 交易页",
            url=f"{HELIX_FUTURES_BASE_URL}/{slug}",
            venue="Helix",
            note=f"{base}/{quote} PERP",
        ).model_dump(),
    ]


def _build_option_snapshot(option_ref, source_direction):
    option_type = option_ref.get("option_type")
    readable_type = "Put" if option_type == "P" else "Call" if option_type == "C" else option_type
    expiry_date = option_ref.get("expiry_date")
    if not expiry_date and option_ref.get("expiry_ts"):
        from datetime import datetime, timezone

        expiry_date = datetime.fromtimestamp(int(option_ref["expiry_ts"]), tz=timezone.utc).strftime("%Y-%m-%d")
    strike = option_ref.get("strike")
    if option_type == "P":
        protection_range = f"保护 {strike:.0f} 以下的下行风险" if isinstance(strike, (int, float)) else "保护下行风险"
    else:
        protection_range = f"保护 {strike:.0f} 以上的上行风险" if isinstance(strike, (int, float)) else "保护上行风险"
    return {
        "venue": "Derive",
        "instrument_name": option_ref.get("instrument_name"),
        "display_label": option_ref.get("display_label"),
        "option_type": readable_type,
        "source_direction": source_direction,
        "strike": strike,
        "expiry_date": expiry_date,
        "days_to_expiry": option_ref.get("days_to_expiry"),
        "protection_range": protection_range,
        "url": option_ref.get("options_page_url"),
        "api_url": option_ref.get("api_url"),
        "model_source": option_ref.get("model_source"),
        "rl_policy_score": option_ref.get("rl_policy_score"),
        "premium_estimate": option_ref.get("premium_estimate"),
        "intrinsic_value": option_ref.get("intrinsic_value"),
        "time_value": option_ref.get("time_value"),
        "delta": option_ref.get("delta"),
        "gamma": option_ref.get("gamma"),
        "hedge_units": option_ref.get("hedge_units"),
        "recommended_contracts": option_ref.get("recommended_contracts"),
        "volatility_assumption": option_ref.get("volatility_assumption"),
    }


async def _load_polymarket_reference(asset, direction, current_price):
    try:
        return await polymarket_service.find_hedge_for_position(asset, direction, current_price)
    except Exception:
        return None


async def _load_options_reference(asset, direction, current_price, position_notional=0.0):
    try:
        return await options_market_service.find_option_for_position(asset, direction, current_price, position_notional)
    except Exception:
        return None
