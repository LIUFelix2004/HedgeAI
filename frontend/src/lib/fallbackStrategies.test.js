import { describe, expect, it } from 'vitest'
import { buildFallbackAnalysis } from './fallbackStrategies'

const btcPosition = {
  platform: 'injective',
  symbol: 'BTC/USDT',
  direction: 'long',
  size: 5400,
  leverage: 10,
  current_price: 83500,
  liquidation_distance_pct: 4.2,
  unrealized_pnl_pct: -8.3,
}

describe('buildFallbackAnalysis', () => {
  it('builds three local fallback strategies from a high-risk BTC long position', () => {
    const analysis = buildFallbackAnalysis({
      accounts: [
        {
          platform: 'injective',
          connected: true,
          positions: [btcPosition],
        },
      ],
      riskAlerts: [
        {
          severity: 'IMMEDIATE',
          symbol: 'BTC/USDT',
          position: btcPosition,
        },
      ],
      reason: 'stream failed',
    })

    expect(analysis.fallback_reason).toContain('stream failed')
    expect(analysis.source).toBe('fallback')
    expect(analysis.confidence).toBe('local-rule')
    expect(analysis.strategies).toHaveLength(3)
    expect(analysis.strategies.map(s => s.type)).toEqual(['REVERSE_HEDGE', 'POLYMARKET', 'OPTIONS'])
    expect(analysis.strategies.every(s => s.source === 'fallback')).toBe(true)
    expect(analysis.strategies[0].title).toContain('BTC')
    expect(analysis.risk_level).toBe('HIGH')
    expect(analysis.liquidation_distance_pct).toBe(4.2)
  })

  it('returns a demo loading prompt when no position is available', () => {
    const analysis = buildFallbackAnalysis({
      accounts: [],
      riskAlerts: [],
      reason: 'no account',
    })

    expect(analysis.strategies).toEqual([])
    expect(analysis.source).toBe('fallback')
    expect(analysis.confidence).toBe('local-rule')
    expect(analysis.content).toContain('加载 Demo 仓位')
  })
})
