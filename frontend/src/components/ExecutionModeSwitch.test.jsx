import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import ExecutionModeSwitch from './ExecutionModeSwitch'
import { useStore } from '../lib/store'

describe('ExecutionModeSwitch', () => {
  beforeEach(() => {
    useStore.setState({ executionMode: 'demo' })
  })

  it('switches execution mode with visible active state', async () => {
    render(<ExecutionModeSwitch />)

    expect(screen.getByRole('button', { name: /Demo/ })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: /Dry-run/ }))
    expect(useStore.getState().executionMode).toBe('dry_run')
    expect(screen.getByRole('button', { name: /Dry-run/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
