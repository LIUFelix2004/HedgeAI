import { Settings2, Sparkles, Activity } from 'lucide-react'
import { useStore } from '../lib/store'
import { COPY } from '../lib/copy'

const PLATFORM_META = {
  hyperliquid: { label: 'Hyperliquid', short: 'HL', color: '#37b37e' },
  injective: { label: 'Injective', short: 'INJ', color: '#4f7cff' },
  polymarket: { label: 'Polymarket', short: 'PM', color: '#8d6af9' },
  binance: { label: 'Binance', short: 'BN', color: '#e2a23b' },
}

export default function TopBar() {
  const { accounts, toggleSettings, activeView, setActiveView } = useStore()
  const connectedCount = Object.values(accounts).filter(a => a.connected).length

  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto auto',
        gap: 12,
        alignItems: 'center',
        padding: '16px 24px 12px',
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
          gap: 6,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 14px',
          borderRadius: 999,
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        <Activity size={12} color="var(--muted)" style={{ flexShrink: 0, marginRight: 4 }} />
        {Object.entries(accounts).map(([key, acc]) => {
          const meta = PLATFORM_META[key]
          return (
            <div
              key={key}
              title={`${meta.label}${acc.connected ? ' - 已连接' : ' - 未连接'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 10px',
                borderRadius: 999,
                background: acc.connected ? `${meta.color}14` : 'rgba(103,124,169,0.06)',
                border: `1px solid ${acc.connected ? `${meta.color}28` : 'rgba(103,124,169,0.1)'}`,
                flexShrink: 0,
                transition: 'all 0.2s ease',
                cursor: 'default',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: acc.connected ? meta.color : '#c4cee0',
                  boxShadow: acc.connected ? `0 0 6px ${meta.color}44` : 'none',
                }}
                className={acc.connected ? 'animate-pulse-dot' : ''}
              />
              <span style={{ fontSize: 10, color: acc.connected ? meta.color : '#9aa5ba', fontWeight: 700, letterSpacing: '0.02em' }}>
                {meta.short}
              </span>
            </div>
          )
        })}
        {connectedCount > 0 && (
          <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 4, flexShrink: 0 }}>
            {connectedCount}/{Object.keys(accounts).length}
          </span>
        )}
      </div>

      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          borderRadius: 999,
        }}
      >
        {[
          { key: 'chat', label: '对话' },
          { key: 'history', label: '历史' },
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveView(tab.key)}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '8px 14px',
              background: activeView === tab.key ? 'rgba(79,124,255,0.12)' : 'transparent',
              color: activeView === tab.key ? '#3657bc' : '#6f7d99',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <button
        onClick={toggleSettings}
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderRadius: 999,
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          transition: 'all 0.2s ease',
        }}
      >
        <Settings2 size={14} />
        {COPY.settings}
      </button>
    </header>
  )
}
