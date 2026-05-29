import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemoPositionButton from './DemoPositionButton'
import { useStore } from '../lib/store'
import { connectDemoAccount, fetchPositions, scanRisk } from '../lib/api'

vi.mock('../lib/api', () => ({
  connectDemoAccount: vi.fn(),
  fetchPositions: vi.fn(),
  scanRisk: vi.fn(),
}))

const demoPositions = [
  {
    platform: 'injective',
    symbol: 'BTC/USDT',
    direction: 'long',
    size: 5400,
    leverage: 10,
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
    message: 'BTC/USDT long 10x | 浮动盈亏 -8.3% | 距强平仅 4.2%',
  },
]

describe('DemoPositionButton', () => {
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
      messages: [],
      riskAlerts: [],
    })
  })

  it('connects the demo account, syncs positions, scans risk, and marks the demo as loaded', async () => {
    connectDemoAccount.mockResolvedValue({
      data: {
        platform: 'injective',
        connected: true,
        address: 'demo',
        trading_enabled: false,
      },
    })
    fetchPositions.mockResolvedValue({ data: { platform: 'injective', positions: demoPositions } })
    scanRisk.mockResolvedValue({ data: { alerts: demoAlerts } })

    render(<DemoPositionButton />)
    await userEvent.click(screen.getByRole('button', { name: /加载 Demo 仓位/ }))

    await waitFor(() => expect(connectDemoAccount).toHaveBeenCalledWith())
    expect(fetchPositions).toHaveBeenCalledWith('injective')
    expect(scanRisk).toHaveBeenCalledWith()

    await waitFor(() => {
      const state = useStore.getState()
      expect(state.accounts.injective.connected).toBe(true)
      expect(state.accounts.injective.address).toBe('demo')
      expect(state.accounts.injective.trading_enabled).toBe(false)
      expect(state.accounts.injective.positions).toHaveLength(1)
      expect(state.riskAlerts[0].severity).toBe('IMMEDIATE')
      expect(state.demo.loaded).toBe(true)
    })

    expect(screen.getByRole('button', { name: /Demo 已加载/ })).toBeInTheDocument()
    expect(useStore.getState().messages.at(-1).content).toContain('Demo 高风险仓位')
  })
})
