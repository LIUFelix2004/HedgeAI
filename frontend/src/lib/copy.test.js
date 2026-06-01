import { describe, expect, it } from 'vitest'
import { COPY } from './copy'

describe('COPY', () => {
  it('provides the core demo labels', () => {
    const requiredKeys = [
      'demoLoad',
      'generateAdvice',
      'executeStrategy',
      'localFallback',
      'settings',
    ]

    for (const key of requiredKeys) {
      expect(COPY[key], key).toEqual(expect.any(String))
      expect(COPY[key].length, key).toBeGreaterThan(0)
    }
  })

  it('expresses the Injective-native product framing', () => {
    expect(COPY.appSubtitle).toContain('Injective')
    expect(COPY.chatTitle).toContain('Injective')
    expect(COPY.chatInput.quickPrompts).toHaveLength(5)
    expect(COPY.chatInput.placeholder).toContain('Injective')
    expect(COPY.settingsPanel.subtitle).toContain('Injective Testnet Demo')
    expect(COPY.app.autoRiskPrompt()).toContain('Injective')
    expect(COPY.strategy.types.reverseHedge).toContain('Injective')
  })

  it('keeps the welcome flow demo-first', () => {
    expect(COPY.welcome).toContain('加载 Injective Demo')
    expect(COPY.welcome).toContain('Injective')
    expect(COPY.welcome).not.toContain('先在设置里填入模型 API Key')
  })
})
