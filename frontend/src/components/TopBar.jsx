import { Activity, Settings2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { COPY } from '../lib/copy'
import PlatformLogo, { getPlatformName } from './PlatformLogo'

const PLATFORM_META = {
  hyperliquid: { label: 'Hyperliquid', color: '#4fd28b' },
  injective: { label: 'Injective', color: '#78a6c8' },
  polymarket: { label: 'Polymarket', color: '#9bbbd7' },
  binance: { label: 'Binance', color: '#d6a84d' },
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
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(233,241,255,0.92))',
        border: '1px solid rgba(120,166,200,0.22)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 10px 22px rgba(102,121,166,0.12)',
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
          fill="rgba(79,210,139,0.08)"
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
}

export default function TopBar() {
  const { accounts, toggleSettings, activeView, setActiveView } = useStore()
  const connectedCount = Object.values(accounts).filter(account => account.connected).length

  return (
    <header
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 280px) 1fr auto',
        gap: 14,
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
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>HedgeAI</div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {COPY.appSubtitle}
          </div>
        </div>
      </div>

      <div
        className="glass-panel topbar-controls topbar-surface"
        style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 14px',
          borderRadius: 'var(--topbar-radius)',
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        <Activity size={12} color="var(--muted)" style={{ flexShrink: 0, marginRight: 4 }} />
        {Object.entries(accounts).map(([key, account]) => {
          const meta = PLATFORM_META[key]
          const statusTone = getConnectionStatusTone(account)
          return (
            <div
              key={key}
              className="platform-status-pill topbar-surface"
              tabIndex={0}
              aria-label={`${getPlatformName(key)} ${account.connected ? 'connected' : 'disconnected'}`}
              title={`${meta.label}${account.connected ? ' - 已连接' : ' - 未连接'}`}
              style={{
                '--platform-color': meta.color,
                background: account.connected ? 'rgba(255,255,255,0.9)' : 'rgba(244,248,255,0.72)',
                border: `1px solid ${account.connected ? `${meta.color}28` : 'rgba(116,140,193,0.14)'}`,
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
                  boxShadow: account.connected ? `0 0 6px ${meta.color}44` : 'none',
                  flexShrink: 0,
                }}
              />
              <PlatformLogo platform={key} size={16} muted={!account.connected} />
              <span
                className="platform-status-name"
                style={{ color: meta.color, opacity: account.connected ? 1 : 0.82 }}
              >
                {getPlatformName(key)}
              </span>
            </div>
          )
        })}

        {connectedCount > 0 && (
          <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 4, flexShrink: 0 }}>
            {connectedCount}/{Object.keys(accounts).length}
          </span>
        )}

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
            background: 'rgba(255,255,255,0.88)',
            flexShrink: 0,
          }}
        >
          <Settings2 size={15} />
          {COPY.settings}
        </button>
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
          { key: 'dashboard', label: '仪表盘' },
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
    </header>
  )
}
