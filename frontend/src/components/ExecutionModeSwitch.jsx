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
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 14, background: 'rgba(103,124,169,0.08)', gap: 3 }}>
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
              borderRadius: 11,
              padding: '6px 9px',
              background: active ? '#ffffff' : 'transparent',
              color: active ? '#3657bc' : '#7d89a4',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: active ? '0 6px 14px rgba(79,124,255,0.12)' : 'none',
            }}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
