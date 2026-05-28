import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendChatMessage } from './chat'
import { useStore } from './store'
import { sendMessageStream } from './api'

vi.mock('./api', async () => {
  const actual = await vi.importActual('./api')
  return {
    ...actual,
    sendMessageStream: vi.fn(),
    enrichStrategies: vi.fn(async payload => ({ data: { strategies: payload.strategies } })),
  }
})

const btcPosition = {
  platform: 'injective',
  symbol: 'BTC/USDT',
  direction: 'long',
  size: 5400,
  leverage: 10,
  current_price: 83500,
  liquidation_distance_pct: 4.2,
  unrealized_pnl_pct: -8.3,
}

describe('sendChatMessage fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({
      accounts: {
        hyperliquid: { connected: false, address: '', privateKey: '', positions: [] },
        injective: { connected: true, address: 'demo', privateKey: '', positions: [btcPosition] },
        polymarket: { connected: false, apiKey: '', privateKey: '', positions: [] },
        binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
      },
      riskAlerts: [{ severity: 'IMMEDIATE', symbol: 'BTC/USDT', position: btcPosition }],
      messages: [],
      isTyping: false,
      model: 'claude',
      modelConfigs: { claude: { apiKey: '' } },
    })
  })

  it('writes local fallback strategies when the stream request fails', async () => {
    sendMessageStream.mockRejectedValue(new Error('network down'))

    await sendChatMessage('帮我生成对冲方案')

    const assistant = useStore.getState().messages.find(m => m.role === 'assistant')
    expect(assistant.fallback_reason).toContain('network down')
    expect(assistant.strategies).toHaveLength(3)
    expect(assistant.strategies.every(s => s.source === 'fallback')).toBe(true)
  })

  it('uses fallback strategies when the stream succeeds but no strategy can be parsed', async () => {
    sendMessageStream.mockImplementation(async (_payload, onChunk, onDone) => {
      onChunk('只有一段普通文字，没有策略结构。')
      onDone()
    })

    await sendChatMessage('给我策略')

    const assistant = useStore.getState().messages.find(m => m.role === 'assistant')
    expect(assistant.fallback_reason).toContain('未解析到结构化策略')
    expect(assistant.strategies).toHaveLength(3)
  })

  it('does not invent executable fallback strategies when no position exists', async () => {
    useStore.setState({
      accounts: {
        hyperliquid: { connected: false, address: '', privateKey: '', positions: [] },
        injective: { connected: false, address: '', privateKey: '', positions: [] },
        polymarket: { connected: false, apiKey: '', privateKey: '', positions: [] },
        binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
      },
      riskAlerts: [],
      messages: [],
      isTyping: false,
      model: 'claude',
      modelConfigs: { claude: { apiKey: '' } },
    })
    sendMessageStream.mockRejectedValue(new Error('network down'))

    await sendChatMessage('给我策略')

    const assistant = useStore.getState().messages.find(m => m.role === 'assistant')
    expect(assistant.content).toContain('加载 Demo 仓位')
    expect(assistant.strategies).toEqual([])
  })
})
