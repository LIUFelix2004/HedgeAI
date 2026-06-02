"""
Injective blockchain service.
Handles: position reads, real order execution, explorer links.
"""
import asyncio
import logging
import os
import time
from decimal import Decimal
from typing import Optional

from services import market_price_service

logger = logging.getLogger(__name__)

NETWORK = os.getenv("INJECTIVE_NETWORK", "testnet")
HELIX_MARKET_NETWORK = os.getenv("HELIX_MARKET_NETWORK", "mainnet")
DEMO_MARKET_PRICE_NETWORK = os.getenv("INJECTIVE_DEMO_MARKET_NETWORK", HELIX_MARKET_NETWORK)
DEFAULT_EXECUTION_LEVERAGE = Decimal(os.getenv("INJECTIVE_EXECUTION_LEVERAGE", "5"))
ALLOW_DEMO_EXECUTION = os.getenv("INJECTIVE_ALLOW_DEMO_EXECUTION", "").lower() in {"1", "true", "yes"}
EXPLORER_BASE = (
    "https://testnet.explorer.injective.network/transaction/"
    if NETWORK == "testnet"
    else "https://explorer.injective.network/transaction/"
)
INJECTIVE_DERIVATIVE_MARKETS = {
    "BTC": "0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9",
    "ETH": "0x70bc8d7feab38b23d5fdfb12b9c3726e400c265edbcbf449b6c80c31d63d3a02",
    "INJ": "0x17ef48032cb24375ba7c2e39f384e56433bcab20cbee9a7357e4cba2eb00abe6",
}
BUILTIN_DEMO_MARKETS = {
    "0x0ee7ca44147bab6ec81ac293b5fe7915488e612af59964b2d663d6008d861dee": {
        "market_id": "0x0ee7ca44147bab6ec81ac293b5fe7915488e612af59964b2d663d6008d861dee",
        "ticker": "BTC/USDC PERP",
        "symbol": "BTC/USDC",
        "quote_symbol": "USDC",
        "quote_decimals": 6,
        "oracle_scale_factor": 6,
        "initial_margin_ratio": 0.019231,
        "maintenance_margin_ratio": 0.01,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "is_perpetual": True,
        "category": "crypto",
    },
    "0xe9c90a90ec75194ba9693f12b58a88a06937599e00c2adbc565a7b1a6ffbe4ed": {
        "market_id": "0xe9c90a90ec75194ba9693f12b58a88a06937599e00c2adbc565a7b1a6ffbe4ed",
        "ticker": "ETH/USDC PERP",
        "symbol": "ETH/USDC",
        "quote_symbol": "USDC",
        "quote_decimals": 6,
        "oracle_scale_factor": 6,
        "initial_margin_ratio": 0.019231,
        "maintenance_margin_ratio": 0.01,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "is_perpetual": True,
        "category": "crypto",
    },
    "0xa3d0ef8d845ada306a53baabd04edab9c5525ba9e011648a09aa064db5ca3442": {
        "market_id": "0xa3d0ef8d845ada306a53baabd04edab9c5525ba9e011648a09aa064db5ca3442",
        "ticker": "AAPL/USDC PERP",
        "symbol": "AAPL/USDC",
        "quote_symbol": "USDC",
        "quote_decimals": 6,
        "oracle_scale_factor": 6,
        "initial_margin_ratio": 0.033333,
        "maintenance_margin_ratio": 0.02,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "is_perpetual": True,
        "category": "rwa_stocks",
    },
    "0x802ff0b7a26a1e5f1665f88919b25db52a5b110d11763e427b9b4875e3b74385": {
        "market_id": "0x802ff0b7a26a1e5f1665f88919b25db52a5b110d11763e427b9b4875e3b74385",
        "ticker": "TSLA/USDC PERP",
        "symbol": "TSLA/USDC",
        "quote_symbol": "USDC",
        "quote_decimals": 6,
        "oracle_scale_factor": 6,
        "initial_margin_ratio": 0.033333,
        "maintenance_margin_ratio": 0.02,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "is_perpetual": True,
        "category": "rwa_stocks",
    },
    "0xb9d9202c588e860382c96aee096f9655fce339f6b51833a939a37d2437080c17": {
        "market_id": "0xb9d9202c588e860382c96aee096f9655fce339f6b51833a939a37d2437080c17",
        "ticker": "NVDA/USDC PERP",
        "symbol": "NVDA/USDC",
        "quote_symbol": "USDC",
        "quote_decimals": 6,
        "oracle_scale_factor": 6,
        "initial_margin_ratio": 0.033333,
        "maintenance_margin_ratio": 0.02,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "is_perpetual": True,
        "category": "rwa_stocks",
    },
    "0xc61fddd1e6b09137be87af41980d4804c94ab71de96d1c02eaad3356f877978f": {
        "market_id": "0xc61fddd1e6b09137be87af41980d4804c94ab71de96d1c02eaad3356f877978f",
        "ticker": "META/USDC PERP",
        "symbol": "META/USDC",
        "quote_symbol": "USDC",
        "quote_decimals": 6,
        "oracle_scale_factor": 6,
        "initial_margin_ratio": 0.033333,
        "maintenance_margin_ratio": 0.02,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "is_perpetual": True,
        "category": "rwa_stocks",
    },
}
DEFAULT_DEMO_POSITION = {
    "market_id": "0x0ee7ca44147bab6ec81ac293b5fe7915488e612af59964b2d663d6008d861dee",
    "symbol": "BTC/USDC",
    "direction": "long",
    "margin_used": 540.0,
    "entry_price": 90000.0,
    "leverage": 10.0,
}
DEMO_MAINTENANCE_MARGIN_RATE = float(os.getenv("DEMO_MAINTENANCE_MARGIN_RATE", "0.005"))
INJECTIVE_MARKET_CACHE_TTL = int(os.getenv("INJECTIVE_MARKET_CACHE_TTL", "60"))
_market_cache = {"expires_at": 0.0, "markets": []}
_market_lookup_cache = dict(BUILTIN_DEMO_MARKETS)


def _get_client(network_name: Optional[str] = None):
    try:
        from pyinjective.async_client import AsyncClient
        from pyinjective.core.network import Network

        target = network_name or NETWORK
        network = Network.testnet() if target == "testnet" else Network.mainnet()
        return AsyncClient(network)
    except ImportError:
        logger.warning("injective-py not installed")
        return None


async def get_positions(wallet_address: str, demo_config: Optional[dict] = None) -> list:
    """Fetch open derivative positions for a wallet."""
    if (wallet_address or "").strip().lower() == "demo":
        return await _mock_positions(wallet_address, demo_config)

    validate_wallet_address(wallet_address)

    client = _get_client()
    if not client:
        return []


async def get_account_overview(wallet_address: str) -> dict:
    raw = (wallet_address or "").strip().lower()
    if raw == "demo":
        return {
            "venue": "injective",
            "account_value": 1000.0,
            "available_balance": 1000.0,
            "total_margin_used": 540.0,
            "withdrawable": 460.0,
            "balance_check": "demo",
        }
    return {
        "venue": "injective",
        "account_value": None,
        "available_balance": None,
        "total_margin_used": None,
        "withdrawable": None,
        "balance_check": "unavailable",
    }

    try:
        from pyinjective.wallet import Address

        subaccount_id = _wallet_to_subaccount_id(wallet_address, Address)
        resp = await client.fetch_chain_subaccount_positions(subaccount_id=subaccount_id)
        positions = []
        for raw_position in (resp.get("state") or []):
            pos = _coerce_position(raw_position)
            entry = _to_float(pos.get("entry_price"))
            mark = _to_float(pos.get("mark_price"))
            liq = _to_float(pos.get("liquidation_price"))
            quantity = abs(_to_float(pos.get("quantity")))
            margin = _to_float(pos.get("margin"))
            is_long = _to_bool(pos.get("is_long"), default=pos.get("direction") != "short")
            pnl_pct = ((mark - entry) / entry) * (1 if is_long else -1) * 100 if entry and mark else 0.0
            direction = "long" if is_long else "short"
            liq_distance = round(abs(mark - liq) / mark * 100, 2) if mark and liq else 99
            leverage = round((quantity * mark) / margin, 2) if mark and margin else 0
            market_id = pos.get("market_id") or pos.get("marketId") or "unknown"

            positions.append({
                "platform": "injective",
                "symbol": str(market_id)[:12],
                "direction": direction,
                "size": round(quantity * mark, 4) if mark else 0,
                "leverage": leverage,
                "entry_price": entry,
                "current_price": mark,
                "unrealized_pnl_pct": round(pnl_pct, 2),
                "margin_used": margin,
                "liquidation_price": liq,
                "liquidation_distance_pct": liq_distance,
            })
        await _close_client(client)
        return positions
    except Exception as e:
        logger.error("Injective positions error: %s", e)
        return []


async def execute_order(
    market_id: str,
    direction: str,
    quantity: float,
    price: float,
    private_key: Optional[str] = None,
    allow_demo: bool = False,
) -> dict:
    """
    Place a derivative market order on Injective.
    Real execution requires a private key.
    """
    validate_order_params(market_id, direction, quantity, price, DEFAULT_EXECUTION_LEVERAGE)
    pk = private_key or os.getenv("INJECTIVE_PRIVATE_KEY", "")
    if not pk:
        if allow_demo or ALLOW_DEMO_EXECUTION:
            return await _demo_execute(market_id, direction, quantity, price)
        return {"success": False, "error": "Injective private key is required for real execution"}

    try:
        from pyinjective.async_client import AsyncClient
        from pyinjective.composer import Composer
        from pyinjective.constant import GAS_PRICE
        from pyinjective.core.market import DerivativeMarket
        from pyinjective.core.network import Network
        from pyinjective.core.token import Token
        from pyinjective.transaction import Transaction
        from pyinjective.wallet import PrivateKey

        network = Network.testnet() if NETWORK == "testnet" else Network.mainnet()
        client = AsyncClient(network)

        priv_key = PrivateKey.from_hex(pk)
        pub_key = priv_key.to_public_key()
        address = pub_key.to_address()
        subaccount = address.get_subaccount_id(index=0)
        sender = address.to_acc_bech32()

        market = _load_derivative_market(market_id, network.string(), DerivativeMarket, Token)
        composer = Composer(
            network=network.string(),
            derivative_markets={market_id: market},
            spot_markets={},
            binary_option_markets={},
            tokens={market.quote_token.symbol: market.quote_token},
        )
        await address.async_init_num_seq(network.lcd_endpoint)
        await client.sync_timeout_height()
        account_num = address.number
        sequence = address.sequence

        msg = composer.MsgCreateDerivativeMarketOrder(
            sender=sender,
            market_id=market_id,
            subaccount_id=subaccount,
            fee_recipient=sender,
            price=price,
            quantity=quantity,
            is_buy=(direction == "buy"),
            is_reduce_only=False,
            leverage=DEFAULT_EXECUTION_LEVERAGE,
        )

        gas_price = GAS_PRICE
        sim_fee_amount = gas_price * 200_000
        sim_tx = (
            Transaction()
            .with_messages(msg)
            .with_sequence(sequence)
            .with_account_num(account_num)
            .with_chain_id(network.chain_id)
            .with_gas(200_000)
            .with_fee([composer.coin(amount=sim_fee_amount, denom=network.fee_denom)])
            .with_timeout_height(client.timeout_height)
        )

        sign_doc = sim_tx.get_sign_doc(pub_key)
        sig = priv_key.sign(sign_doc.SerializeToString())
        sim_tx_bytes = sim_tx.get_tx_data(sig, pub_key)
        sim_res = await client.simulate(sim_tx_bytes)
        gas_used = _lookup(sim_res, "gasInfo", "gasUsed", default=200_000)
        gas_limit = max(int(int(gas_used) * 1.1), 200_000)
        fee_amount = gas_limit * gas_price

        tx = (
            Transaction()
            .with_messages(msg)
            .with_sequence(sequence)
            .with_account_num(account_num)
            .with_chain_id(network.chain_id)
            .with_gas(gas_limit)
            .with_fee([composer.coin(amount=fee_amount, denom=network.fee_denom)])
            .with_timeout_height(client.timeout_height)
        )

        sign_doc = tx.get_sign_doc(pub_key)
        sig = priv_key.sign(sign_doc.SerializeToString())
        tx_bytes = tx.get_tx_data(sig, pub_key)

        res = await client.broadcast_tx_sync_mode(tx_bytes)
        tx_hash = _lookup(res, "txResponse", "txhash") or _lookup(res, "tx_response", "txhash") or res.get("txhash")
        await _close_client(client)

        return {
            "success": True,
            "tx_hash": tx_hash,
            "explorer_url": EXPLORER_BASE + tx_hash,
            "raw_response": res,
            "venue": "injective",
        }

    except Exception as e:
        logger.error("Injective execute error: %s", e)
        return {"success": False, "error": str(e)}


def get_derivative_market_id(asset: str) -> str:
    normalized = (asset or "").strip().upper()
    try:
        return INJECTIVE_DERIVATIVE_MARKETS[normalized]
    except KeyError as exc:
        supported = ", ".join(sorted(INJECTIVE_DERIVATIVE_MARKETS))
        raise ValueError(f"Unsupported Injective market: {normalized or 'unknown'}. Supported: {supported}.") from exc


def validate_order_params(market_id: str, direction: str, quantity: float, price: float, leverage=None) -> None:
    if market_id not in INJECTIVE_DERIVATIVE_MARKETS.values():
        raise ValueError("Unsupported Injective market id.")
    if direction not in {"buy", "sell"}:
        raise ValueError("Injective order direction must be buy or sell.")
    if float(quantity or 0) <= 0:
        raise ValueError("Injective order quantity must be greater than zero.")
    if float(price or 0) < 0:
        raise ValueError("Injective order price cannot be negative.")
    if leverage is not None and Decimal(str(leverage)) <= 0:
        raise ValueError("Injective order leverage must be greater than zero.")


def build_order_preview(asset, direction, quantity, price, leverage, notional, source_platform):
    market_id = get_derivative_market_id(asset)
    validate_order_params(market_id, direction, quantity, price, leverage)
    return {
        "venue": "injective",
        "asset": asset,
        "market_id": market_id,
        "side": direction,
        "quantity": quantity,
        "price": price,
        "leverage": float(leverage),
        "notional": round(float(notional), 2),
        "source_platform": source_platform,
    }


async def _demo_execute(market_id, direction, quantity, price) -> dict:
    await asyncio.sleep(1.2)
    import hashlib
    import time

    fake_hash = "0x" + hashlib.sha256(
        f"{market_id}{direction}{quantity}{price}{time.time()}".encode()
    ).hexdigest()
    return {
        "success": True,
        "tx_hash": fake_hash,
        "explorer_url": EXPLORER_BASE + fake_hash,
        "demo": True,
        "venue": "injective",
    }


async def _mock_positions(wallet_address: str, demo_config: Optional[dict] = None) -> list:
    config = build_demo_position_config(demo_config)
    market = await get_demo_market(config["market_id"])
    symbol = market.get("symbol") or config["symbol"]
    entry_price = config["entry_price"]
    direction = config["direction"]
    leverage = config["leverage"]
    margin_used = config["margin_used"]
    market_id = config["market_id"]
    subaccount_id = config["subaccount_id"]
    maintenance_margin_ratio = float(market.get("maintenance_margin_ratio") or DEMO_MAINTENANCE_MARGIN_RATE)
    initial_margin_ratio = float(market.get("initial_margin_ratio") or 0)

    current_price = entry_price
    reference_price = None
    injective_mark_price = entry_price
    best_bid_price = entry_price
    best_ask_price = entry_price
    price_source = "unavailable"
    try:
        quote = await get_demo_market_price(market_id, market)
        injective_mark_price = float(quote["price"])
        best_bid_price = float(quote.get("best_bid_price") or current_price)
        best_ask_price = float(quote.get("best_ask_price") or current_price)
    except Exception as exc:
        logger.warning("Injective demo market price lookup failed for %s: %s", symbol, exc)

    try:
        reference_quote = await market_price_service.get_price(symbol)
        reference_price = float(reference_quote["price"])
        current_price = reference_price
        price_source = reference_quote.get("source") or "reference"
    except Exception as exc:
        logger.warning("Reference market price lookup failed for %s: %s", symbol, exc)
        current_price = injective_mark_price or current_price
        price_source = "unavailable"

    entry_notional = margin_used * leverage
    quantity = entry_notional / entry_price if entry_price else 0.0
    reference_signed_price_delta = ((reference_price if reference_price is not None else 0.0) - entry_price) * (1 if direction == "long" else -1)
    injective_signed_price_delta = (injective_mark_price - entry_price) * (1 if direction == "long" else -1)
    unrealized_pnl_value_reference = quantity * reference_signed_price_delta if reference_price is not None else None
    unrealized_pnl_pct_reference = ((unrealized_pnl_value_reference / margin_used * 100) if margin_used and unrealized_pnl_value_reference is not None else None)
    unrealized_pnl_value_injective = quantity * injective_signed_price_delta
    unrealized_pnl_pct_injective = (unrealized_pnl_value_injective / margin_used * 100) if margin_used else 0.0
    liquidation_price = estimate_liquidation_price(entry_price, leverage, direction, maintenance_margin_ratio)
    current_notional = quantity * (reference_price if reference_price is not None else injective_mark_price)

    return [{
        "platform": "injective",
        "mode": "demo",
        "market_id": market_id,
        "ticker": market.get("ticker"),
        "market_category": market.get("category"),
        "subaccount_id": subaccount_id,
        "symbol": symbol,
        "direction": direction,
        "size": round(current_notional, 4),
        "leverage": round(leverage, 2),
        "entry_price": round(entry_price, 4),
        "current_price": round(current_price, 4),
        "unrealized_pnl_pct": round(unrealized_pnl_pct_reference, 2) if unrealized_pnl_pct_reference is not None else round(unrealized_pnl_pct_injective, 2),
        "unrealized_pnl_value": round(unrealized_pnl_value_reference, 4) if unrealized_pnl_value_reference is not None else round(unrealized_pnl_value_injective, 4),
        "margin_used": round(margin_used, 4),
        "liquidation_price": round(liquidation_price, 4),
        "liquidation_distance_pct": round(abs(current_price - liquidation_price) / current_price * 100, 2) if current_price else 99,
        "mark_price_source": "injective-indexer",
        "reference_price_source": price_source,
        "reference_price": round(reference_price, 4) if reference_price is not None else None,
        "liquidation_estimated": True,
        "initial_margin_ratio": round(initial_margin_ratio, 6),
        "maintenance_margin_ratio": round(maintenance_margin_ratio, 6),
        "best_bid_price": round(best_bid_price, 4),
        "best_ask_price": round(best_ask_price, 4),
        "injective_mark_price": round(injective_mark_price, 4),
        "unrealized_pnl_value_reference": round(unrealized_pnl_value_reference, 4) if unrealized_pnl_value_reference is not None else None,
        "unrealized_pnl_pct_reference": round(unrealized_pnl_pct_reference, 2) if unrealized_pnl_pct_reference is not None else None,
        "unrealized_pnl_value_injective": round(unrealized_pnl_value_injective, 4),
        "unrealized_pnl_pct_injective": round(unrealized_pnl_pct_injective, 2),
    }]


def build_demo_position_config(raw_config: Optional[dict] = None) -> dict:
    config = {**DEFAULT_DEMO_POSITION, **(raw_config or {})}
    market_id = str(config.get("market_id") or "").strip() or DEFAULT_DEMO_POSITION["market_id"]
    symbol = market_price_service.normalize_symbol(config.get("symbol"))
    direction = str(config.get("direction") or "long").strip().lower()
    if direction not in {"long", "short"}:
        raise ValueError("Demo direction must be long or short.")

    margin_used = float(config.get("margin_used") or 0)
    entry_price = float(config.get("entry_price") or 0)
    leverage = float(config.get("leverage") or 0)
    if margin_used <= 0:
        raise ValueError("Demo margin_used must be greater than zero.")
    if entry_price <= 0:
        raise ValueError("Demo entry_price must be greater than zero.")
    if leverage <= 0:
        raise ValueError("Demo leverage must be greater than zero.")

    return {
        "market_id": market_id,
        "symbol": symbol,
        "direction": direction,
        "margin_used": margin_used,
        "entry_price": entry_price,
        "leverage": leverage,
        "subaccount_id": str(config.get("subaccount_id") or "demo-subaccount-0"),
    }


def estimate_liquidation_price(entry_price: float, leverage: float, direction: str, maintenance_margin_ratio: float) -> float:
    maintenance = maintenance_margin_ratio or DEMO_MAINTENANCE_MARGIN_RATE
    if direction == "long":
        denominator = max(1 - maintenance, 0.01)
        return max(entry_price * (1 - 1 / leverage) / denominator, 0.01)
    return entry_price * (1 + 1 / leverage) / (1 + maintenance)


async def list_demo_markets() -> list:
    now = time.time()
    if _market_cache["expires_at"] > now and _market_cache["markets"]:
        return _market_cache["markets"]

    client = _get_client(HELIX_MARKET_NETWORK)
    if not client:
        return list(BUILTIN_DEMO_MARKETS.values())

    try:
        payload = await client.fetch_derivative_markets(market_statuses=["active"])
        raw_markets = payload.get("markets") or []
        markets = []
        for market in raw_markets:
            if not market.get("isPerpetual"):
                continue
            item = normalize_demo_market(market)
            markets.append(item)
            _market_lookup_cache[item["market_id"]] = item
        markets.sort(key=lambda item: item["ticker"])
        _market_cache["markets"] = markets
        _market_cache["expires_at"] = now + INJECTIVE_MARKET_CACHE_TTL
        return markets
    except Exception as exc:
        logger.warning("Injective demo market list lookup failed: %s", exc)
        fallback_markets = _market_cache.get("markets") or list(BUILTIN_DEMO_MARKETS.values())
        _market_cache["markets"] = fallback_markets
        return fallback_markets
    finally:
        await _close_client(client)


async def get_demo_market(market_id: str) -> dict:
    cached = _market_lookup_cache.get(market_id)
    if cached:
        return cached

    for market in await list_demo_markets():
        if market["market_id"] == market_id:
            return market

    fallback_asset = market_id_to_asset(market_id)
    return {
        "market_id": market_id,
        "ticker": f"{fallback_asset}/USDT PERP",
        "symbol": f"{fallback_asset}/USDT",
        "initial_margin_ratio": 0.05,
        "maintenance_margin_ratio": DEMO_MAINTENANCE_MARGIN_RATE,
        "maker_fee_rate": -0.00005,
        "taker_fee_rate": 0.0005,
        "quote_symbol": "USDT",
        "oracle_scale_factor": 6,
    }


async def get_demo_market_price(market_id: str, market: Optional[dict] = None) -> dict:
    client = _get_client(DEMO_MARKET_PRICE_NETWORK)
    if not client:
        raise ValueError("Injective client unavailable")

    market = market or await get_demo_market(market_id)
    try:
        payload = await client.fetch_derivative_mid_price_and_tob(market_id)
        quote_decimals = int(market.get("quote_decimals") or 6)
        oracle_scale_factor = int(market.get("oracle_scale_factor") or 6)
        mid_price = _from_chain_price(payload.get("midPrice"), quote_decimals=quote_decimals, oracle_scale_factor=oracle_scale_factor)
        best_bid_price = _from_chain_price(payload.get("bestBuyPrice"), quote_decimals=quote_decimals, oracle_scale_factor=oracle_scale_factor)
        best_ask_price = _from_chain_price(payload.get("bestSellPrice"), quote_decimals=quote_decimals, oracle_scale_factor=oracle_scale_factor)
        return {
            "price": mid_price or best_bid_price or best_ask_price,
            "best_bid_price": best_bid_price,
            "best_ask_price": best_ask_price,
            "source": "injective-indexer",
        }
    finally:
        await _close_client(client)


async def get_demo_market_preview(market_id: str) -> dict:
    market = await get_demo_market(market_id)
    reference_price = None
    reference_price_source = None
    injective_mid = None
    best_bid = None
    best_ask = None

    try:
        reference_quote = await market_price_service.get_price(market.get("symbol") or market.get("ticker") or "")
        reference_price = reference_quote.get("price")
        reference_price_source = reference_quote.get("source")
    except Exception as exc:
        logger.warning("Preview reference price lookup failed for %s: %s", market_id, exc)

    try:
        injective_quote = await get_demo_market_price(market_id, market)
        injective_mid = injective_quote.get("price")
        best_bid = injective_quote.get("best_bid_price")
        best_ask = injective_quote.get("best_ask_price")
    except Exception as exc:
        logger.warning("Preview injective mid lookup failed for %s: %s", market_id, exc)

    return {
        "market_id": market.get("market_id"),
        "ticker": market.get("ticker"),
        "symbol": market.get("symbol"),
        "category": market.get("category"),
        "reference_price": reference_price,
        "reference_price_source": reference_price_source,
        "injective_mark_price": injective_mid,
        "best_bid_price": best_bid,
        "best_ask_price": best_ask,
        "initial_margin_ratio": market.get("initial_margin_ratio"),
        "maintenance_margin_ratio": market.get("maintenance_margin_ratio"),
    }


def normalize_demo_market(market: dict) -> dict:
    ticker = market.get("ticker") or "UNKNOWN PERP"
    symbol = ticker.replace(" PERP", "")
    quote_meta = market.get("quoteTokenMeta") or {}
    return {
        "market_id": market.get("marketId"),
        "ticker": ticker,
        "symbol": symbol,
        "category": classify_market_category(ticker),
        "quote_symbol": quote_meta.get("symbol") or "USDT",
        "quote_decimals": int(quote_meta.get("decimals") or 6),
        "oracle_scale_factor": int(market.get("oracleScaleFactor") or 6),
        "initial_margin_ratio": float(market.get("initialMarginRatio") or 0),
        "maintenance_margin_ratio": float(market.get("maintenanceMarginRatio") or 0),
        "maker_fee_rate": float(market.get("makerFeeRate") or 0),
        "taker_fee_rate": float(market.get("takerFeeRate") or 0),
        "min_price_tick_size": market.get("minPriceTickSize"),
        "min_quantity_tick_size": market.get("minQuantityTickSize"),
        "is_perpetual": bool(market.get("isPerpetual")),
    }


def market_id_to_asset(market_id: str) -> str:
    for asset, known_market_id in INJECTIVE_DERIVATIVE_MARKETS.items():
        if known_market_id == market_id:
            return asset
    return "BTC"


def classify_market_category(ticker: str) -> str:
    value = str(ticker or "").upper()
    if any(token in value for token in ["AAPL", "TSLA", "NVDA", "META", "AMZN", "MSFT", "GOOG", "PLTR", "MSTR", "COIN", "HOOD", "CRCL"]):
        return "rwa_stocks"
    if "INDEX" in value:
        return "indices"
    if any(token in value for token in ["XAU", "XAG", "GOLD", "SILVER", "OIL"]):
        return "commodities"
    if any(token in value for token in ["GBP", "EUR", "JPY", "AUD", "CHF", "CAD"]):
        return "fx"
    return "crypto"


def _from_chain_price(value, quote_decimals=6, oracle_scale_factor=6):
    if value in (None, "", 0, "0"):
        return 0.0
    try:
        number = Decimal(str(value))
    except Exception:
        return 0.0
    scale = Decimal(10) ** int(18 + oracle_scale_factor)
    return float(number / scale)


def validate_wallet_address(wallet_address: str) -> None:
    raw = (wallet_address or "").strip()
    if not raw:
        raise ValueError("Injective wallet address is required")
    if raw.startswith("inj"):
        return
    if raw.startswith("0x") and len(raw) == 42:
        return
    if len(raw) == 40:
        return
    raise ValueError("Unsupported Injective wallet address format")


def _wallet_to_subaccount_id(wallet_address, address_cls):
    validate_wallet_address(wallet_address)
    raw = wallet_address.strip()
    if raw.startswith("inj"):
        return address_cls.from_acc_bech32(raw).get_subaccount_id(index=0)
    if raw.startswith("0x"):
        return raw.lower() + "0" * 24
    if len(raw) == 40:
        return "0x" + raw.lower() + "0" * 24
    raise ValueError("unsupported Injective wallet address format")


def _coerce_position(position):
    if isinstance(position, dict):
        nested = position.get("position")
        if isinstance(nested, dict):
            merged = dict(nested)
            merged.setdefault("market_id", position.get("market_id") or position.get("marketId"))
            return merged
        return position

    nested = getattr(position, "position", None)
    if nested is not None:
        data = vars(nested).copy()
        data["market_id"] = getattr(position, "market_id", None)
        return data
    return vars(position)


def _to_float(value):
    if value in (None, "", "0", 0):
        return 0.0
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0

    if abs(number) >= 1e12:
        return number / 1e18
    return number


def _to_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).lower() in {"1", "true", "yes", "long"}


def _lookup(payload, *path, default=None):
    current = payload
    for key in path:
        if isinstance(current, dict):
            current = current.get(key, default)
        else:
            current = getattr(current, key, default)
        if current is default:
            break
    return current


async def _close_client(client):
    for closer in ("close_chain_channel", "close_exchange_channel", "close_chain_stream_channel"):
        method = getattr(client, closer, None)
        if method is None:
            continue
        try:
            result = method()
            if asyncio.iscoroutine(result):
                await result
        except Exception:
            pass


def _load_derivative_market(market_id, network_name, derivative_market_cls, token_cls):
    from configparser import NoSectionError
    from pyinjective.constant import CONFIGS

    config = CONFIGS.get(network_name)
    if config is None:
        raise ValueError(f"unsupported Injective network config: {network_name}")

    try:
        quote_decimals = int(config[market_id]["quote"])
        min_price_tick_size = Decimal(str(config[market_id]["min_price_tick_size"]))
        min_quantity_tick_size = Decimal(str(config[market_id]["min_quantity_tick_size"]))
        description = config[market_id].get("description", market_id)
    except KeyError as exc:
        raise ValueError(f"unknown Injective market id: {market_id}") from exc
    except NoSectionError as exc:
        raise ValueError(f"missing Injective market config for: {market_id}") from exc

    quote_symbol = "USDT" if "USDT" in description else "USDC"
    quote_token = token_cls(
        name=quote_symbol,
        symbol=quote_symbol,
        denom=quote_symbol.lower(),
        address="",
        decimals=quote_decimals,
        logo="",
        updated=0,
    )

    ticker = description.replace("Testnet Derivative ", "").replace("Mainnet Derivative ", "").strip("'")
    return derivative_market_cls(
        id=market_id,
        status="active",
        ticker=ticker,
        oracle_base=ticker.split("/")[0] if "/" in ticker else ticker,
        oracle_quote=quote_symbol,
        oracle_type="pyth",
        oracle_scale_factor=0,
        initial_margin_ratio=Decimal("0.1"),
        maintenance_margin_ratio=Decimal("0.05"),
        quote_token=quote_token,
        maker_fee_rate=Decimal("0"),
        taker_fee_rate=Decimal("0"),
        service_provider_fee=Decimal("0"),
        min_price_tick_size=min_price_tick_size,
        min_quantity_tick_size=min_quantity_tick_size,
    )
