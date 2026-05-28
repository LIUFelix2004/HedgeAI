import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ConfirmExecutionModal from './ConfirmExecutionModal'

const strategy = {
  id: 'A',
  type: 'REVERSE_HEDGE',
  title: 'BTC hedge',
}

describe('ConfirmExecutionModal', () => {
  it('requires an explicit checkbox before real execution can continue', async () => {
    const onConfirm = vi.fn()
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

    await userEvent.click(screen.getByRole('checkbox', { name: '我确认这是实盘提交' }))
    expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    expect(onConfirm).toHaveBeenCalledWith({ confirmed: true })
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
