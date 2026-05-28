import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarketSnapshot from './MarketSnapshot'

describe('MarketSnapshot', () => {
  it('renders question, outcome, price, and probability', () => {
    render(
      <MarketSnapshot
        snapshot={{
          question: 'Will Bitcoin be below $90,000 on Friday?',
          outcome: 'Yes',
          price: 0.42,
          probability: 0.42,
          url: 'https://polymarket.com/event/bitcoin-below-90000',
        }}
      />
    )

    expect(screen.getByText('Will Bitcoin be below $90,000 on Friday?')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText('0.42')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('shows an unavailable state when no snapshot exists', () => {
    render(<MarketSnapshot snapshot={null} />)

    expect(screen.getByText('实时市场暂不可用')).toBeInTheDocument()
  })
})
