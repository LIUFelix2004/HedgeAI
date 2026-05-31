import { useState } from 'react'
import { X, Check, Loader, LogOut } from 'lucide-react'
import { useStore } from '../lib/store'
import { COPY } from '../lib/copy'
import { connectAccount, disconnectAccount as disconnectAccountApi, fetchPositions } from '../lib/api'
import PlatformLogo from './PlatformLogo'

const PLATFORMS = [
  {
    key: 'hyperliquid',
    name: 'Hyperliquid',
    color: '#4fd28b',
    fields: [
      { key: 'address', label: COPY.settingsPanel.platforms.hyperliquid.fields.address, type: 'text' },
      { key: 'privateKey', label: COPY.settingsPanel.platforms.hyperliquid.fields.privateKey, type: 'password' },
    ],
    hint: COPY.settingsPanel.platforms.hyperliquid.hint,
  },
  {
    key: 'injective',
    name: 'Injective',
    color: '#78a6c8',
    fields: [
      { key: 'address', label: COPY.settingsPanel.platforms.injective.fields.address, type: 'text' },
      { key: 'privateKey', label: COPY.settingsPanel.platforms.injective.fields.privateKey, type: 'password' },
    ],
    hint: COPY.settingsPanel.platforms.injective.hint,
  },
  {
    key: 'polymarket',
    name: 'Polymarket',
    color: '#9bbbd7',
    fields: [
      { key: 'apiKey', label: COPY.settingsPanel.platforms.polymarket.fields.apiKey, type: 'password' },
    ],
    hint: COPY.settingsPanel.platforms.polymarket.hint,
  },
  {
    key: 'binance',
    name: 'Binance',
    color: '#d6a84d',
    fields: [
      { key: 'apiKey', label: COPY.settingsPanel.platforms.binance.fields.apiKey, type: 'text' },
      { key: 'apiSecret', label: COPY.settingsPanel.platforms.binance.fields.apiSecret, type: 'password' },
    ],
    hint: COPY.settingsPanel.platforms.binance.hint,
  },
]

const MODELS = [
  { key: 'claude', label: 'Claude Sonnet', sub: COPY.settingsPanel.models.claude, color: '#78a6c8' },
  { key: 'gpt4o', label: 'GPT-4o', sub: COPY.settingsPanel.models.gpt4o, color: '#9bbbd7' },
  { key: 'deepseek', label: 'DeepSeek', sub: COPY.settingsPanel.models.deepseek, color: '#d6a84d' },
  { key: 'grok', label: 'Grok', sub: COPY.settingsPanel.models.grok, color: '#4fd28b' },
]

export default function SettingsPanel() {
  const {
    accounts,
    setAccountField,
    setAccountConnected,
    disconnectAccountState,
    toggleSettings,
    model,
    setModel,
    modelConfigs,
    setModelConfigField,
  } = useStore()
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})

  async function handleConnect(platform) {
    setLoading(l => ({ ...l, [platform]: true }))
    setErrors(e => ({ ...e, [platform]: null }))

    const creds = {}
    PLATFORMS.find(p => p.key === platform).fields.forEach(f => {
      creds[f.key] = accounts[platform][f.key] || ''
    })

    try {
      const res = await connectAccount(platform, creds)
      let positions = res.data?.positions || []

      try {
        const positionsRes = await fetchPositions(platform)
        positions = positionsRes.data?.positions || positions
      } catch {
        // Keep connection state even if the follow-up fetch fails.
      }

      setAccountConnected(platform, true, { ...res.data, positions })
    } catch (e) {
      setErrors(er => ({
        ...er,
        [platform]: e.response?.data?.detail || COPY.settingsPanel.connectionFailed,
      }))
    } finally {
      setLoading(l => ({ ...l, [platform]: false }))
    }
  }

  async function handleDisconnect(platform) {
    const loadingKey = `${platform}:disconnect`
    setLoading(l => ({ ...l, [loadingKey]: true }))
    setErrors(e => ({ ...e, [platform]: null }))

    try {
      await disconnectAccountApi(platform)
      disconnectAccountState(platform)
    } catch (e) {
      setErrors(er => ({
        ...er,
        [platform]: e.response?.data?.detail || COPY.settingsPanel.connectionFailed,
      }))
    } finally {
      setLoading(l => ({ ...l, [loadingKey]: false }))
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(1,5,10,0.68)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'flex-end',
      }}
      onClick={toggleSettings}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '100%',
          height: '100vh',
          overflowY: 'auto',
          background: 'rgba(8,14,21,0.96)',
          borderLeft: '1px solid var(--border-strong)',
          padding: 24,
          animation: 'fadeUp 0.25s ease',
          boxShadow: '-24px 0 70px rgba(0,0,0,0.42)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{COPY.settings}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{COPY.settingsPanel.subtitle}</div>
          </div>
          <button onClick={toggleSettings} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: 'var(--accent2)', letterSpacing: '0.12em', marginBottom: 12 }}>
            {COPY.settingsPanel.modelSection}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MODELS.map(m => (
              <div
                key={m.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 'var(--panel-radius)',
                  background: model === m.key ? `${m.color}12` : 'var(--surface-soft)',
                  border: `1px solid ${model === m.key ? `${m.color}35` : 'var(--border)'}`,
                }}
              >
                <div
                  onClick={() => setModel(m.key)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: model === m.key ? m.color : 'var(--text)' }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{m.sub}</div>
                  </div>
                  {model === m.key && <Check size={14} color={m.color} />}
                </div>

                <input
                  type="password"
                  placeholder={COPY.settingsPanel.apiKeyPlaceholder(m.label)}
                  value={modelConfigs[m.key]?.apiKey || ''}
                  onChange={e => setModelConfigField(m.key, 'apiKey', e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(5,9,14,0.74)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                    padding: '8px 12px',
                    fontSize: 12,
                    outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 10, color: 'var(--accent2)', letterSpacing: '0.12em', marginBottom: 12 }}>
          {COPY.settingsPanel.accountSection}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PLATFORMS.map(platform => {
            const acc = accounts[platform.key]
            return (
              <div
                key={platform.key}
                style={{
                  padding: 16,
                  borderRadius: 'var(--panel-radius)',
                  background: 'var(--surface-soft)',
                  border: `1px solid ${acc.connected ? `${platform.color}28` : 'var(--border)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <PlatformLogo platform={platform.key} size={18} muted={!acc.connected} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{platform.name}</span>
                  {acc.connected && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: platform.color, background: `${platform.color}14`, padding: '4px 8px', borderRadius: 999 }}>
                      {COPY.settingsPanel.connected}
                    </span>
                  )}
                </div>

                {platform.fields.map(field => (
                  <input
                    key={field.key}
                    type={field.type}
                    placeholder={field.label}
                    value={acc[field.key] || ''}
                    onChange={e => setAccountField(platform.key, field.key, e.target.value)}
                    style={{
                      width: '100%',
                      marginBottom: 8,
                      background: 'rgba(5,9,14,0.74)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      padding: '8px 12px',
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                ))}

                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
                  {platform.hint}
                </div>

                {acc.positions?.length > 0 && (
                  <div style={{ fontSize: 10, color: platform.color, marginBottom: 10 }}>
                    {COPY.settingsPanel.syncedPositions(acc.positions.length)}
                  </div>
                )}

                {errors[platform.key] && (
                  <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 8 }}>
                    {errors[platform.key]}
                  </div>
                )}

                <button
                  onClick={() => handleConnect(platform.key)}
                  disabled={loading[platform.key]}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: acc.connected ? `${platform.color}12` : `${platform.color}16`,
                    border: `1px solid ${platform.color}28`,
                    borderRadius: 8,
                    color: platform.color,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {loading[platform.key]
                    ? <><Loader size={12} className="animate-spin-slow" /> {COPY.settingsPanel.connecting}</>
                    : acc.connected ? COPY.settingsPanel.reconnect : COPY.settingsPanel.connect}
                </button>
                {acc.connected && (
                  <button
                    onClick={() => handleDisconnect(platform.key)}
                    disabled={loading[`${platform.key}:disconnect`]}
                    style={{
                      width: '100%',
                      marginTop: 8,
                      padding: '10px',
                      background: 'rgba(255,111,127,0.08)',
                      border: '1px solid rgba(255,111,127,0.22)',
                      borderRadius: 8,
                      color: 'var(--danger)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    {loading[`${platform.key}:disconnect`]
                      ? <><Loader size={12} className="animate-spin-slow" /> {COPY.settingsPanel.connecting}</>
                      : <><LogOut size={12} /> {COPY.settingsPanel.disconnect}</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>
          {COPY.settingsPanel.privateKeyNotice}
        </div>
      </div>
    </div>
  )
}
