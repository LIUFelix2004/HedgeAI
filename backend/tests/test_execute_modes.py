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


class ExecuteModesTest(unittest.TestCase):
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
                    "size": 5400,
                    "leverage": 10,
                    "current_price": 83500,
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
    def test_real_mode_requires_confirmation(self, mock_execute_order):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "real", "confirmed": False},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("confirm", data["error"].lower())
        mock_execute_order.assert_not_called()

    @patch("routers.hedge.injective_service.execute_order")
    def test_dry_run_returns_preview_steps_without_real_execution(self, mock_execute_order):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "dry_run", "confirmed": False},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "dry_run")
        self.assertGreaterEqual(len(data["steps"]), 3)
        self.assertIn("preview", data["summary"].lower())
        mock_execute_order.assert_not_called()

    @patch("routers.hedge.injective_service.execute_order")
    def test_demo_mode_returns_simulated_steps_without_real_execution(self, mock_execute_order):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "demo"},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "demo")
        self.assertIn("demo", data["summary"].lower())
        self.assertGreaterEqual(len(data["steps"]), 3)
        mock_execute_order.assert_not_called()

    @patch("routers.hedge.polymarket_service.place_order")
    def test_real_polymarket_mode_does_not_use_demo_token(self, mock_place_order):
        strategy = {
            **self.strategy,
            "type": "POLYMARKET",
            "title": "BTC event hedge",
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": strategy, "mode": "real", "confirmed": True},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("dry-run", data["error"])
        mock_place_order.assert_not_called()

    @patch("routers.hedge.injective_service.execute_order")
    def test_real_options_mode_is_blocked_until_supported(self, mock_execute_order):
        strategy = {
            **self.strategy,
            "type": "OPTIONS",
            "title": "BTC options hedge",
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": strategy, "mode": "real", "confirmed": True},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("dry-run", data["error"])
        mock_execute_order.assert_not_called()

    @patch("routers.hedge.injective_service.execute_order")
    def test_real_reverse_hedge_confirmed_calls_real_service_without_demo(self, mock_execute_order):
        mock_execute_order.return_value = {
            "success": True,
            "tx_hash": "0xabc",
            "explorer_url": "https://explorer.example/0xabc",
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "real", "confirmed": True},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "real")
        mock_execute_order.assert_called_once()
        self.assertFalse(mock_execute_order.call_args.kwargs["allow_demo"])


if __name__ == "__main__":
    unittest.main()
