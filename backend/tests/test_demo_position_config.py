import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.accounts import _sessions  # noqa: E402


class DemoPositionConfigTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)

    @patch("services.market_price_service.get_price", new_callable=AsyncMock)
    @patch("services.injective_service.get_demo_market_price", new_callable=AsyncMock)
    def test_custom_demo_position_uses_live_price_and_recalculates_metrics(self, mock_get_price, mock_reference_price):
        mock_get_price.return_value = {
            "price": 66568.5,
            "best_bid_price": 66568.0,
            "best_ask_price": 66569.0,
            "source": "injective-indexer",
        }
        mock_reference_price.return_value = {
            "price": 85000.0,
            "source": "binance",
        }

        resp = self.client.post(
            "/api/accounts/injective/demo/connect",
            json={
                "symbol": "BTC/USDT",
                "direction": "long",
                "margin_used": 1000,
                "entry_price": 90000,
                "leverage": 10,
            },
        )

        self.assertEqual(resp.status_code, 200)

        positions_resp = self.client.get("/api/accounts/injective/positions")
        self.assertEqual(positions_resp.status_code, 200)
        position = positions_resp.json()["positions"][0]

        self.assertEqual(position["symbol"], "BTC/USDC")
        self.assertEqual(position["current_price"], 85000.0)
        self.assertEqual(position["reference_price"], 85000.0)
        self.assertEqual(position["mark_price_source"], "injective-indexer")
        self.assertEqual(position["reference_price_source"], "binance")
        self.assertEqual(position["injective_mark_price"], 66568.5)
        self.assertAlmostEqual(position["margin_used"], 1000.0)
        self.assertAlmostEqual(position["size"], 9444.4444, places=3)
        self.assertAlmostEqual(position["unrealized_pnl_value"], -555.5556, places=3)
        self.assertAlmostEqual(position["unrealized_pnl_pct"], -55.56, places=2)
        self.assertAlmostEqual(position["unrealized_pnl_value_reference"], -555.5556, places=3)
        self.assertAlmostEqual(position["unrealized_pnl_value_injective"], -2603.5, places=1)
        self.assertGreater(position["liquidation_price"], 0)
        self.assertTrue(position["liquidation_estimated"])

    @patch("services.market_price_service.get_price", new_callable=AsyncMock)
    @patch("services.injective_service.get_demo_market_price", new_callable=AsyncMock)
    def test_demo_short_position_reverses_pnl_direction(self, mock_get_price, mock_reference_price):
        mock_get_price.return_value = {
            "price": 3005.0,
            "best_bid_price": 3000.0,
            "best_ask_price": 3010.0,
            "source": "injective-indexer",
        }
        mock_reference_price.return_value = {
            "price": 3200.0,
            "source": "binance",
        }

        self.client.post(
            "/api/accounts/injective/demo/connect",
            json={
                "symbol": "ETH/USDT",
                "direction": "short",
                "margin_used": 500,
                "entry_price": 3000,
                "leverage": 5,
            },
        )

        position = self.client.get("/api/accounts/injective/positions").json()["positions"][0]
        self.assertLess(position["unrealized_pnl_pct"], 0)
        self.assertGreater(position["liquidation_price"], position["entry_price"])


if __name__ == "__main__":
    unittest.main()
