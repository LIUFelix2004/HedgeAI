import os
import sys
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from routers.hedge import _classify_execution_error  # noqa: E402
from services.audit_service import clear_audit_events, list_audit_events, record_audit_event  # noqa: E402


class ExecutionAuditTest(unittest.TestCase):
    def setUp(self):
        clear_audit_events()
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

    def test_blocked_execution_returns_error_code_and_audit_id(self):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "real", "confirmed": False},
        )

        data = resp.json()
        self.assertFalse(data["success"])
        self.assertEqual(data["error_code"], "EXEC_CONFIRMATION_REQUIRED")
        self.assertTrue(data["audit_id"].startswith("exec_"))

        events = list_audit_events()
        self.assertEqual(events[-1]["audit_id"], data["audit_id"])
        self.assertEqual(events[-1]["status"], "blocked")
        self.assertEqual(events[-1]["error_code"], "EXEC_CONFIRMATION_REQUIRED")
        self.assertNotIn("privateKey", str(events[-1]))

    def test_successful_preview_records_audit_summary(self):
        resp = self.client.post(
            "/api/hedge/execute",
            json={"strategy": self.strategy, "mode": "demo"},
        )

        data = resp.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["audit_id"].startswith("exec_"))
        self.assertIsNone(data.get("error_code"))

        events = list_audit_events()
        self.assertEqual(events[-1]["audit_id"], data["audit_id"])
        self.assertEqual(events[-1]["status"], "success")
        self.assertEqual(events[-1]["strategy_type"], "REVERSE_HEDGE")
        self.assertEqual(events[-1]["execution_mode"], "demo")

    def test_error_classifier_distinguishes_execution_error_codes(self):
        examples = {
            "Duplicate execution request blocked by idempotency key.": "EXEC_DUPLICATE_REQUEST",
            "Real execution requires an idempotency key.": "EXEC_IDEMPOTENCY_REQUIRED",
            "Order notional 120000 USDT exceeds limit 100000 USDT.": "RISK_LIMIT_EXCEEDED",
            "Unsupported Injective market: DOGE. Supported: BTC, ETH, INJ.": "MARKET_UNSUPPORTED",
            "Injective 私钥缺失，请重新连接带执行私钥的账户。": "CREDENTIAL_REQUIRED",
            "未找到 BTC 的已连接来源仓位。": "POSITION_NOT_FOUND",
        }

        for message, code in examples.items():
            with self.subTest(message=message):
                self.assertEqual(_classify_execution_error(message), code)

    def test_audit_event_redacts_sensitive_fields(self):
        event = record_audit_event({
            "audit_id": "exec_test",
            "privateKey": "secret",
            "nested": {
                "apiKey": "key",
                "apiSecret": "secret",
                "token": "token",
            },
        })

        self.assertEqual(event["privateKey"], "[redacted]")
        self.assertEqual(event["nested"]["apiKey"], "[redacted]")
        self.assertEqual(event["nested"]["apiSecret"], "[redacted]")
        self.assertEqual(event["nested"]["token"], "[redacted]")


if __name__ == "__main__":
    unittest.main()
