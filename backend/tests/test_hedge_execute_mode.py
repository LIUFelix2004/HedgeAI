import os
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402


class HedgeExecuteModeTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.strategy = {
            "id": "B",
            "type": "POLYMARKET",
            "title": "BTC 事件市场保护",
            "description": "用事件市场覆盖 BTC 下行风险",
            "hedge_ratio": "15%",
            "estimated_cost": "中",
            "complexity": "中",
            "pros": "可覆盖极端行情",
            "cons": "流动性不稳定",
            "injective_action": "N/A",
        }

    @patch("routers.hedge.polymarket_service.place_order")
    def test_polymarket_demo_result_is_explicit(self, mock_place_order):
        mock_place_order.return_value = {
            "success": True,
            "order_id": "mock-pm-order-001",
            "demo": True,
        }

        resp = self.client.post("/api/hedge/execute", json={"strategy": self.strategy})

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["execution_mode"], "demo")
        self.assertIn("demo", data["summary"].lower())


if __name__ == "__main__":
    unittest.main()
