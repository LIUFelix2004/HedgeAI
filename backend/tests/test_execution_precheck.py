import os
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.accounts import _sessions  # noqa: E402


class ExecutionPrecheckTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)
        self.strategy = {
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
        }
        _sessions["hyperliquid"] = {
            "connected": True,
            "platform": "hyperliquid",
            "address": "0xsource",
            "creds": {"address": "0xsource"},
            "positions": [
                {
                    "platform": "hyperliquid",
                    "symbol": "BTC/USDT",
                    "direction": "long",
                    "size": 5000,
                    "leverage": 10,
                    "current_price": 93000,
                    "liquidation_distance_pct": 9.5,
                }
            ],
        }
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-real",
            "creds": {"privateKey": "real-secret"},
            "positions": [],
        }

    @patch("routers.hedge.injective_service.execute_order")
    def test_real_execution_requires_idempotency_key(self, mock_execute_order):
        resp = self.client.post(
            "/api/hedge/execute",
            json={
                "strategy": self.strategy,
                "mode": "real",
                "confirmed": True,
            },
        )

        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("idempotency", data["error"].lower())
        mock_execute_order.assert_not_called()

    @patch("routers.hedge.injective_service.execute_order")
    def test_duplicate_real_execution_idempotency_key_is_blocked(self, mock_execute_order):
        mock_execute_order.return_value = {"success": True, "tx_hash": "0xabc"}
        payload = {
            "strategy": self.strategy,
            "mode": "real",
            "confirmed": True,
            "idempotency_key": "same-request",
        }

        first = self.client.post("/api/hedge/execute", json=payload)
        second = self.client.post("/api/hedge/execute", json=payload)

        self.assertTrue(first.json()["success"])
        self.assertFalse(second.json()["success"])
        self.assertEqual(second.json()["execution_mode"], "blocked")
        self.assertIn("duplicate", second.json()["error"].lower())
        mock_execute_order.assert_called_once()

    @patch("routers.hedge.injective_service.execute_order")
    def test_real_execution_blocks_order_notional_above_limit(self, mock_execute_order):
        _sessions["hyperliquid"]["positions"][0]["size"] = 1_000_000

        resp = self.client.post(
            "/api/hedge/execute",
            json={
                "strategy": self.strategy,
                "mode": "real",
                "confirmed": True,
                "idempotency_key": "oversized-request",
            },
        )

        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("notional", data["error"].lower())
        mock_execute_order.assert_not_called()


if __name__ == "__main__":
    unittest.main()
