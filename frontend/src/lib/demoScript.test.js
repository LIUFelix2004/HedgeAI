import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const demoScript = readFileSync(resolve(__dirname, '../../..', 'DEMO.md'), 'utf8')

describe('DEMO.md fixed three-minute path', () => {
  it('documents the no-key demo flow with local fallback and safe execution language', () => {
    expect(demoScript).toContain('加载 Demo 仓位')
    expect(demoScript).toContain('无需模型 API Key')
    expect(demoScript).toContain('本地兜底')
    expect(demoScript).toContain('安全阻断')
    expect(demoScript).not.toContain('准备至少一个可用模型 API Key')
    expect(demoScript).not.toContain('返回 Injective Demo 交易哈希')
  })
})
