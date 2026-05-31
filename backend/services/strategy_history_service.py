import time

from services import sqlite_service


def record_strategy_history(event):
    payload = {"ts": time.time(), **event}
    sqlite_service.append_strategy_history(payload)
    return payload


def list_strategy_history(limit=50):
    return sqlite_service.list_strategy_history(limit=limit)


def clear_strategy_history():
    sqlite_service.clear_strategy_history()
