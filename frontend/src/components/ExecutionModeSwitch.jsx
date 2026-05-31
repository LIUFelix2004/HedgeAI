import { COPY } from '../lib/copy'
import { useStore } from '../lib/store'

const MODES = [
  { key: 'demo', label: COPY.executionMode.demo },
  { key: 'dry_run', label: COPY.executionMode.dryRun },
  { key: 'real', label: COPY.executionMode.real },
]

export default function ExecutionModeSwitch() {
  const executionMode = useStore(s => s.executionMode)
  const setExecutionMode = useStore(s => s.setExecutionMode)

  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 8, background: 'rgba(123,157,183,0.1)', border: '1px solid var(--border)', gap: 3 }}>
      {MODES.map(mode => {
        const active = executionMode === mode.key
        return (
          <button
            key={mode.key}
            type="button"
            aria-pressed={active}
            onClick={() => setExecutionMode(mode.key)}
            style={{
              border: 'none',
              borderRadius: 6,
              padding: '6px 9px',
              background: active ? 'rgba(120,166,200,0.18)' : 'transparent',
              color: active ? 'var(--accent2)' : 'var(--muted)',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: active ? '0 8px 18px rgba(0,0,0,0.22)' : 'none',
            }}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
