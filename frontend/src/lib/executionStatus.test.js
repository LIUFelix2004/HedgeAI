import { describe, expect, it } from 'vitest'
import { getExecutionStatusCopy } from './executionStatus'

describe('getExecutionStatusCopy', () => {
  it('labels demo execution without implying a real submitted trade', () => {
    const status = getExecutionStatusCopy({
      success: true,
      venue: 'polymarket',
      execution_mode: 'demo',
      order_id: 'mock-pm-order-001',
    })

    expect(status.title).toContain('模拟')
    expect(status.title).not.toContain('交易已提交')
    expect(status.tone).toBe('demo')
  })

  it('labels dry-run execution as an order preview', () => {
    const status = getExecutionStatusCopy({
      success: true,
      execution_mode: 'dry_run',
    })

    expect(status.title).toContain('订单预览')
    expect(status.title).not.toContain('交易已提交')
    expect(status.tone).toBe('dry_run')
  })

  it('keeps real execution copy explicit for live results', () => {
    const status = getExecutionStatusCopy({
      success: true,
      venue: 'injective',
      execution_mode: 'real',
      tx_hash: '0xabc',
    })

    expect(status.title).toContain('交易已提交')
    expect(status.tone).toBe('real')
  })
})
