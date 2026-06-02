import logging

import httpx

logger = logging.getLogger(__name__)

BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/price"
COINGECKO_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price"
YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
STOOQ_QUOTE_URL = "https://stooq.com/q/l/"
COINGECKO_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "INJ": "injective-protocol",
    "SOL": "solana",
}
YAHOO_QUOTES = {
    "AAPL": ("AAPL", False),
    "TSLA": ("TSLA", False),
    "NVDA": ("NVDA", False),
    "META": ("META", False),
    "AMZN": ("AMZN", False),
    "MSFT": ("MSFT", False),
    "GOOG": ("GOOG", False),
    "PLTR": ("PLTR", False),
    "MSTR": ("MSTR", False),
    "COIN": ("COIN", False),
    "HOOD": ("HOOD", False),
    "CRCL": ("CRCL", False),
    "GBP": ("GBPUSD=X", False),
    "EUR": ("EURUSD=X", False),
    "JPY": ("USDJPY=X", True),
    "XAU": ("GC=F", False),
    "GOLD": ("GC=F", False),
    "XAG": ("SI=F", False),
    "SILVER": ("SI=F", False),
}
STOOQ_QUOTES = {
    "AAPL": "aapl.us",
    "TSLA": "tsla.us",
    "NVDA": "nvda.us",
    "META": "meta.us",
    "AMZN": "amzn.us",
    "MSFT": "msft.us",
    "GOOG": "goog.us",
    "GOOGL": "googl.us",
    "PLTR": "pltr.us",
    "MSTR": "mstr.us",
    "COIN": "coin.us",
    "HOOD": "hood.us",
    "CRCL": "crcl.us",
}


def normalize_symbol(raw_symbol: str) -> str:
    raw = (raw_symbol or "BTC/USDT").strip().upper()
    raw = raw.replace("-", "/").replace("_", "/")
    if "/" not in raw:
        if raw.endswith("USDT"):
            return f"{raw[:-4]}/USDT"
        return f"{raw}/USDT"
    base, quote = raw.split("/", 1)
    return f"{base}/{quote or 'USDT'}"


def to_binance_symbol(symbol: str) -> str:
    normalized = normalize_symbol(symbol)
    return normalized.replace("/", "")


def base_asset(symbol: str) -> str:
    return normalize_symbol(symbol).split("/", 1)[0]


async def get_price(symbol: str) -> dict:
    normalized = normalize_symbol(symbol)
    asset = base_asset(normalized)

    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            response = await client.get(
                BINANCE_TICKER_URL,
                params={"symbol": to_binance_symbol(normalized)},
            )
            response.raise_for_status()
            data = response.json()
            return {
                "symbol": normalized,
                "price": float(data["price"]),
                "source": "binance",
            }
        except Exception as exc:
            logger.warning("Binance price lookup failed for %s: %s", normalized, exc)

        coin_id = COINGECKO_IDS.get(asset)
        if coin_id:
            try:
                response = await client.get(
                    COINGECKO_PRICE_URL,
                    params={"ids": coin_id, "vs_currencies": "usd"},
                )
                response.raise_for_status()
                data = response.json()
                price = float(data[coin_id]["usd"])
                return {
                    "symbol": normalized,
                    "price": price,
                    "source": "coingecko",
                }
            except Exception as exc:
                logger.warning("CoinGecko price lookup failed for %s: %s", normalized, exc)

        yahoo_quote = YAHOO_QUOTES.get(asset)
        if yahoo_quote:
            yahoo_symbol, invert = yahoo_quote
            try:
                response = await client.get(
                    YAHOO_CHART_URL.format(symbol=yahoo_symbol),
                    params={"interval": "1d", "range": "1d"},
                )
                response.raise_for_status()
                data = response.json()
                result = (((data.get("chart") or {}).get("result") or [None])[0] or {})
                meta = result.get("meta") or {}
                price = float(meta.get("regularMarketPrice") or meta.get("previousClose"))
                if invert and price:
                    price = 1 / price
                return {
                    "symbol": normalized,
                    "price": price,
                    "source": "yahoo",
                }
            except Exception as exc:
                logger.warning("Yahoo price lookup failed for %s via %s: %s", normalized, yahoo_symbol, exc)

        stooq_symbol = STOOQ_QUOTES.get(asset)
        if stooq_symbol:
            try:
                response = await client.get(
                    STOOQ_QUOTE_URL,
                    params={"s": stooq_symbol, "i": "d"},
                )
                response.raise_for_status()
                row = response.text.strip().splitlines()[0]
                parts = [item.strip() for item in row.split(",")]
                price = float(parts[6])
                return {
                    "symbol": normalized,
                    "price": price,
                    "source": "stooq",
                }
            except Exception as exc:
                logger.warning("Stooq price lookup failed for %s via %s: %s", normalized, stooq_symbol, exc)

    raise ValueError(f"Unable to load market price for {normalized}")
