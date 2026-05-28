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


class SessionSecurityTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)

    def test_disconnect_removes_session_and_credentials(self):
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-real",
            "creds": {"address": "inj-real", "privateKey": "secret"},
            "positions": [],
            "expires_at": time.time() + 3600,
        }

        resp = self.client.delete("/api/accounts/injective/disconnect")

        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["connected"])
        self.assertNotIn("injective", _sessions)

    def test_expired_session_is_removed_before_positions_are_returned(self):
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-real",
            "creds": {"address": "inj-real", "privateKey": "secret"},
            "positions": [{"symbol": "BTC/USDT"}],
            "expires_at": time.time() - 1,
        }

        resp = self.client.get("/api/accounts/injective/positions")

        self.assertEqual(resp.status_code, 401)
        self.assertIn("expired", resp.json()["detail"].lower())
        self.assertNotIn("injective", _sessions)

    def test_expired_session_blocks_aggregate_positions(self):
        _sessions["binance"] = {
            "connected": True,
            "platform": "binance",
            "creds": {"apiKey": "key"},
            "positions": [{"symbol": "BTC/USDT"}],
            "expires_at": time.time() - 1,
        }

        resp = self.client.get("/api/accounts/positions/all")

        self.assertEqual(resp.status_code, 401)
        self.assertIn("expired", resp.json()["detail"].lower())
        self.assertNotIn("binance", _sessions)

    def test_expired_sessions_are_not_used_by_risk_scan(self):
        _sessions["binance"] = {
            "connected": True,
            "platform": "binance",
            "creds": {"apiKey": "key"},
            "positions": [
                {
                    "platform": "binance",
                    "symbol": "BTC/USDT",
                    "direction": "long",
                    "size": 5000,
                    "leverage": 10,
                    "current_price": 93000,
                    "liquidation_distance_pct": 2,
                    "unrealized_pnl_pct": -20,
                }
            ],
            "expires_at": time.time() - 1,
        }

        resp = self.client.get("/api/risk/scan")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["count"], 0)
        self.assertNotIn("binance", _sessions)

    @patch("routers.hedge.hyperliquid_service.execute_order")
    def test_expired_trade_credentials_are_not_used_for_real_execution(self, mock_execute_order):
        mock_execute_order.return_value = {"success": True, "order_id": "order-1"}
        _sessions["injective"] = {
            "connected": True,
            "platform": "injective",
            "address": "inj-source",
            "creds": {"address": "inj-source"},
            "positions": [
                {
                    "platform": "injective",
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
        _sessions["hyperliquid"] = {
            "connected": True,
            "platform": "hyperliquid",
            "address": "0xhedge",
            "creds": {"address": "0xhedge", "privateKey": "expired-secret"},
            "positions": [],
            "expires_at": time.time() - 1,
        }

        resp = self.client.post(
            "/api/hedge/execute",
            json={
                "strategy": {
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
                },
                "mode": "real",
                "confirmed": True,
                "idempotency_key": f"expired-creds-{time.time()}",
            },
        )

        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["execution_mode"], "blocked")
        self.assertIn("Hyperliquid", data["error"])
        mock_execute_order.assert_not_called()
        self.assertNotIn("hyperliquid", _sessions)

    def test_connect_records_session_expiry(self):
        resp = self.client.post("/api/accounts/injective/connect", json={"address": "demo"})

        self.assertEqual(resp.status_code, 200)
        self.assertIn("expires_at", _sessions["injective"])
        self.assertGreater(_sessions["injective"]["expires_at"], time.time())


if __name__ == "__main__":
    unittest.main()
