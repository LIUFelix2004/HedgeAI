import { describe, expect, it } from 'vitest'
import { COPY } from './copy'

const mojibakeFragments = [
  '\u951b',
  '\u7481',
  '\u9428',
  '\u7edb',
  '\u95bf',
  '\u5a06',
  '\u59ab',
  '\u6d63',
  '\u934d',
  '\u6fc2',
  '\u6af3',
]

describe('COPY', () => {
  it('provides the core demo labels without mojibake', () => {
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

      for (const fragment of mojibakeFragments) {
        expect(COPY[key], `${key} contains mojibake fragment ${fragment}`).not.toContain(fragment)
      }
    }
  })

  it('centralizes the visible workflow copy for P0-3', () => {
    expect(COPY.chatInput.quickPrompts).toHaveLength(5)
    expect(COPY.chatInput.placeholder).toContain('描述你的仓位')
    expect(COPY.settingsPanel.subtitle).toContain('连接真实账户')
    expect(COPY.settingsPanel.platforms.hyperliquid.fields.privateKey).toContain('执行用')
    expect(COPY.app.autoRiskPrompt()).toContain('三套可执行的对冲方案')
    expect(COPY.riskBanner.analyzePrompt('BTC 风险')).toContain('BTC 风险')
    expect(COPY.strategy.executing).toContain('准备')
    expect(COPY.strategy.demoSubmitted).toContain('模拟')
  })

  it('does not make the default demo welcome depend on a model key or real positions', () => {
    expect(COPY.welcome).toContain('加载 Demo 仓位')
    expect(COPY.welcome).not.toContain('先在设置里填入模型 API Key')
    expect(COPY.welcome).not.toContain('基于真实仓位')
  })
})
