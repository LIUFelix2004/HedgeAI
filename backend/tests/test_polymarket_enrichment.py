import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app  # noqa: E402


class PolymarketEnrichmentTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.strategy = {
            "id": "B",
            "type": "POLYMARKET",
            "title": "BTC event hedge",
            "description": "Use event market protection",
            "hedge_ratio": "15%",
            "estimated_cost": "medium",
            "complexity": "medium",
            "pros": "defined risk",
            "cons": "basis risk",
            "injective_action": "N/A",
            "execution_venue": "polymarket",
        }

    @patch("routers.hedge.polymarket_service.find_hedge_for_position", new_callable=AsyncMock)
    def test_enrich_polymarket_strategy_adds_market_snapshot(self, mock_find_market):
        mock_find_market.return_value = {
            "slug": "bitcoin-below-90000",
            "question": "Will Bitcoin be below $90,000 on Friday?",
            "outcome": "Yes",
            "price": 0.42,
            "probability": 0.42,
            "token_id": "pm-token-yes",
            "updated_at": "2026-05-29T00:00:00Z",
            "event_url": "https://polymarket.com/event/bitcoin-below-90000",
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
        self.assertEqual(enriched["market_snapshot"]["question"], "Will Bitcoin be below $90,000 on Friday?")
        self.assertEqual(enriched["market_snapshot"]["token_id"], "pm-token-yes")
        self.assertEqual(enriched["market_snapshot"]["price"], 0.42)
        self.assertEqual(enriched["market_links"][0]["token_id"], "pm-token-yes")
        self.assertEqual(enriched["market_links"][0]["price"], 0.42)

    @patch("routers.hedge.polymarket_service.find_hedge_for_position", new_callable=AsyncMock)
    def test_enrich_polymarket_uses_source_position_asset_for_generic_title(self, mock_find_market):
        mock_find_market.return_value = None
        generic_strategy = {
            **self.strategy,
            "title": "Polymarket event hedge",
            "description": "Use event market protection for the current high-risk position",
        }

        resp = self.client.post(
            "/api/hedge/enrich-strategies",
            json={
                "strategies": [generic_strategy],
                "accounts": [
                    {
                        "platform": "injective",
                        "connected": True,
                        "positions": [
                            {
                                "symbol": "CRCL/USDC",
                                "direction": "long",
                                "size": 1500,
                                "current_price": 118,
                            }
                        ],
                    }
                ],
            },
        )

        self.assertEqual(resp.status_code, 200)
        mock_find_market.assert_awaited_once_with("CRCL", "long", 118.0)
        enriched = resp.json()["strategies"][0]
        self.assertTrue(enriched["market_snapshot"]["unavailable"])
        self.assertEqual(enriched["market_snapshot"]["asset"], "CRCL")
        self.assertEqual(enriched["market_links"], [])


if __name__ == "__main__":
    unittest.main()
