import json
import os
import sqlite3
import sys
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.accounts import _persist_sessions, _sessions  # noqa: E402
from services.audit_service import clear_audit_events  # noqa: E402
from services.sqlite_service import DB_PATH, clear_sessions  # noqa: E402
from services.strategy_history_service import clear_strategy_history  # noqa: E402


class PersistenceTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        clear_sessions()
        clear_audit_events()
        clear_strategy_history()
        self.client = TestClient(app)

    def test_session_snapshot_persists_without_sensitive_credentials(self):
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-real",
            "creds": {"address": "inj-real", "privateKey": "secret"},
            "positions": [{"symbol": "BTC/USDT"}],
            "trading_enabled": True,
            "mode": "real",
            "connected_at": 1,
            "last_seen_at": 2,
            "expires_at": 9999999999,
        }

        _persist_sessions()

        with sqlite3.connect(DB_PATH) as conn:
            row = conn.execute("SELECT payload_json FROM sessions WHERE platform = 'injective'").fetchone()

        payload = json.loads(row[0])
        self.assertNotIn("creds", payload)
        self.assertFalse(payload["trading_enabled"])
        self.assertTrue(payload["restored_without_credentials"])

    def test_execute_persists_audit_and_strategy_history_rows(self):
        strategy = {
            "id": "A",
            "type": "REVERSE_HEDGE",
            "title": "BTC reverse hedge",
            "description": "Hedge BTC exposure",
            "hedge_ratio": "40%",
            "estimated_cost": "low",
            "complexity": "low",
            "pros": "fast",
            "cons": "cost",
            "injective_action": "preview",
            "execution_venue": "injective",
        }

        resp = self.client.post("/api/hedge/execute", json={"strategy": strategy, "mode": "demo"})
        self.assertEqual(resp.status_code, 200)

        with sqlite3.connect(DB_PATH) as conn:
            audit_row = conn.execute("SELECT payload_json FROM audit_events ORDER BY id DESC LIMIT 1").fetchone()
            history_row = conn.execute("SELECT payload_json FROM strategy_history ORDER BY id DESC LIMIT 1").fetchone()

        self.assertIsNotNone(audit_row)
        self.assertIsNotNone(history_row)
        self.assertIn(resp.json()["audit_id"], audit_row[0])
        self.assertIn(resp.json()["audit_id"], history_row[0])


if __name__ == "__main__":
    unittest.main()
