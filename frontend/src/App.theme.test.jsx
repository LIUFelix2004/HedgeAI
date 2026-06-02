import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./lib/api', () => ({
  scanRisk: vi.fn(() => new Promise(() => {})),
}))

vi.mock('./lib/chat', () => ({
  sendChatMessage: vi.fn(),
}))

vi.mock('./components/TopBar', () => ({ default: () => <div data-testid="topbar" /> }))
vi.mock('./components/RiskBanner', () => ({ default: () => <div data-testid="risk-banner" /> }))
vi.mock('./components/ChatView', () => ({ default: () => <div data-testid="chat-view" /> }))
vi.mock('./components/SettingsPanel', () => ({ default: () => <div data-testid="settings-panel" /> }))

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null)
})

describe('App workstation theme', () => {
  it('uses the dark workstation background shell', () => {
    const { container } = render(<App />)
    const shell = container.firstElementChild

    expect(shell).toHaveClass('app-shell', 'workstation-bg')
    expect(shell).not.toHaveClass('gemini-bg')
    expect(container.querySelector('[data-testid="cursor-trail-canvas"]')).not.toBeInTheDocument()
  })
})
