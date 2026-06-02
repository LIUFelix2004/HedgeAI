import os
import sys
import tempfile
import unittest

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
os.environ.setdefault("HEDGEAI_DB_PATH", os.path.join(tempfile.gettempdir(), "hedgeai-test-reverse-hedge-enrichment.db"))

from main import app  # noqa: E402


class ReverseHedgeEnrichmentTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.strategy = {
            "id": "A",
            "type": "REVERSE_HEDGE",
            "title": "ETH reverse hedge",
            "description": "Short perpetual to offset downside risk",
            "hedge_ratio": "40%",
            "estimated_cost": "low",
            "complexity": "low",
            "pros": "fast",
            "cons": "funding cost",
            "injective_action": "preview",
            "execution_venue": "injective",
        }

    def test_enrich_reverse_hedge_adds_helix_market_link(self):
        resp = self.client.post(
            "/api/hedge/enrich-strategies",
            json={
                "strategies": [self.strategy],
                "accounts": [
                    {
                        "platform": "injective",
                        "connected": True,
                        "positions": [
                            {
                                "symbol": "ETH/USDC",
                                "direction": "long",
                                "size": 3200,
                                "current_price": 2800,
                            }
                        ],
                    }
                ],
            },
        )

        self.assertEqual(resp.status_code, 200)
        enriched = resp.json()["strategies"][0]
        self.assertEqual(enriched["market_links"][0]["venue"], "Helix")
        self.assertEqual(enriched["market_links"][0]["label"], "Helix 交易页")
        self.assertEqual(enriched["market_links"][0]["url"], "https://helixapp.com/futures/eth-usdt-perp")


if __name__ == "__main__":
    unittest.main()
