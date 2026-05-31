import { AlertTriangle, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { sendChatMessage } from '../lib/chat'
import { COPY } from '../lib/copy'
import { useStore } from '../lib/store'

export default function RiskBanner() {
  const { riskAlerts } = useStore()
  const [dismissed, setDismissed] = useState(new Set())

  const visible = riskAlerts.filter(a => !dismissed.has(a.id))
  if (!visible.length) return null

  return (
    <div style={{ flexShrink: 0, padding: '0 24px 10px' }}>
      {visible.map(alert => (
        <div
          key={alert.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            background: 'rgba(255,111,127,0.1)',
            border: '1px solid rgba(255,111,127,0.2)',
            borderRadius: 'var(--panel-radius)',
            boxShadow: 'var(--shadow)',
            animation: 'fadeUp 0.3s ease',
          }}
        >
          <AlertTriangle size={14} color="var(--danger)" />
          <span style={{ fontSize: 12, color: '#f0c3c8', flex: 1 }}>
            <strong style={{ color: 'var(--danger)' }}>[{alert.platform.toUpperCase()}]</strong>
            {' '}{alert.message}
          </span>
          <button
            onClick={() => sendChatMessage(
              COPY.riskBanner.analyzePrompt(alert.message),
              { displayText: COPY.riskBanner.analyzeDisplay(alert.symbol) }
            )}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 10,
              color: '#f0b2ba',
              background: 'rgba(255,111,127,0.08)',
              border: '1px solid rgba(255,111,127,0.18)',
              padding: '5px 9px',
              borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={10} />
            {COPY.generateAdvice}
          </button>
          <span style={{ fontSize: 10, color: 'var(--danger)', background: 'var(--danger-soft)', padding: '4px 8px', borderRadius: 8 }}>
            {alert.severity}
          </span>
          <button
            onClick={() => setDismissed(d => new Set([...d, alert.id]))}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2 }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
