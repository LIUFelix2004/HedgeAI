import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemoPositionButton from './DemoPositionButton'
import RiskBanner from './RiskBanner'
import ChatMessage from './ChatMessage'
import { useStore } from '../lib/store'
import { connectDemoAccount, fetchInjectiveDemoMarkets, fetchPositions, scanRisk, sendMessageStream } from '../lib/api'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    connectDemoAccount: vi.fn(),
    fetchInjectiveDemoMarkets: vi.fn(),
    fetchPositions: vi.fn(),
    scanRisk: vi.fn(),
    sendMessageStream: vi.fn(),
    enrichStrategies: vi.fn(async payload => ({ data: { strategies: payload.strategies } })),
  }
})

vi.mock('./HedgeCard', () => ({
  default: ({ strategy }) => <div data-testid="hedge-card">{strategy.title}</div>,
}))

const demoPosition = {
  platform: 'injective',
  mode: 'demo',
  market_id: '0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9',
  ticker: 'BTC/USDT PERP',
  subaccount_id: 'demo-subaccount-0',
  symbol: 'BTC/USDT',
  direction: 'long',
  size: 5400,
  leverage: 10,
  current_price: 83500,
  reference_price: 83500,
  unrealized_pnl_value: -390,
  unrealized_pnl_value_reference: -390,
  unrealized_pnl_pct_reference: -8.3,
  unrealized_pnl_value_injective: -600,
  unrealized_pnl_pct_injective: -12.5,
  injective_mark_price: 80000,
  entry_price: 90000,
  margin_used: 540,
  liquidation_price: 81000,
  mark_price_source: 'binance',
  reference_price_source: 'binance',
  liquidation_distance_pct: 4.2,
  unrealized_pnl_pct: -8.3,
}

const demoAlerts = [
  {
    id: 'injective-BTC/USDT-4.2',
    platform: 'injective',
    symbol: 'BTC/USDT',
    severity: 'IMMEDIATE',
    liquidation_distance_pct: 4.2,
    unrealized_pnl_pct: -8.3,
    position: demoPosition,
    message: 'BTC/USDT long 10x | loss -8.3% | liq 4.2%',
  },
]

function DemoHarness() {
  const messages = useStore(s => s.messages)
  return (
    <>
      <DemoPositionButton />
      <RiskBanner />
      <div>
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
    </>
  )
}

describe('fixed demo main flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
      riskAlerts: [],
      messages: [],
      isTyping: false,
      model: 'claude',
      modelConfigs: { claude: { apiKey: '' } },
    })
  })

  it('loads demo risk and falls back to three local strategy cards when the model stream fails', async () => {
    connectDemoAccount.mockResolvedValue({
      data: { platform: 'injective', connected: true, address: 'demo', trading_enabled: false },
    })
    fetchInjectiveDemoMarkets.mockResolvedValue({
      data: {
        markets: [
          {
            market_id: '0x2e94326a421c3f66c15a3b663c7b1ab7fb6a5298b3a57759ecf07f0036793fc9',
            ticker: 'BTC/USDT PERP',
            symbol: 'BTC/USDT',
          },
        ],
      },
    })
    fetchPositions.mockResolvedValue({ data: { positions: [demoPosition] } })
    scanRisk.mockResolvedValue({ data: { alerts: demoAlerts } })
    sendMessageStream.mockRejectedValue(new Error('no api key'))

    render(<DemoHarness />)

    await userEvent.click(screen.getByRole('button', { name: /加载模拟仓/ }))
    await screen.findByRole('button', { name: /模拟仓已加载/ })
    expect(screen.getByText(/liq 4.2%/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /AI/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId('hedge-card')).toHaveLength(3)
    })
    expect(useStore.getState().messages.find(m => m.role === 'assistant').fallback_reason).toContain('no api key')
  })
})
