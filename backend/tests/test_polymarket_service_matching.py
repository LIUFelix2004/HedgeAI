import os
import sys
import unittest
from unittest.mock import AsyncMock, patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services import polymarket_service  # noqa: E402


class PolymarketServiceMatchingTest(unittest.IsolatedAsyncioTestCase):
    @patch("services.polymarket_service.search_hedge_markets", new_callable=AsyncMock)
    @patch("services.polymarket_service.search_hedge_events", new_callable=AsyncMock)
    async def test_prefers_eth_market_with_threshold_closest_to_current_price(self, mock_events, mock_markets):
        mock_events.return_value = [
            {
                "question": "Will Ethereum be below $1,950 on June 30?",
                "outcome": "Yes",
                "price": 0.41,
                "token_id": "eth-1950",
                "end_date": "2026-06-30T00:00:00Z",
                "volume_24h": 1000,
                "event_url": "https://polymarket.com/event/eth-1950",
            },
            {
                "question": "Will Ethereum be below $2,000 on December 31?",
                "outcome": "Yes",
                "price": 0.48,
                "token_id": "eth-2000",
                "end_date": "2026-12-31T00:00:00Z",
                "volume_24h": 5000,
                "event_url": "https://polymarket.com/event/eth-2000",
            },
        ]
        mock_markets.return_value = []

        market = await polymarket_service.find_hedge_for_position("ETH", "long", 1970)

        self.assertIsNotNone(market)
        self.assertEqual(market["token_id"], "eth-2000")

    @patch("services.polymarket_service.search_hedge_markets", new_callable=AsyncMock)
    @patch("services.polymarket_service.search_hedge_events", new_callable=AsyncMock)
    async def test_prefers_longer_settlement_when_threshold_distance_is_tied(self, mock_events, mock_markets):
        mock_events.return_value = [
            {
                "question": "Will Ethereum be below $1,950 on June 30?",
                "outcome": "Yes",
                "price": 0.41,
                "token_id": "eth-1950-near",
                "end_date": "2026-06-30T00:00:00Z",
                "volume_24h": 1000,
                "event_url": "https://polymarket.com/event/eth-1950-near",
            },
            {
                "question": "Will Ethereum be below $1,950 on December 31?",
                "outcome": "Yes",
                "price": 0.39,
                "token_id": "eth-1950-farther-expiry",
                "end_date": "2026-12-31T00:00:00Z",
                "volume_24h": 800,
                "event_url": "https://polymarket.com/event/eth-1950-farther-expiry",
            },
        ]
        mock_markets.return_value = []

        market = await polymarket_service.find_hedge_for_position("ETH", "long", 1970)

        self.assertIsNotNone(market)
        self.assertEqual(market["token_id"], "eth-1950-farther-expiry")

    @patch("services.polymarket_service.search_hedge_markets", new_callable=AsyncMock)
    @patch("services.polymarket_service.search_hedge_events", new_callable=AsyncMock)
    async def test_rejects_far_away_threshold_even_if_it_expires_later(self, mock_events, mock_markets):
        mock_events.return_value = [
            {
                "question": "Will Ethereum be below $1,600 on December 31?",
                "outcome": "Yes",
                "price": 0.08,
                "token_id": "eth-1600-late",
                "end_date": "2026-12-31T00:00:00Z",
                "volume_24h": 2000,
                "event_url": "https://polymarket.com/event/eth-1600-late",
            },
            {
                "question": "Will Ethereum be below $1,900 on September 30?",
                "outcome": "Yes",
                "price": 0.29,
                "token_id": "eth-1900-reasonable",
                "end_date": "2026-09-30T00:00:00Z",
                "volume_24h": 1500,
                "event_url": "https://polymarket.com/event/eth-1900-reasonable",
            },
        ]
        mock_markets.return_value = []

        market = await polymarket_service.find_hedge_for_position("ETH", "long", 1980)

        self.assertIsNotNone(market)
        self.assertEqual(market["token_id"], "eth-1900-reasonable")

    @patch("services.polymarket_service.search_hedge_markets", new_callable=AsyncMock)
    @patch("services.polymarket_service.search_hedge_events", new_callable=AsyncMock)
    async def test_recognizes_dip_to_events_as_valid_downside_hedges(self, mock_events, mock_markets):
        mock_events.return_value = [
            {
                "question": "Will the price of Ethereum be less than $1,600 on June 2?",
                "outcome": "Yes",
                "price": 0.0005,
                "token_id": "eth-1600-june-2",
                "end_date": "2026-06-02T16:00:00Z",
                "volume_24h": 0,
                "event_url": "https://polymarket.com/event/ethereum-price-on-june-2-2026",
            },
            {
                "question": "Will Ethereum dip to $1,900 in June?",
                "outcome": "Yes",
                "price": 0.18,
                "token_id": "eth-1900-june",
                "end_date": "2026-07-01T04:00:00Z",
                "volume_24h": 1200,
                "event_url": "https://polymarket.com/event/ethereum-dip-to-1900-in-june",
            },
        ]
        mock_markets.return_value = []

        market = await polymarket_service.find_hedge_for_position("ETH", "long", 1980)

        self.assertIsNotNone(market)
        self.assertEqual(market["token_id"], "eth-1900-june")


if __name__ == "__main__":
    unittest.main()
