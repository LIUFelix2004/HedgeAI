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


class DemoRiskTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)

    @patch("services.market_price_service.get_price", new_callable=AsyncMock)
    @patch("services.injective_service.get_demo_market_price", new_callable=AsyncMock)
    def test_demo_risk_scan_returns_immediate_alert_with_position_metrics(self, mock_get_price, mock_reference_price):
        mock_get_price.return_value = {"price": 80000.0, "best_bid_price": 79990.0, "best_ask_price": 80010.0, "source": "injective-indexer"}
        mock_reference_price.return_value = {"price": 83500.0, "source": "binance"}
        self.client.post("/api/accounts/injective/connect", json={"address": "demo"})

        resp = self.client.get("/api/risk/scan")

        self.assertEqual(resp.status_code, 200)
        alerts = resp.json()["alerts"]
        self.assertGreaterEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["severity"], "IMMEDIATE")
        self.assertEqual(alerts[0]["symbol"], "BTC/USDC")
        self.assertIn("liquidation_distance_pct", alerts[0])
        self.assertIn("unrealized_pnl_pct", alerts[0])
        self.assertIn("position", alerts[0])


if __name__ == "__main__":
    unittest.main()
