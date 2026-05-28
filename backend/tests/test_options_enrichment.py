import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402


class OptionsEnrichmentTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.strategy = {
            "id": "C",
            "type": "OPTIONS",
            "title": "BTC options protection",
            "description": "Buy put protection for BTC",
            "hedge_ratio": "100%",
            "estimated_cost": "premium",
            "complexity": "medium",
            "pros": "defined downside",
            "cons": "premium cost",
            "injective_action": "N/A",
            "execution_venue": "options",
        }

    @patch("routers.hedge.options_market_service.find_option_for_position", new_callable=AsyncMock)
    def test_enrich_options_strategy_adds_contract_snapshot(self, mock_find_option):
        mock_find_option.return_value = {
            "instrument_name": "BTC-20260612-88000-P",
            "strike": 88000,
            "expiry_ts": 1781222400,
            "expiry_date": "2026-06-12",
            "option_type": "P",
            "days_to_expiry": 14.0,
            "options_page_url": "https://app.derive.xyz/trade/options",
            "api_url": "https://api.lyra.finance/public/get_all_instruments?currency=BTC",
            "display_label": "BTC 2026-06-12 88000 P",
            "reference_summary": "实时参考期权：BTC-20260612-88000-P，到期日 2026-06-12，行权价 88000。",
        }

        resp = self.client.post(
            "/api/hedge/enrich-strategies",
            json={
                "strategies": [self.strategy],
                "accounts": [
                    {
                        "platform": "hyperliquid",
                        "connected": True,
                        "positions": [
                            {
                                "symbol": "BTC/USDT",
                                "direction": "long",
                                "size": 5000,
                                "current_price": 93000,
                            }
                        ],
                    }
                ],
            },
        )

        self.assertEqual(resp.status_code, 200)
        enriched = resp.json()["strategies"][0]
        snapshot = enriched["market_snapshot"]
        self.assertEqual(snapshot["venue"], "Derive")
        self.assertEqual(snapshot["instrument_name"], "BTC-20260612-88000-P")
        self.assertEqual(snapshot["strike"], 88000)
        self.assertEqual(snapshot["expiry_date"], "2026-06-12")
        self.assertEqual(snapshot["option_type"], "Put")
        self.assertIn("88000", snapshot["protection_range"])
        self.assertEqual(enriched["market_links"][0]["venue"], "Derive")


if __name__ == "__main__":
    unittest.main()
