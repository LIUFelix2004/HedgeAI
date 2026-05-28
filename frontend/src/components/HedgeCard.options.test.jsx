import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HedgeCard from './HedgeCard'

const strategy = {
  id: 'C',
  type: 'OPTIONS',
  title: 'BTC options protection',
  description: 'Buy put protection',
  hedge_ratio: '100%',
  estimated_cost: 'premium',
  complexity: 'medium',
  pros: 'defined downside',
  cons: 'premium cost',
  injective_action: 'N/A',
  execution_venue: 'options',
  market_snapshot: {
    venue: 'Derive',
    instrument_name: 'BTC-20260612-88000-P',
    option_type: 'Put',
    strike: 88000,
    expiry_date: '2026-06-12',
    days_to_expiry: 14,
    protection_range: '保护 88000 以下的下行风险',
  },
}

describe('HedgeCard options details', () => {
  it('shows the option contract snapshot', () => {
    render(<HedgeCard strategy={strategy} />)

    expect(screen.getByText('Derive 期权参考')).toBeInTheDocument()
    expect(screen.getByText('BTC-20260612-88000-P')).toBeInTheDocument()
    expect(screen.getByText('Put')).toBeInTheDocument()
    expect(screen.getByText('88000')).toBeInTheDocument()
    expect(screen.getByText('2026-06-12')).toBeInTheDocument()
    expect(screen.getByText('14 天')).toBeInTheDocument()
    expect(screen.getByText('保护 88000 以下的下行风险')).toBeInTheDocument()
  })
})
