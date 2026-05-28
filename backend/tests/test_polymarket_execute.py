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


class PolymarketExecuteTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)
        _sessions["hyperliquid"] = {
            "connected": True,
            "platform": "hyperliquid",
            "positions": [
                {
                    "platform": "hyperliquid",
                    "symbol": "BTC/USDT",
                    "direction": "long",
                    "size": 5000,
                    "current_price": 93000,
                    "leverage": 10,
                }
            ],
        }
        self.strategy = {
            "id": "B",
            "type": "POLYMARKET",
            "title": "BTC event hedge",
            "description": "Use event market protection",
            "hedge_ratio": "15%",
            "estimated_cost": "medium",
            "complexity": "medium",
            "pros": "defined risk",
            "cons": "basis risk",
            "injective_action": "N/A",
            "execution_venue": "polymarket",
            "market_snapshot": {
                "question": "Will Bitcoin be below $90,000 on Friday?",
                "outcome": "Yes",
                "price": 0.42,
                "probability": 0.42,
                "token_id": "pm-token-yes",
                "url": "https://polymarket.com/event/bitcoin-below-90000",
            },
        }

    @patch("routers.hedge.polymarket_service.place_order")
    def test_dry_run_returns_order_preview_without_placing_order(self, mock_place_order):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "dry_run"},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "dry_run")
        self.assertEqual(data["order_preview"]["token_id"], "pm-token-yes")
        self.assertEqual(data["order_preview"]["price"], 0.42)
        self.assertIn("order preview", data["summary"].lower())
        mock_place_order.assert_not_called()

    @patch("routers.hedge.polymarket_service.place_order")
    def test_real_mode_still_blocks_demo_token_and_real_order_path(self, mock_place_order):
        strategy = {
            **self.strategy,
            "market_snapshot": {
                **self.strategy["market_snapshot"],
                "token_id": "demo-token",
            },
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": strategy, "mode": "real", "confirmed": True},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        mock_place_order.assert_not_called()

    @patch("routers.hedge.polymarket_service.place_order")
    def test_real_mode_blocks_non_demo_token_until_real_path_is_supported(self, mock_place_order):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "real", "confirmed": True},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIsNone(data["order_preview"])
        self.assertIsNone(data["order_id"])
        mock_place_order.assert_not_called()

    @patch("routers.hedge.polymarket_service.place_order")
    def test_dry_run_can_fallback_to_market_link_snapshot(self, mock_place_order):
        strategy = {
            **self.strategy,
            "market_snapshot": None,
            "market_links": [
                {
                    "label": "Polymarket event",
                    "url": "https://polymarket.com/event/bitcoin-below-90000",
                    "venue": "Polymarket",
                    "note": "Will Bitcoin be below $90,000 on Friday?",
                    "outcome": "Yes",
                    "price": 0.42,
                    "probability": 0.42,
                    "token_id": "pm-token-yes",
                }
            ],
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": strategy, "mode": "dry_run"},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["order_preview"]["token_id"], "pm-token-yes")
        self.assertEqual(data["order_preview"]["url"], "https://polymarket.com/event/bitcoin-below-90000")
        mock_place_order.assert_not_called()


if __name__ == "__main__":
    unittest.main()
