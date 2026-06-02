import { AlertTriangle, Sparkles, X, ShieldAlert } from 'lucide-react'
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
    <div style={{ flexShrink: 0, padding: '0 24px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map(alert => {
        const isImmediate = alert.severity === 'IMMEDIATE'
        return (
          <div
            key={alert.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              background: isImmediate ? 'rgba(217,75,96,0.07)' : 'rgba(183,121,31,0.06)',
              border: `1px solid ${isImmediate ? 'rgba(217,75,96,0.16)' : 'rgba(183,121,31,0.14)'}`,
              borderRadius: 16,
              boxShadow: '0 8px 20px rgba(112,130,173,0.06)',
              animation: 'fadeUp 0.3s ease',
            }}
          >
            {isImmediate
              ? <ShieldAlert size={14} color="var(--danger)" style={{ flexShrink: 0 }} />
              : <AlertTriangle size={14} color="var(--warn)" style={{ flexShrink: 0 }} />
            }
            <span style={{ fontSize: 12, color: isImmediate ? '#8b4450' : '#7a6020', flex: 1, lineHeight: 1.5 }}>
              <strong style={{ color: isImmediate ? 'var(--danger)' : 'var(--warn)' }}>
                [{alert.platform.toUpperCase()}]
              </strong>
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
                gap: 5,
                fontSize: 10,
                fontWeight: 600,
                color: isImmediate ? '#ad5e6b' : '#8a6d1f',
                background: 'rgba(255,255,255,0.7)',
                border: `1px solid ${isImmediate ? 'rgba(217,75,96,0.14)' : 'rgba(183,121,31,0.14)'}`,
                padding: '5px 10px',
                borderRadius: 999,
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <Sparkles size={10} />
              AI 分析
            </button>
            <span style={{
              fontSize: 9,
              fontWeight: 800,
              color: isImmediate ? '#d94b60' : '#b7791f',
              background: isImmediate ? 'rgba(217,75,96,0.1)' : 'rgba(183,121,31,0.1)',
              padding: '3px 7px',
              borderRadius: 999,
              letterSpacing: '0.03em',
              flexShrink: 0,
            }}>
              {alert.severity === 'IMMEDIATE' ? '紧急' : '监控'}
            </span>
            <button
              onClick={() => setDismissed(d => new Set([...d, alert.id]))}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 2, flexShrink: 0 }}
            >
              <X size={12} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
