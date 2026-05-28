import os
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402
from services.model_usage_service import clear_model_usage, list_model_usage  # noqa: E402


async def fake_stream_response(*_args, **_kwargs):
    yield "风险摘要"
    yield "与策略建议"


class ModelUsageTest(unittest.TestCase):
    def setUp(self):
        clear_model_usage()
        self.client = TestClient(app)

    @patch("routers.chat.stream_response", side_effect=fake_stream_response)
    def test_chat_message_records_model_usage(self, _mock_stream):
        resp = self.client.post(
            "/api/chat/message",
            json={"message": "分析 BTC 仓位", "model": "claude", "accounts": [], "history": []},
        )

        self.assertEqual(resp.status_code, 200)
        usage = list_model_usage()["claude"]
        self.assertEqual(usage["calls"], 1)
        self.assertEqual(usage["success"], 1)
        self.assertGreater(usage["estimated_tokens"], 0)
        self.assertIn("estimated_cost_usd", usage)

    @patch("routers.chat.stream_response", side_effect=fake_stream_response)
    def test_model_usage_endpoint_returns_usage_summary(self, _mock_stream):
        self.client.post(
            "/api/chat/message",
            json={"message": "分析 BTC 仓位", "model": "deepseek", "accounts": [], "history": []},
        )

        resp = self.client.get("/api/chat/model-usage")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["models"]["deepseek"]["calls"], 1)

    @patch("routers.chat.stream_response", side_effect=fake_stream_response)
    def test_chat_stream_records_model_usage(self, _mock_stream):
        with self.client.stream(
            "POST",
            "/api/chat/stream",
            json={"message": "分析 BTC 仓位", "model": "gpt4o", "accounts": [], "history": []},
        ) as resp:
            body = "".join(resp.iter_text())

        self.assertIn("[DONE]", body)
        self.assertEqual(list_model_usage()["gpt4o"]["success"], 1)

    @patch("routers.chat.stream_response", side_effect=fake_stream_response)
    def test_model_usage_does_not_expose_model_api_key(self, _mock_stream):
        self.client.post(
            "/api/chat/message",
            json={
                "message": "分析 BTC 仓位",
                "model": "claude",
                "model_api_key": "sk-secret-value",
                "accounts": [],
                "history": [],
            },
        )

        resp = self.client.get("/api/chat/model-usage")

        self.assertNotIn("sk-secret-value", str(resp.json()))


if __name__ == "__main__":
    unittest.main()
