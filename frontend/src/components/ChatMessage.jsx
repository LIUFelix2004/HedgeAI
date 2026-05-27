import ReactMarkdown from 'react-markdown'
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
          background: 'rgba(120,150,214,0.1)',
          borderRadius: 999,
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
          borderRadius: 12,
          flexShrink: 0,
          background: isUser
            ? 'linear-gradient(135deg, #edf1ff, #dde8ff)'
            : 'linear-gradient(135deg, #6f96ff, #8ab4ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: isUser ? '#3557bc' : '#fff',
          border: isUser ? '1px solid rgba(109,133,184,0.12)' : 'none',
        }}
      >
        {isUser ? '你' : 'AI'}
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
          {isUser ? '你' : 'HedgeAI'}
          {message.model && (
            <span style={{ marginLeft: 6, color: '#7a92d6' }}>
              · {message.model}
            </span>
          )}
        </div>

        <div
          style={{
            padding: '16px 18px',
            borderRadius: isUser ? '22px 10px 22px 22px' : '10px 22px 22px 22px',
            background: isUser ? '#edf3ff' : '#ffffff',
            border: `1px solid ${isUser ? 'rgba(116,140,193,0.18)' : 'rgba(116,140,193,0.12)'}`,
            boxShadow: '0 10px 24px rgba(112,130,173,0.08)',
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
                background: message.risk_level === 'HIGH' ? 'rgba(217,75,96,0.12)' : 'rgba(183,121,31,0.12)',
                color: message.risk_level === 'HIGH' ? 'var(--danger)' : 'var(--warn)',
                border: `1px solid ${message.risk_level === 'HIGH' ? 'rgba(217,75,96,0.18)' : 'rgba(183,121,31,0.2)'}`,
              }}
            >
              风险等级：{message.risk_level}
            </span>
            {message.liquidation_distance_pct !== undefined && (
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                距强平：{message.liquidation_distance_pct}%
              </span>
            )}
          </div>
        )}

        <div style={{ fontSize: 10, color: '#93a0bc', marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.id).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
