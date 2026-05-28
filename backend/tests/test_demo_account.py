import os
import sys
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.accounts import _sessions  # noqa: E402


class DemoAccountTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)

    def test_injective_demo_connects_without_trading_enabled(self):
        resp = self.client.post("/api/accounts/injective/connect", json={"address": "demo"})

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["connected"])
        self.assertEqual(data["platform"], "injective")
        self.assertEqual(data["address"], "demo")
        self.assertFalse(data["trading_enabled"])
        self.assertEqual(_sessions["injective"]["mode"], "demo")

    def test_injective_demo_ignores_private_key_and_never_enables_trading(self):
        resp = self.client.post(
            "/api/accounts/injective/connect",
            json={"address": "demo", "privateKey": "should-not-enable-demo-trading"},
        )

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["trading_enabled"])
        self.assertEqual(_sessions["injective"]["mode"], "demo")
        self.assertNotIn("privateKey", _sessions["injective"].get("creds", {}))

    def test_injective_demo_positions_are_high_risk_btc(self):
        self.client.post("/api/accounts/injective/connect", json={"address": "demo"})

        resp = self.client.get("/api/accounts/injective/positions")

        self.assertEqual(resp.status_code, 200)
        positions = resp.json()["positions"]
        self.assertEqual(positions[0]["symbol"], "BTC/USDT")
        self.assertLess(positions[0]["liquidation_distance_pct"], 5)


if __name__ == "__main__":
    unittest.main()
