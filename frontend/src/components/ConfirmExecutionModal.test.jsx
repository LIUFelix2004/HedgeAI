import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmExecutionModal from './ConfirmExecutionModal'
import { fetchExecutionPrecheck } from '../lib/api'

vi.mock('../lib/api', () => ({
  fetchExecutionPrecheck: vi.fn(),
}))

const strategy = {
  id: 'A',
  type: 'REVERSE_HEDGE',
  title: 'BTC hedge',
}

describe('ConfirmExecutionModal', () => {
  it('requires an explicit checkbox before real execution can continue', async () => {
    const onConfirm = vi.fn()
    fetchExecutionPrecheck.mockResolvedValue({
      data: {
        can_execute: true,
        source_signature: 'safe-precheck',
        source_position: { symbol: 'BTC/USDT', direction: 'long' },
        estimated_order: { target_venue: 'injective', order_notional: 1200, required_margin: 120 },
        checks: [],
      },
    })

    render(
      <ConfirmExecutionModal
        open
        mode="real"
        strategy={strategy}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const confirm = screen.getByRole('button', { name: '确认执行' })
    expect(confirm).toBeDisabled()

    await waitFor(() => {
      expect(fetchExecutionPrecheck).toHaveBeenCalledWith({ strategy, mode: 'real' })
    })
    await userEvent.click(screen.getByRole('checkbox', { name: '我确认这是实盘提交' }))
    await waitFor(() => {
      expect(confirm).toBeEnabled()
    })

    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith({ confirmed: true, precheckSignature: 'safe-precheck' })
  })

  it('does not use real-submit wording for dry-run previews', () => {
    render(
      <ConfirmExecutionModal
        open
        mode="dry_run"
        strategy={strategy}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: '确认执行方案' })).toBeInTheDocument()
    expect(screen.queryByText('真实提交')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认执行' })).toBeEnabled()
  })
})
