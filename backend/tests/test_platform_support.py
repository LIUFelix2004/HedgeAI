import os
import sys
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.accounts import _sessions  # noqa: E402


class PlatformSupportTest(unittest.TestCase):
    def setUp(self):
        _sessions.clear()
        self.client = TestClient(app)

    def test_binance_connect_is_marked_readonly_planned_not_connected(self):
        resp = self.client.post("/api/accounts/binance/connect", json={"apiKey": "key", "apiSecret": "secret"})

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertFalse(data["connected"])
        self.assertFalse(data["trading_enabled"])
        self.assertEqual(data["support_status"], "planned")
        self.assertNotIn("binance", _sessions)

    def test_support_matrix_marks_unfinished_platforms(self):
        resp = self.client.get("/api/accounts/support-matrix")

        self.assertEqual(resp.status_code, 200)
        matrix = resp.json()["platforms"]
        self.assertEqual(matrix["hyperliquid"]["read_status"], "partial")
        self.assertEqual(matrix["injective"]["read_status"], "partial")
        self.assertEqual(matrix["binance"]["read_status"], "planned")
        self.assertEqual(matrix["okx"]["read_status"], "planned")
        self.assertEqual(matrix["bybit"]["read_status"], "planned")

    def test_okx_and_bybit_connect_are_planned_not_connected(self):
        for platform in ("okx", "bybit"):
            with self.subTest(platform=platform):
                resp = self.client.post(f"/api/accounts/{platform}/connect", json={"apiKey": "key"})

                self.assertEqual(resp.status_code, 200)
                self.assertFalse(resp.json()["connected"])
                self.assertEqual(resp.json()["support_status"], "planned")
                self.assertNotIn(platform, _sessions)


if __name__ == "__main__":
    unittest.main()
