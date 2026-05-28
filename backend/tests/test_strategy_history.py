import os
import sys
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from services.strategy_history_service import clear_strategy_history  # noqa: E402


class StrategyHistoryTest(unittest.TestCase):
    def setUp(self):
        clear_strategy_history()
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
            "execution_venue": "injective",
        }

    def test_execute_records_strategy_history(self):
        execute_resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "demo"},
        )
        audit_id = execute_resp.json()["audit_id"]

        history_resp = self.client.get("/api/hedge/history")

        self.assertEqual(history_resp.status_code, 200)
        item = history_resp.json()["items"][0]
        self.assertEqual(item["audit_id"], audit_id)
        self.assertEqual(item["strategy_id"], "A")
        self.assertEqual(item["strategy_title"], "BTC reverse hedge")
        self.assertEqual(item["status"], "success")
        self.assertEqual(item["execution_mode"], "demo")
        self.assertIn("result_summary", item)


if __name__ == "__main__":
    unittest.main()
