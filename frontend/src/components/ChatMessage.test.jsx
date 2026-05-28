import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ChatMessage from './ChatMessage'

vi.mock('./HedgeCard', () => ({
  default: ({ strategy }) => <div data-testid="hedge-card">{strategy.title}</div>,
}))

describe('ChatMessage fallback display', () => {
  it('shows the local fallback chip and renders three strategy cards', () => {
    render(
      <ChatMessage
        message={{
          id: Date.now(),
          role: 'assistant',
          content: '模型不可用，已生成本地兜底。',
          fallback_reason: 'network down',
          strategies: [
            { id: 'A', title: 'A', type: 'REVERSE_HEDGE' },
            { id: 'B', title: 'B', type: 'POLYMARKET' },
            { id: 'C', title: 'C', type: 'OPTIONS' },
          ],
        }}
      />
    )

    expect(screen.getByText('本地兜底')).toBeInTheDocument()
    expect(screen.getAllByTestId('hedge-card')).toHaveLength(3)
  })
})
