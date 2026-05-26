import json
import os
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402


async def fake_stream_response(message, model, accounts, history, model_api_key=None):
    assert message
    assert model
    yield "风险较高。"
    yield "建议先降低方向性暴露。"
    yield (
        "```json:strategies\n"
        + json.dumps(
            {
                "risk_level": "HIGH",
                "risk_summary": "BTC 多单距离强平较近",
                "liquidation_distance_pct": 4.2,
                "urgency": "IMMEDIATE",
                "strategies": [
                    {
                        "id": "A",
                        "type": "REVERSE_HEDGE",
                        "title": "反向合约对冲",
                        "description": "用 40% 空单对冲现有多单",
                        "hedge_ratio": "40%",
                        "estimated_cost": "低",
                        "complexity": "低",
                        "pros": "执行快",
                        "cons": "会削弱反弹收益",
                        "injective_action": "MsgCreateDerivativeMarketOrder on BTC-USDT-PERP",
                    }
                ],
            },
            ensure_ascii=False,
        )
        + "\n```"
    )


class ChatSmokeTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.payload = {
            "message": "请分析我的 BTC 仓位风险",
            "model": "claude",
            "accounts": [
                {
                    "platform": "injective",
                    "connected": True,
                    "address": "demo",
                    "positions": [
                        {
                            "platform": "injective",
                            "symbol": "BTC/USDT",
                            "direction": "long",
                            "size": 5400,
                            "leverage": 10,
                            "entry_price": 90000,
                            "current_price": 83500,
                            "unrealized_pnl_pct": -8.3,
                            "margin_used": 540,
                            "liquidation_price": 80000,
                            "liquidation_distance_pct": 4.2,
                        }
                    ],
                }
            ],
            "history": [],
        }

    @patch("routers.chat.stream_response", side_effect=fake_stream_response)
    def test_chat_message_smoke(self, _mock_stream):
        resp = self.client.post("/api/chat/message", json=self.payload)

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("response", data)
        self.assertIn("风险较高", data["response"])
        self.assertIn("json:strategies", data["response"])

    @patch("routers.chat.stream_response", side_effect=fake_stream_response)
    def test_chat_stream_smoke(self, _mock_stream):
        with self.client.stream("POST", "/api/chat/stream", json=self.payload) as resp:
            self.assertEqual(resp.status_code, 200)
            body = "".join(resp.iter_text())

        self.assertIn('data: {"text": "风险较高。"}', body)
        self.assertIn('data: {"text": "建议先降低方向性暴露。"}', body)
        self.assertIn("json:strategies", body)
        self.assertIn("data: [DONE]", body)


if __name__ == "__main__":
    unittest.main()
