import os
import sys
import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.accounts import _sessions  # noqa: E402


class ExecutionPrecheckApiTest(unittest.TestCase):
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

    @patch("routers.hedge.hyperliquid_service.get_account_overview")
    def test_precheck_returns_balance_and_margin_checks(self, mock_overview):
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-source",
            "creds": {"address": "inj-source"},
            "positions": [{
                "platform": "injective",
                "symbol": "BTC/USDT",
                "direction": "long",
                "size": 5000,
                "leverage": 10,
                "current_price": 93000,
                "margin_used": 500,
                "liquidation_distance_pct": 9,
            }],
            "expires_at": time.time() + 3600,
        }
        _sessions["hyperliquid"] = {
            "connected": True,
            "platform": "hyperliquid",
            "address": "0xhedge",
            "creds": {"address": "0xhedge", "privateKey": "secret"},
            "positions": [],
            "expires_at": time.time() + 3600,
        }
        mock_overview.return_value = {
            "venue": "hyperliquid",
            "available_balance": 1000,
            "total_margin_used": 200,
            "account_value": 1200,
        }

        resp = self.client.post("/api/hedge/precheck", json={"strategy": self.strategy, "mode": "real"})
        data = resp.json()

        self.assertTrue(data["can_execute"])
        self.assertTrue(data["source_signature"])
        self.assertEqual(data["estimated_order"]["target_venue"], "hyperliquid")
        keys = {item["key"] for item in data["checks"]}
        self.assertIn("target_balance", keys)
        self.assertIn("target_margin", keys)

    @patch("routers.hedge.injective_service.execute_order")
    def test_real_execute_blocks_when_position_changed_after_precheck(self, mock_execute_order):
        _sessions["hyperliquid"] = {
            "connected": True,
            "platform": "hyperliquid",
            "address": "0xsource",
            "creds": {"address": "0xsource"},
            "positions": [{
                "platform": "hyperliquid",
                "symbol": "BTC/USDT",
                "direction": "long",
                "size": 5000,
                "leverage": 10,
                "current_price": 93000,
                "margin_used": 500,
                "liquidation_distance_pct": 9,
            }],
            "expires_at": time.time() + 3600,
        }
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-real",
            "creds": {"privateKey": "real-secret"},
            "account_summary": {"venue": "injective", "available_balance": None, "total_margin_used": None},
            "positions": [],
            "expires_at": time.time() + 3600,
        }

        precheck = self.client.post("/api/hedge/precheck", json={"strategy": self.strategy, "mode": "real"}).json()
        _sessions["hyperliquid"]["positions"][0]["size"] = 8000

        resp = self.client.post(
            "/api/hedge/execute",
            json={
                "strategy": self.strategy,
                "mode": "real",
                "confirmed": True,
                "idempotency_key": "changed-position-check",
                "precheck_signature": precheck["source_signature"],
            },
        )

        self.assertFalse(resp.json()["success"])
        self.assertEqual(resp.json()["error_code"], "POSITION_RECONFIRM_REQUIRED")
        mock_execute_order.assert_not_called()


if __name__ == "__main__":
    unittest.main()
