import ReactMarkdown from 'react-markdown'
import { COPY } from '../lib/copy'
import HedgeCard from './HedgeCard'

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '8px 14px',
          margin: '10px auto',
          fontSize: 11,
          color: 'var(--muted)',
          background: 'rgba(120,166,200,0.1)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          width: 'fit-content',
        }}
      >
        {message.content}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 12,
        marginBottom: 22,
        animation: 'fadeUp 0.3s ease',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          flexShrink: 0,
          background: isUser
            ? 'linear-gradient(135deg, rgba(120,166,200,0.14), rgba(79,210,139,0.1))'
            : 'linear-gradient(135deg, rgba(79,210,139,0.22), rgba(120,166,200,0.16))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: isUser ? 'var(--accent2)' : 'var(--success)',
          border: '1px solid var(--border)',
        }}
      >
        {isUser ? COPY.userLabel : 'AI'}
      </div>

      <div style={{ maxWidth: '80%' }}>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            marginBottom: 7,
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {isUser ? COPY.userLabel : COPY.assistantLabel}
          {message.model && (
            <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
              · {message.model}
            </span>
          )}
        </div>

        <div
          style={{
            padding: '16px 18px',
            borderRadius: 'var(--panel-radius)',
            background: isUser ? 'rgba(15,25,36,0.94)' : 'var(--surface-strong)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          {message.typing ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    animation: `pulse 1.2s ease ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="prose-hedge">
              <ReactMarkdown>{message.content || ''}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.fallback_reason && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--warn)', background: 'rgba(183,121,31,0.1)', padding: '4px 10px', borderRadius: 999 }}>
              {COPY.localFallback}
            </span>
          </div>
        )}

        {message.strategies?.map(s => (
          <HedgeCard key={s.id} strategy={s} />
        ))}

        {message.risk_level && (
          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderRadius: 999,
              background: message.risk_level === 'HIGH' ? 'var(--danger-soft)' : 'var(--warn-soft)',
                color: message.risk_level === 'HIGH' ? 'var(--danger)' : 'var(--warn)',
                border: `1px solid ${message.risk_level === 'HIGH' ? 'rgba(217,75,96,0.18)' : 'rgba(183,121,31,0.2)'}`,
              }}
            >
              {COPY.riskLevel}：{message.risk_level}
            </span>
            {message.liquidation_distance_pct !== undefined && (
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                {COPY.liquidationDistance}：{message.liquidation_distance_pct}%
              </span>
            )}
          </div>
        )}

        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.id).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
