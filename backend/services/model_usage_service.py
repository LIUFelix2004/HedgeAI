from collections import defaultdict


PRICE_PER_M_TOKEN = {
    "claude": 9.0,
    "gpt4o": 5.0,
    "deepseek": 1.0,
    "grok": 5.0,
}

_usage = defaultdict(lambda: {
    "calls": 0,
    "success": 0,
    "failure": 0,
    "estimated_tokens": 0,
    "estimated_cost_usd": 0.0,
})


def estimate_tokens(text):
    return max(int(len(text or "") / 4), 1)


def estimate_cost(model, tokens):
    return round((tokens / 1_000_000) * PRICE_PER_M_TOKEN.get(model, 5.0), 6)


def record_model_usage(model, status, text=""):
    key = model or "unknown"
    tokens = estimate_tokens(text)
    bucket = _usage[key]
    bucket["calls"] += 1
    if status == "success":
        bucket["success"] += 1
    else:
        bucket["failure"] += 1
    bucket["estimated_tokens"] += tokens
    bucket["estimated_cost_usd"] = round(bucket["estimated_cost_usd"] + estimate_cost(key, tokens), 6)
    return dict(bucket)


def list_model_usage():
    return {model: dict(stats) for model, stats in _usage.items()}


def clear_model_usage():
    _usage.clear()
