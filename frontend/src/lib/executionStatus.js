import { COPY } from './copy'

export function getExecutionStatusCopy(result = {}) {
  const mode = result.execution_mode || (result.demo ? 'demo' : 'real')
  if (mode === 'demo' || mode === 'dry_run') {
    return {
      title: mode === 'dry_run' ? COPY.strategy.dryRunReady : COPY.strategy.demoSubmitted,
      tone: mode,
    }
  }

  return {
    title: COPY.strategy.submitTrade,
    tone: 'real',
  }
}
