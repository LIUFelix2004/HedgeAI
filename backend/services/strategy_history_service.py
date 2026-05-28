import time


_history = []


def record_strategy_history(event):
    payload = {"ts": time.time(), **event}
    _history.insert(0, payload)
    return payload


def list_strategy_history(limit=50):
    return list(_history[:limit])


def clear_strategy_history():
    _history.clear()
