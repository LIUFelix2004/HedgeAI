import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HedgeCard from './HedgeCard'
import { executeHedge, fetchExecutionPrecheck } from '../lib/api'
import { useStore } from '../lib/store'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    executeHedge: vi.fn(),
    fetchExecutionPrecheck: vi.fn(),
  }
})

const strategy = {
  id: 'A',
  type: 'REVERSE_HEDGE',
  title: 'BTC hedge',
  description: 'hedge',
  hedge_ratio: '40%',
  estimated_cost: 'low',
  complexity: 'low',
  pros: 'fast',
  cons: 'cost',
  injective_action: 'preview',
}

const linkedStrategy = {
  ...strategy,
  market_links: [
    {
      label: 'Helix 交易页',
      url: 'https://helixapp.com/futures/btc-usdt-perp',
      venue: 'Helix',
      note: 'BTC/USDT PERP',
    },
  ],
}

describe('HedgeCard execution payload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchExecutionPrecheck.mockResolvedValue({
      data: {
        can_execute: true,
        source_signature: 'precheck-signature',
        source_position: { symbol: 'BTC/USDT', direction: 'long' },
        estimated_order: { target_venue: 'Helix', order_notional: 2000, required_margin: 200 },
        checks: [],
      },
    })
    useStore.setState({
      executionMode: 'dry_run',
      accounts: {
        injective: { connected: true, address: 'inj-demo', privateKey: '', positions: [] },
      },
    })
  })

  it('opens a confirmation modal before executing and sends mode details after confirm', async () => {
    executeHedge.mockResolvedValue({
      data: {
        success: true,
        execution_mode: 'dry_run',
        summary: 'dry-run preview',
        steps: [],
      },
    })

    render(<HedgeCard strategy={strategy} />)
    await userEvent.click(screen.getByRole('button', { name: '执行此方案' }))

    expect(screen.getByRole('dialog', { name: '确认执行方案' })).toBeInTheDocument()
    expect(executeHedge).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: '确认执行' }))
    await waitFor(() => {
      expect(executeHedge).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'dry_run',
        confirmed: false,
      }))
    })

    await waitFor(() => {
      expect(screen.getByTestId('execution-result')).toHaveAttribute('data-execution-tone', 'dry_run')
    })
  })

  it('shows execution progress while the request is pending', async () => {
    executeHedge.mockReturnValue(new Promise(() => {}))

    render(<HedgeCard strategy={strategy} />)
    await userEvent.click(screen.getByRole('button', { name: '执行此方案' }))
    await userEvent.click(screen.getByRole('button', { name: '确认执行' }))

    expect(screen.getByRole('status', { name: '执行进度' })).toBeInTheDocument()
  })

  it('shows Injective dry-run order preview parameters', async () => {
    executeHedge.mockResolvedValue({
      data: {
        success: true,
        execution_mode: 'dry_run',
        summary: 'dry-run preview',
        steps: [],
        order_preview: {
          venue: 'injective',
          asset: 'BTC',
          market_id: '0xmarket-btc',
          side: 'sell',
          quantity: 0.021505,
          notional: 2000,
          leverage: 10,
        },
      },
    })

    render(<HedgeCard strategy={strategy} />)
    await userEvent.click(screen.getByRole('button', { name: '执行此方案' }))
    await userEvent.click(screen.getByRole('button', { name: '确认执行' }))

    await waitFor(() => {
      expect(screen.getByText('0xmarket-btc')).toBeInTheDocument()
      expect(screen.getByText('BTC')).toBeInTheDocument()
      expect(screen.getByText('0.021505')).toBeInTheDocument()
      expect(screen.getByText('2000 USDT')).toBeInTheDocument()
      expect(screen.getByText('10x')).toBeInTheDocument()
    })
  })

  it('sends confirmed true only after explicit real-mode confirmation', async () => {
    useStore.setState({ executionMode: 'real' })
    executeHedge.mockResolvedValue({
      data: {
        success: true,
        execution_mode: 'real',
        summary: 'real order',
        steps: [],
      },
    })

    render(<HedgeCard strategy={strategy} />)
    await userEvent.click(screen.getByRole('button', { name: '执行此方案' }))

    const confirm = await screen.findByRole('button', { name: '确认执行' })
    expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /我确认这是实盘提交/ }))
    await waitFor(() => expect(confirm).toBeEnabled())
    await userEvent.click(confirm)

    await waitFor(() => {
      expect(executeHedge).toHaveBeenCalledWith(expect.objectContaining({
        mode: 'real',
        confirmed: true,
        idempotency_key: expect.any(String),
        precheck_signature: 'precheck-signature',
      }))
    })
  })

  it('uses a direct Helix link as the primary action for reverse hedge cards', () => {
    render(<HedgeCard strategy={linkedStrategy} />)

    const link = screen.getByRole('link', { name: /前往 Helix 交易页/ })
    expect(link).toHaveAttribute('href', 'https://helixapp.com/futures/btc-usdt-perp')
    expect(screen.queryByRole('button', { name: '执行此方案' })).not.toBeInTheDocument()
  })
})
