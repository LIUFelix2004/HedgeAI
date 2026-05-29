import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsPanel from './SettingsPanel'
import { disconnectAccount } from '../lib/api'
import { useStore } from '../lib/store'

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual('../lib/api')
  return {
    ...actual,
    disconnectAccount: vi.fn(),
  }
})

describe('SettingsPanel disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    disconnectAccount.mockResolvedValue({ data: { connected: false } })
    useStore.setState({
      accounts: {
        hyperliquid: { connected: false, address: '', privateKey: '', positions: [] },
        injective: { connected: true, address: 'inj-real', privateKey: 'secret', positions: [{ symbol: 'BTC/USDT' }] },
        polymarket: { connected: false, apiKey: '', privateKey: '', positions: [] },
        binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
      },
      showSettings: true,
    })
  })

  it('disconnects the account and clears local sensitive fields', async () => {
    render(<SettingsPanel />)

    await userEvent.click(screen.getByRole('button', { name: '断开连接' }))

    await waitFor(() => {
      expect(disconnectAccount).toHaveBeenCalledWith('injective')
      expect(useStore.getState().accounts.injective.connected).toBe(false)
      expect(useStore.getState().accounts.injective.privateKey).toBe('')
      expect(useStore.getState().accounts.injective.positions).toEqual([])
    })
  })
})
