import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemoPositionButton from './DemoPositionButton'
import RiskBanner from './RiskBanner'
import ChatMessage from './ChatMessage'
import { useStore } from '../lib/store'
import { connectDemoAccount, fetchPositions, scanRisk, sendMessageStream } from '../lib/api'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    connectDemoAccount: vi.fn(),
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
  symbol: 'BTC/USDT',
  direction: 'long',
  size: 5400,
  leverage: 10,
  current_price: 83500,
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
    message: 'BTC/USDT long 10x | 浮动盈亏 -8.3% | 距强平仅 4.2%',
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
    fetchPositions.mockResolvedValue({ data: { positions: [demoPosition] } })
    scanRisk.mockResolvedValue({ data: { alerts: demoAlerts } })
    sendMessageStream.mockRejectedValue(new Error('no api key'))

    render(<DemoHarness />)

    await userEvent.click(screen.getByRole('button', { name: /加载 Demo 仓位/ }))
    await screen.findByRole('button', { name: /Demo 已加载/ })
    expect(screen.getByText(/距强平仅 4.2%/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /生成建议/ }))

    await waitFor(() => {
      expect(screen.getAllByTestId('hedge-card')).toHaveLength(3)
    })
    expect(screen.getByText('本地兜底')).toBeInTheDocument()
    expect(useStore.getState().messages.find(m => m.role === 'assistant').fallback_reason).toContain('no api key')
  })
})
