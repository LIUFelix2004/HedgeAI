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


class DemoExecutionSafetyTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)
        self.strategy = {
            "id": "A",
            "type": "REVERSE_HEDGE",
            "title": "BTC reverse hedge",
            "description": "Reverse hedge a BTC/USDT demo long position",
            "hedge_ratio": "40%",
            "estimated_cost": "low",
            "complexity": "low",
            "pros": "Reduces directional exposure",
            "cons": "Reduces upside participation",
            "injective_action": "MsgCreateDerivativeMarketOrder",
        }

    @patch("routers.hedge.hyperliquid_service.execute_order")
    def test_demo_origin_position_never_calls_real_hyperliquid_execution(self, mock_execute_order):
        self.client.post("/api/accounts/injective/connect", json={"address": "demo"})
        _sessions["hyperliquid"] = {
            "connected": True,
            "address": "0xreal",
            "creds": {"address": "0xreal", "privateKey": "real-secret"},
            "positions": [],
        }

        resp = self.client.post("/api/hedge/execute", json={"strategy": self.strategy})

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "demo")
        self.assertIn("demo", data["summary"].lower())
        mock_execute_order.assert_not_called()


if __name__ == "__main__":
    unittest.main()
