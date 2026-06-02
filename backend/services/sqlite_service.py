import json
import os
import sqlite3
import threading
import time
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = Path(os.getenv("HEDGEAI_DB_PATH", str(DATA_DIR / "hedgeai.db")))
_LOCK = threading.RLock()


def _ensure_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                platform TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                expires_at REAL,
                updated_at REAL NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                audit_id TEXT,
                ts REAL NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS strategy_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                audit_id TEXT,
                ts REAL NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events(ts DESC)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_strategy_history_ts ON strategy_history(ts DESC)")
        conn.commit()


def _connect():
    _ensure_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def load_sessions(now_ts=None):
    now_ts = now_ts or time.time()
    with _LOCK, _connect() as conn:
        rows = conn.execute(
            "SELECT platform, payload_json, expires_at FROM sessions WHERE expires_at IS NULL OR expires_at > ?",
            (now_ts,),
        ).fetchall()
    result = {}
    for row in rows:
        try:
            result[row["platform"]] = json.loads(row["payload_json"])
        except json.JSONDecodeError:
            continue
    return result


def upsert_session(platform, payload, expires_at=None):
    payload_json = json.dumps(payload, ensure_ascii=False)
    with _LOCK, _connect() as conn:
        conn.execute(
            """
            INSERT INTO sessions(platform, payload_json, expires_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(platform) DO UPDATE SET
                payload_json=excluded.payload_json,
                expires_at=excluded.expires_at,
                updated_at=excluded.updated_at
            """,
            (platform, payload_json, expires_at, time.time()),
        )
        conn.commit()


def delete_session(platform):
    with _LOCK, _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE platform = ?", (platform,))
        conn.commit()


def clear_sessions():
    with _LOCK, _connect() as conn:
        conn.execute("DELETE FROM sessions")
        conn.commit()


def append_audit_event(payload):
    payload_json = json.dumps(payload, ensure_ascii=False)
    with _LOCK, _connect() as conn:
        conn.execute(
            "INSERT INTO audit_events(audit_id, ts, payload_json) VALUES (?, ?, ?)",
            (payload.get("audit_id"), payload.get("ts", time.time()), payload_json),
        )
        conn.commit()


def list_audit_events(limit=100):
    with _LOCK, _connect() as conn:
        rows = conn.execute(
            "SELECT payload_json FROM audit_events ORDER BY ts ASC, id ASC LIMIT ?",
            (limit,),
        ).fetchall()
    items = []
    for row in rows:
        try:
            items.append(json.loads(row["payload_json"]))
        except json.JSONDecodeError:
            continue
    return items


def clear_audit_events():
    with _LOCK, _connect() as conn:
        conn.execute("DELETE FROM audit_events")
        conn.commit()


def append_strategy_history(payload):
    payload_json = json.dumps(payload, ensure_ascii=False)
    with _LOCK, _connect() as conn:
        conn.execute(
            "INSERT INTO strategy_history(audit_id, ts, payload_json) VALUES (?, ?, ?)",
            (payload.get("audit_id"), payload.get("ts", time.time()), payload_json),
        )
        conn.commit()


def list_strategy_history(limit=50):
    with _LOCK, _connect() as conn:
        rows = conn.execute(
            "SELECT payload_json FROM strategy_history ORDER BY ts DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    items = []
    for row in rows:
        try:
            items.append(json.loads(row["payload_json"]))
        except json.JSONDecodeError:
            continue
    return items


def clear_strategy_history():
    with _LOCK, _connect() as conn:
        conn.execute("DELETE FROM strategy_history")
        conn.commit()
