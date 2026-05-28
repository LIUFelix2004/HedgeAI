import { Settings2, Sparkles } from 'lucide-react'
import { useStore } from '../lib/store'
import { COPY } from '../lib/copy'

const PLATFORM_META = {
  hyperliquid: { label: 'HL', color: '#37b37e' },
  injective: { label: 'INJ', color: '#4f7cff' },
  polymarket: { label: 'PM', color: '#8d6af9' },
  binance: { label: 'BN', color: '#e2a23b' },
}

export default function TopBar() {
  const { accounts, toggleSettings } = useStore()

  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 280px) 1fr auto',
        gap: 14,
        alignItems: 'center',
        padding: '18px 24px 12px',
        flexShrink: 0,
        position: 'relative',
        zIndex: 20,
      }}
    >
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '12px 16px',
          borderRadius: 24,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #82a8ff, #5f82ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}
        >
          <Sparkles size={17} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>HedgeAI</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{COPY.appSubtitle}</div>
        </div>
      </div>

      <div
        className="glass-panel"
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '10px 14px',
          borderRadius: 999,
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        {Object.entries(accounts).map(([key, acc]) => {
          const meta = PLATFORM_META[key]
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 11px',
                borderRadius: 999,
                background: acc.connected ? `${meta.color}16` : 'rgba(103,124,169,0.08)',
                border: `1px solid ${acc.connected ? `${meta.color}33` : 'rgba(103,124,169,0.12)'}`,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: acc.connected ? meta.color : '#a8b4cf',
                }}
                className={acc.connected ? 'animate-pulse-dot' : ''}
              />
              <span style={{ fontSize: 11, color: acc.connected ? meta.color : '#7d89a4', fontWeight: 600 }}>
                {meta.label}
              </span>
            </div>
          )
        })}
      </div>

      <button
        onClick={toggleSettings}
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px',
          borderRadius: 24,
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <Settings2 size={15} />
        {COPY.settings}
      </button>
    </header>
  )
}
