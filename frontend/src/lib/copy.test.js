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
})
