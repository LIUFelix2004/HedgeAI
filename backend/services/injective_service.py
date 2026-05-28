"""
Injective blockchain service.
Handles: position reads, real order execution, explorer links.
"""
import asyncio
import logging
import os
from decimal import Decimal
from typing import Optional

logger = logging.getLogger(__name__)

NETWORK = os.getenv("INJECTIVE_NETWORK", "testnet")
DEFAULT_EXECUTION_LEVERAGE = Decimal(os.getenv("INJECTIVE_EXECUTION_LEVERAGE", "5"))
ALLOW_DEMO_EXECUTION = os.getenv("INJECTIVE_ALLOW_DEMO_EXECUTION", "").lower() in {"1", "true", "yes"}
EXPLORER_BASE = (
    "https://testnet.explorer.injective.network/transaction/"
    if NETWORK == "testnet"
    else "https://explorer.injective.network/transaction/"
)


def _get_client():
    try:
        from pyinjective.async_client import AsyncClient
        from pyinjective.core.network import Network

        network = Network.testnet() if NETWORK == "testnet" else Network.mainnet()
        return AsyncClient(network)
    except ImportError:
        logger.warning("injective-py not installed")
        return None


async def get_positions(wallet_address: str) -> list:
    """Fetch open derivative positions for a wallet."""
    if (wallet_address or "").strip().lower() == "demo":
        return _mock_positions(wallet_address)

    validate_wallet_address(wallet_address)

    client = _get_client()
    if not client:
        return []

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


def _mock_positions(wallet_address: str) -> list:
    return [{
        "platform": "injective",
        "mode": "demo",
        "symbol": "BTC/USDT",
        "direction": "long",
        "size": 5400,
        "leverage": 10,
        "entry_price": 90000,
        "current_price": 83500,
        "unrealized_pnl_pct": -8.3,
        "margin_used": 540,
        "liquidation_price": 80000,
        "liquidation_distance_pct": 4.2,
    }]


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
