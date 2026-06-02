import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import TopBar from './TopBar'
import { useStore } from '../lib/store'

describe('TopBar platform logos', () => {
  beforeEach(() => {
    useStore.setState({
      accounts: {
        hyperliquid: { connected: true, address: '', privateKey: '', positions: [] },
        injective: { connected: false, address: '', privateKey: '', positions: [] },
        polymarket: { connected: true, apiKey: '', privateKey: '', positions: [] },
        binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
      },
    })
  })

  it('uses platform logos instead of abbreviation text in the status strip', () => {
    render(<TopBar />)

    expect(screen.getByRole('img', { name: 'Hyperliquid logo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Injective logo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Polymarket logo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Binance logo' })).toBeInTheDocument()
    expect(screen.getByText('Hyperliquid')).toHaveClass('platform-status-name')
    expect(screen.getByText('Injective')).toHaveClass('platform-status-name')
    expect(screen.getByText('Polymarket')).toHaveClass('platform-status-name')
    expect(screen.getByText('Binance')).toHaveClass('platform-status-name')
    expect(screen.getByLabelText('Hyperliquid connected')).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('HedgeAI').closest('.glass-panel')).toHaveClass('topbar-surface')
    expect(screen.getByLabelText('Hyperliquid connected')).toHaveClass('topbar-surface')
    expect(screen.getByText('HedgeAI').closest('.glass-panel')).toHaveStyle({
      borderRadius: 'var(--topbar-radius)',
    })
    expect(screen.getByRole('img', { name: 'HedgeAI shield market logo' })).toBeInTheDocument()
    expect(screen.getByText('AI 风控与对冲工作台')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Injective logo' })).toHaveStyle({
      opacity: '1',
      filter: 'none',
    })
    expect(
      screen.getByLabelText('Hyperliquid connected').querySelector('.platform-status-dot')
    ).toHaveStyle({
      background: 'var(--success)',
      opacity: '1',
    })
    expect(
      screen.getByLabelText('Injective disconnected').querySelector('.platform-status-dot')
    ).toHaveStyle({
      background: 'var(--muted)',
      opacity: '0.62',
    })
    expect(screen.getByLabelText('Injective disconnected')).toHaveStyle({
      background: 'rgba(11,17,25,0.72)',
      border: '1px solid var(--border)',
    })
    expect(screen.getByLabelText('Injective disconnected').parentElement).toHaveClass('topbar-controls')
    expect(screen.getByRole('button', { name: '设置' })).toHaveClass('topbar-settings-button')
    expect(screen.getByRole('button', { name: '设置' })).toHaveClass('topbar-surface')
    expect(screen.getByRole('button', { name: '设置' }).parentElement).toHaveClass('topbar-controls')

    expect(screen.queryByText('HL')).not.toBeInTheDocument()
    expect(screen.queryByText('INJ')).not.toBeInTheDocument()
    expect(screen.queryByText('PM')).not.toBeInTheDocument()
    expect(screen.queryByText('BN')).not.toBeInTheDocument()
  })
})
