import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemoPositionButton from './DemoPositionButton'
import { useStore } from '../lib/store'
import {
  connectDemoAccount,
  fetchInjectiveDemoMarketPreview,
  fetchInjectiveDemoMarkets,
  fetchPositions,
  scanRisk,
} from '../lib/api'

vi.mock('../lib/api', () => ({
  connectDemoAccount: vi.fn(),
  fetchInjectiveDemoMarketPreview: vi.fn(),
  fetchInjectiveDemoMarkets: vi.fn(),
  fetchPositions: vi.fn(),
  scanRisk: vi.fn(),
}))

const demoPositions = [
  {
    platform: 'injective',
    market_id: '0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9',
    ticker: 'BTC/USDT PERP',
    subaccount_id: 'demo-subaccount-0',
    symbol: 'BTC/USDT',
    direction: 'long',
    size: 5400,
    leverage: 10,
    current_price: 83500,
    reference_price: 83500,
    injective_mark_price: 80000,
    entry_price: 90000,
    margin_used: 600,
    unrealized_pnl_value: -390,
    unrealized_pnl_value_reference: -390,
    unrealized_pnl_pct_reference: -8.3,
    unrealized_pnl_value_injective: -600,
    unrealized_pnl_pct_injective: -12.5,
    liquidation_price: 81000,
    mark_price_source: 'injective-indexer',
    reference_price_source: 'binance',
    liquidation_distance_pct: 4.2,
    unrealized_pnl_pct: -8.3,
  },
]

const demoAlerts = [
  {
    id: 'injective-BTC/USDT-4.2',
    platform: 'injective',
    symbol: 'BTC/USDT',
    severity: 'IMMEDIATE',
    liquidation_distance_pct: 4.2,
    unrealized_pnl_pct: -8.3,
    message: 'BTC/USDT long 10x | loss -8.3% | liq 4.2%',
  },
]

describe('DemoPositionButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchInjectiveDemoMarketPreview.mockResolvedValue({ data: {} })
    useStore.setState({
      accounts: {
        hyperliquid: { connected: false, address: '', privateKey: '', positions: [] },
        injective: { connected: false, address: '', privateKey: '', positions: [] },
        polymarket: { connected: false, apiKey: '', privateKey: '', positions: [] },
        binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
      },
      demo: { loading: false, loaded: false, error: '' },
      demoConfig: {
        market_id: '0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9',
        symbol: 'BTC/USDT',
        direction: 'long',
        margin_used: '540',
        entry_price: '90000',
        leverage: '10',
      },
      demoPnlMode: 'reference',
      helixMarkets: [],
      helixMarketPreview: null,
      messages: [],
      riskAlerts: [],
    })
  })

  it('reloads the matching position snapshot after config changes', async () => {
    connectDemoAccount.mockResolvedValue({
      data: {
        platform: 'injective',
        connected: true,
        address: 'demo',
        trading_enabled: false,
      },
    })
    fetchInjectiveDemoMarkets.mockResolvedValue({
      data: {
        markets: [
          {
            market_id: '0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9',
            ticker: 'BTC/USDT PERP',
            symbol: 'BTC/USDT',
            initial_margin_ratio: 0.019231,
            maintenance_margin_ratio: 0.01,
            maker_fee_rate: -0.00005,
            taker_fee_rate: 0.0005,
          },
          {
            market_id: 'gbp-market-id',
            ticker: 'GBP/USDT PERP',
            symbol: 'GBP/USDT',
            initial_margin_ratio: 0.009901,
            maintenance_margin_ratio: 0.005,
            maker_fee_rate: -0.00005,
            taker_fee_rate: 0.0005,
          },
        ],
      },
    })
    fetchPositions.mockResolvedValue({ data: { platform: 'injective', positions: demoPositions } })
    scanRisk.mockResolvedValue({ data: { alerts: demoAlerts } })

    render(<DemoPositionButton />)

    await userEvent.click(screen.getByRole('button', { name: '自定义' }))
    await waitFor(() => expect(fetchInjectiveDemoMarkets).toHaveBeenCalledWith())
    await userEvent.click(screen.getByRole('button', { name: 'Helix Market' }))
    await screen.findByRole('button', { name: /GBP\/USDT PERP/ })

    const marginInput = screen.getByLabelText('保证金金额')
    await userEvent.clear(marginInput)
    await userEvent.type(marginInput, '600')
    await userEvent.click(screen.getByRole('button', { name: /加载模拟仓/ }))

    await waitFor(() => {
      expect(connectDemoAccount).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /模拟仓已加载/ })).toBeInTheDocument()
    })
    expect(connectDemoAccount).toHaveBeenCalledTimes(1)
  })
  it('normalizes a stale persisted market id before loading demo positions', async () => {
    connectDemoAccount.mockResolvedValue({
      data: {
        platform: 'injective',
        connected: true,
        address: 'demo',
        trading_enabled: false,
      },
    })
    fetchInjectiveDemoMarkets.mockResolvedValue({ data: { markets: [] } })
    fetchPositions.mockResolvedValue({ data: { platform: 'injective', positions: demoPositions } })
    scanRisk.mockResolvedValue({ data: { alerts: demoAlerts } })

    render(<DemoPositionButton />)

    await userEvent.click(screen.getAllByRole('button')[1])

    await waitFor(() => {
      expect(connectDemoAccount).toHaveBeenCalled()
    })

    expect(connectDemoAccount.mock.calls[0][0]).toMatchObject({
      market_id: '0x0ee7ca44147bab6ec81ac293b5fe7915488e612af59964b2d663d6008d861dee',
      symbol: 'BTC/USDC',
    })
  })
})
