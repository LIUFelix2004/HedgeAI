import { Settings2 } from 'lucide-react'
import { Settings2, Sparkles, Activity } from 'lucide-react'
import { useStore } from '../lib/store'
import { COPY } from '../lib/copy'
import PlatformLogo, { getPlatformName } from './PlatformLogo'

const PLATFORM_META = {
  hyperliquid: { color: '#4fd28b' },
  injective: { color: '#78a6c8' },
  polymarket: { color: '#9bbbd7' },
  binance: { color: '#d6a84d' },
}

function getConnectionStatusTone(account) {
  if (account.connected) {
    return { color: 'var(--success)', opacity: 1, pulse: true }
  }
  return { color: 'var(--muted)', opacity: 0.62, pulse: false }
}

function HedgeAiLogo() {
  return (
    <div
      role="img"
      aria-label="HedgeAI shield market logo"
      style={{
        width: 38,
        height: 38,
        borderRadius: 13,
        background: 'linear-gradient(145deg, rgba(11,17,25,0.94), rgba(22,35,46,0.92))',
        border: '1px solid rgba(120,166,200,0.28)',
        boxShadow: 'inset 0 1px 0 rgba(242,247,251,0.08), 0 10px 22px rgba(79,210,139,0.13)',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width="25"
        height="25"
        viewBox="0 0 25 25"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12.5 2.9L20 5.65V11.3C20 15.95 17.05 20.05 12.5 21.75C7.95 20.05 5 15.95 5 11.3V5.65L12.5 2.9Z"
          fill="rgba(79,210,139,0.1)"
          stroke="#78a6c8"
          strokeWidth="1.45"
          strokeLinejoin="round"
        />
        <path
          d="M7.8 13.25H10.1L11.55 9.35L13.8 15.55L15.2 11.7H17.2"
          stroke="#4fd28b"
          strokeWidth="1.55"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.2 7.25H16.8"
          stroke="#d6a84d"
          strokeWidth="1.15"
          strokeLinecap="round"
          opacity="0.72"
        />
      </svg>
    </div>
  )
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
        gridTemplateColumns: 'minmax(220px, 280px) 1fr',
        gap: 14,
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
        className="glass-panel topbar-surface topbar-brand-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '0 16px',
          borderRadius: 'var(--topbar-radius)',
        }}
      >
        <HedgeAiLogo />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>HedgeAI</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{COPY.appSubtitle}</div>
        </div>
      </div>

      <div
        className="topbar-controls"
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'flex-end',
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
          const statusTone = getConnectionStatusTone(acc)
          return (
            <div
              key={key}
              className="platform-status-pill topbar-surface"
              tabIndex={0}
              aria-label={`${getPlatformName(key)} ${acc.connected ? 'connected' : 'disconnected'}`}
              style={{
                '--platform-color': meta.color,
                background: 'rgba(11,17,25,0.72)',
                border: '1px solid var(--border)',
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
                className={`platform-status-dot${statusTone.pulse ? ' animate-pulse-dot' : ''}`}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: statusTone.color,
                  opacity: statusTone.opacity,
                  background: acc.connected ? meta.color : '#c4cee0',
                  boxShadow: acc.connected ? `0 0 6px ${meta.color}44` : 'none',
                }}
              />
              <PlatformLogo platform={key} size={16} />
              <span
                className="platform-status-name"
                style={{ color: meta.color, opacity: acc.connected ? undefined : 0.72 }}
              >
                {getPlatformName(key)}
              <span style={{ fontSize: 10, color: acc.connected ? meta.color : '#9aa5ba', fontWeight: 700, letterSpacing: '0.02em' }}>
                {meta.short}
              </span>
            </div>
          )
        })}

        <button
          onClick={toggleSettings}
          className="glass-panel topbar-surface topbar-settings-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 16px',
            borderRadius: 'var(--topbar-radius)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <Settings2 size={15} />
          {COPY.settings}
        </button>
      </div>
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
