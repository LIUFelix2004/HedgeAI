import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HedgeCard from './HedgeCard'
import { executeHedge } from '../lib/api'
import { useStore } from '../lib/store'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    executeHedge: vi.fn(),
  }
})

const strategy = {
  id: 'B',
  type: 'POLYMARKET',
  title: 'BTC event hedge',
  description: 'Use event market protection',
  hedge_ratio: '15%',
  estimated_cost: 'medium',
  complexity: 'medium',
  pros: 'defined risk',
  cons: 'basis risk',
  injective_action: 'N/A',
  execution_venue: 'polymarket',
  market_snapshot: {
    question: 'Will Bitcoin be below $90,000 on Friday?',
    outcome: 'Yes',
    price: 0.42,
    probability: 0.42,
    token_id: 'pm-token-yes',
  },
}

const unavailableStrategy = {
  ...strategy,
  title: 'CRCL event hedge',
  execution_available: false,
  execution_block_reason: '当前未找到与该持仓直接对应的 Polymarket 事件市场，此方案仅可作为思路参考，暂不可执行。',
  market_snapshot: {
    unavailable: true,
    reason: '当前未找到与该持仓直接对应的 Polymarket 事件市场，此方案仅可作为思路参考，暂不可执行。',
    asset: 'CRCL',
  },
}

describe('HedgeCard Polymarket details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.setState({ executionMode: 'dry_run' })
  })

  it('renders the Polymarket market snapshot', () => {
    render(<HedgeCard strategy={strategy} />)

    expect(screen.getByText('Will Bitcoin be below $90,000 on Friday?')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('0.42')).toBeInTheDocument()
  })

  it('shows dry-run order preview details after execution', async () => {
    executeHedge.mockResolvedValue({
      data: {
        success: true,
        execution_mode: 'dry_run',
        summary: 'order preview generated',
        steps: ['校验执行模式', '生成订单预览'],
        order_preview: {
          token_id: 'pm-token-yes',
          price: 0.42,
          size: 750,
          side: 'buy',
        },
      },
    })

    render(<HedgeCard strategy={strategy} />)
    await userEvent.click(screen.getByRole('button', { name: /执行此方案|鎵ц姝ゆ柟妗/ }))
    await userEvent.click(screen.getByRole('button', { name: /确认执行|纭鎵ц/ }))

    await waitFor(() => {
      expect(screen.getByText('pm-token-yes')).toBeInTheDocument()
      expect(screen.getByText('750 USDT')).toBeInTheDocument()
    })
  })

  it('blocks execution when no direct polymarket market is available', () => {
    render(<HedgeCard strategy={unavailableStrategy} />)

    expect(screen.getAllByText('当前未找到与该持仓直接对应的 Polymarket 事件市场，此方案仅可作为思路参考，暂不可执行。').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /执行此方案|鎵ц姝ゆ柟妗/ })).not.toBeInTheDocument()
  })
})
