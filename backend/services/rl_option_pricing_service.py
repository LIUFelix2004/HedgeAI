"""
Lightweight option analysis adapted from the reinforcement-learning-option-pricing repo.

We reuse the Black-Scholes style pricing / Greeks intuition locally so HedgeAI can enrich
live option references without requiring a trained DQN checkpoint in production.
"""
from __future__ import annotations

import math

MODEL_SOURCE = "RL option pricing adaptation"

_CRYPTO_ASSETS = {"BTC", "ETH", "SOL", "DOGE", "XRP", "BNB", "ADA", "AVAX", "LINK", "INJ"}
_EQUITY_ASSETS = {"AAPL", "TSLA", "NVDA", "META", "AMZN", "MSFT", "GOOG", "GOOGL", "PLTR", "MSTR", "COIN", "HOOD", "CRCL"}
_FX_ASSETS = {"GBP", "EUR", "JPY", "AUD", "CHF", "CAD"}
_COMMODITY_ASSETS = {"XAU", "GOLD", "XAG", "SILVER", "OIL"}


def build_option_analysis(
    *,
    asset: str,
    option_type: str,
    current_price: float,
    strike: float,
    days_to_expiry: float,
    position_notional: float = 0.0,
    risk_free_rate: float = 0.02,
) -> dict:
    option_type = (option_type or "C").upper()
    price = max(float(current_price or 0), 1e-9)
    strike = max(float(strike or 0), 1e-9)
    days = max(float(days_to_expiry or 0), 1.0)
    time_to_expiry = max(days / 365.0, 1 / 365.0)
    sigma = _default_volatility(asset)

    call_price = _compute_call(price, strike, time_to_expiry, risk_free_rate, sigma)
    call_delta, gamma = _compute_call_greeks(price, strike, time_to_expiry, risk_free_rate, sigma)

    if option_type == "P":
        premium = _compute_put_from_call(call_price, price, strike, time_to_expiry, risk_free_rate)
        delta = call_delta - 1.0
        target_moneyness = 0.95
        target_delta = 0.25
    else:
        premium = call_price
        delta = call_delta
        target_moneyness = 1.05
        target_delta = 0.25

    intrinsic_value = max(strike - price, 0.0) if option_type == "P" else max(price - strike, 0.0)
    time_value = max(premium - intrinsic_value, 0.0)
    hedge_units = max(float(position_notional or 0.0) / price, 0.0)
    recommended_contracts = hedge_units / max(abs(delta), 0.05) if hedge_units > 0 else 0.0

    strike_gap = abs((strike / price) - target_moneyness)
    expiry_penalty = abs(days - 14.0) / 30.0
    delta_penalty = abs(abs(delta) - target_delta) / target_delta
    premium_penalty = min((premium / price) * 12.0, 1.5)
    gamma_bonus = min(gamma * price * 100.0, 0.5)

    score = 100.0 - (strike_gap * 160.0) - (expiry_penalty * 18.0) - (delta_penalty * 14.0) - (premium_penalty * 16.0) + (gamma_bonus * 6.0)

    return {
        "model_source": MODEL_SOURCE,
        "rl_policy_score": round(max(0.0, min(score, 100.0)), 1),
        "premium_estimate": round(premium, 2),
        "intrinsic_value": round(intrinsic_value, 2),
        "time_value": round(time_value, 2),
        "delta": round(delta, 4),
        "gamma": round(gamma, 6),
        "hedge_units": round(hedge_units, 4),
        "recommended_contracts": round(recommended_contracts, 2),
        "volatility_assumption": round(sigma, 2),
    }


def _default_volatility(asset: str) -> float:
    normalized = (asset or "").upper()
    if normalized in _CRYPTO_ASSETS:
        return 0.65
    if normalized in _EQUITY_ASSETS:
        return 0.38
    if normalized in _FX_ASSETS:
        return 0.12
    if normalized in _COMMODITY_ASSETS:
        return 0.22
    return 0.3


def _normal_cdf(value: float) -> float:
    return 0.5 * (1.0 + math.erf(value / math.sqrt(2.0)))


def _normal_pdf(value: float) -> float:
    return math.exp(-(value ** 2) / 2.0) / math.sqrt(2.0 * math.pi)


def _compute_d1(price: float, strike: float, time_to_expiry: float, risk_free_rate: float, sigma: float) -> float:
    numerator = math.log(price / strike) + (risk_free_rate + (sigma ** 2) / 2.0) * time_to_expiry
    denominator = sigma * math.sqrt(time_to_expiry)
    return numerator / denominator


def _compute_call(price: float, strike: float, time_to_expiry: float, risk_free_rate: float, sigma: float) -> float:
    if math.isclose(time_to_expiry, 0.0):
        return max(0.0, price - strike)
    d1 = _compute_d1(price, strike, time_to_expiry, risk_free_rate, sigma)
    d2 = d1 - sigma * math.sqrt(time_to_expiry)
    return (price * _normal_cdf(d1)) - (strike * math.exp(-risk_free_rate * time_to_expiry) * _normal_cdf(d2))


def _compute_put_from_call(call_price: float, price: float, strike: float, time_to_expiry: float, risk_free_rate: float) -> float:
    return call_price - price + (strike * math.exp(-risk_free_rate * time_to_expiry))


def _compute_call_greeks(price: float, strike: float, time_to_expiry: float, risk_free_rate: float, sigma: float) -> tuple[float, float]:
    if math.isclose(time_to_expiry, 0.0):
        return 1.0 if price >= strike else 0.0, 0.0
    d1 = _compute_d1(price, strike, time_to_expiry, risk_free_rate, sigma)
    delta = _normal_cdf(d1)
    gamma = _normal_pdf(d1) / (price * sigma * math.sqrt(time_to_expiry))
    return delta, gamma
