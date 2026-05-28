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
from services import injective_service  # noqa: E402


class InjectiveExecutionHardeningTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)
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
                    "liquidation_distance_pct": 9,
                }
            ],
            "expires_at": time.time() + 3600,
        }
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-real",
            "creds": {"privateKey": "real-secret"},
            "positions": [],
            "expires_at": time.time() + 3600,
        }
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
            "execution_venue": "injective",
        }

    def test_dry_run_reverse_hedge_returns_injective_order_preview(self):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "dry_run"},
        )

        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "dry_run")
        self.assertEqual(data["order_preview"]["venue"], "injective")
        self.assertEqual(data["order_preview"]["asset"], "BTC")
        self.assertEqual(data["order_preview"]["side"], "sell")
        self.assertIn("market_id", data["order_preview"])
        self.assertGreater(data["order_preview"]["quantity"], 0)

    @patch("routers.hedge.injective_service.execute_order")
    def test_unknown_injective_market_is_blocked_before_service_call(self, mock_execute_order):
        _sessions["hyperliquid"]["positions"][0]["symbol"] = "DOGE/USDT"
        strategy = {
            **self.strategy,
            "title": "DOGE reverse hedge",
            "description": "Hedge DOGE exposure",
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={
                "strategy": strategy,
                "mode": "real",
                "confirmed": True,
                "idempotency_key": f"unknown-market-{time.time()}",
            },
        )

        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("unsupported", data["error"].lower())
        mock_execute_order.assert_not_called()

    @patch("routers.hedge.injective_service.execute_order")
    def test_real_injective_execution_returns_raw_response_summary(self, mock_execute_order):
        mock_execute_order.return_value = {
            "success": True,
            "tx_hash": "0xabc",
            "explorer_url": "https://explorer.example/0xabc",
            "raw_response": {"txResponse": {"code": 0}},
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={
                "strategy": self.strategy,
                "mode": "real",
                "confirmed": True,
                "idempotency_key": f"raw-response-{time.time()}",
            },
        )

        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["raw_response"], {"txResponse": {"code": 0}})

    def test_injective_order_param_validation_rejects_bad_values(self):
        with self.assertRaises(ValueError):
            injective_service.validate_order_params("bad-market", "buy", 1, 0)
        with self.assertRaises(ValueError):
            injective_service.validate_order_params(
                injective_service.get_derivative_market_id("BTC"), "hold", 1, 0
            )
        with self.assertRaises(ValueError):
            injective_service.validate_order_params(
                injective_service.get_derivative_market_id("BTC"), "buy", 0, 0
            )


if __name__ == "__main__":
    unittest.main()
