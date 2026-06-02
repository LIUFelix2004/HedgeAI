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
    protection_range: 'Protects downside below 88000',
    model_source: 'RL option pricing adaptation',
    rl_policy_score: 84.2,
    premium_estimate: 1523.42,
    delta: -0.2875,
    gamma: 0.000041,
    recommended_contracts: 0.19,
  },
}

describe('HedgeCard options details', () => {
  it('shows the option contract snapshot with RL pricing fields', () => {
    render(<HedgeCard strategy={strategy} />)

    expect(screen.getByText('BTC-20260612-88000-P')).toBeInTheDocument()
    expect(screen.getByText('Put')).toBeInTheDocument()
    expect(screen.getByText('88000')).toBeInTheDocument()
    expect(screen.getByText('2026-06-12')).toBeInTheDocument()
    expect(screen.getByText('14 天')).toBeInTheDocument()
    expect(screen.getByText('Protects downside below 88000')).toBeInTheDocument()
    expect(screen.getByText('RL option pricing adaptation')).toBeInTheDocument()
    expect(screen.getByText('84.2/100')).toBeInTheDocument()
    expect(screen.getByText('1523.42 USDT')).toBeInTheDocument()
    expect(screen.getByText('-0.2875')).toBeInTheDocument()
    expect(screen.getByText('0.19')).toBeInTheDocument()
  })
})
