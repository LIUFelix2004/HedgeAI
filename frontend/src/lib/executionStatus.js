import { COPY } from './copy'

export function getExecutionStatusCopy(result = {}) {
  const mode = result.execution_mode || (result.demo ? 'demo' : 'real')
  if (mode === 'demo' || mode === 'dry_run') {
    return {
      title: COPY.strategy.demoSubmitted,
      tone: 'demo',
    }
  }

  return {
    title: COPY.strategy.submitTrade,
    tone: 'real',
  }
}
