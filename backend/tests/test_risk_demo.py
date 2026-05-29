import os
import sys
import unittest

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

    def test_demo_risk_scan_returns_immediate_alert_with_position_metrics(self):
        self.client.post("/api/accounts/injective/connect", json={"address": "demo"})

        resp = self.client.get("/api/risk/scan")

        self.assertEqual(resp.status_code, 200)
        alerts = resp.json()["alerts"]
        self.assertGreaterEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["severity"], "IMMEDIATE")
        self.assertEqual(alerts[0]["symbol"], "BTC/USDT")
        self.assertIn("liquidation_distance_pct", alerts[0])
        self.assertIn("unrealized_pnl_pct", alerts[0])
        self.assertIn("position", alerts[0])


if __name__ == "__main__":
    unittest.main()
