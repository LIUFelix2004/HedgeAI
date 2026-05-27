import { useState } from 'react'
import { X, Check, Loader } from 'lucide-react'
import { useStore } from '../lib/store'
import { connectAccount, fetchPositions } from '../lib/api'

const PLATFORMS = [
  {
    key: 'hyperliquid',
    name: 'Hyperliquid',
    color: '#37b37e',
    icon: 'HL',
    fields: [
      { key: 'address', label: '账户地址', type: 'text' },
      { key: 'privateKey', label: 'API 钱包私钥（执行用）', type: 'password' },
    ],
    hint: '读取仓位只需要账户地址；真实下单需要 API 钱包私钥。出于安全考虑，私钥不会在刷新后保留。',
  },
  {
    key: 'injective',
    name: 'Injective',
    color: '#4f7cff',
    icon: 'INJ',
    fields: [
      { key: 'address', label: '钱包地址', type: 'text' },
      { key: 'privateKey', label: '私钥（执行用）', type: 'password' },
    ],
    hint: '读取链上仓位使用地址；真实链上执行需要私钥。出于安全考虑，私钥不会在刷新后保留。',
  },
  {
    key: 'polymarket',
    name: 'Polymarket',
    color: '#8d6af9',
    icon: 'PM',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
    hint: '当前主要用于策略展示，真实自动下单暂未作为本轮 Demo 主路径。',
  },
  {
    key: 'binance',
    name: 'Binance',
    color: '#e2a23b',
    icon: 'BN',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'text' },
      { key: 'apiSecret', label: 'API Secret', type: 'password' },
    ],
    hint: 'Binance 暂为预留入口，建议当前 Demo 不作为主链路使用。',
  },
]

const MODELS = [
  { key: 'claude', label: 'Claude Sonnet', sub: '结构化分析稳定，中文表达自然', color: '#4f7cff' },
  { key: 'gpt4o', label: 'GPT-4o', sub: '通用能力均衡，适合快速试跑', color: '#5b8fff' },
  { key: 'deepseek', label: 'DeepSeek', sub: '中文体验自然，成本更友好', color: '#7b6cf6' },
  { key: 'grok', label: 'Grok', sub: 'xAI 接口备选模型', color: '#37b37e' },
]

export default function SettingsPanel() {
  const {
    accounts,
    setAccountField,
    setAccountConnected,
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
        [platform]: e.response?.data?.detail || '连接失败，请检查地址、私钥或网络。',
      }))
    } finally {
      setLoading(l => ({ ...l, [platform]: false }))
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(126,145,191,0.18)',
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
          background: 'rgba(255,255,255,0.92)',
          borderLeft: '1px solid rgba(116,140,193,0.16)',
          padding: 24,
          animation: 'fadeUp 0.25s ease',
          boxShadow: '-20px 0 44px rgba(102,121,166,0.12)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>设置</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>连接真实账户并配置模型与执行凭证</div>
          </div>
          <button onClick={toggleSettings} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: '#5d7cff', letterSpacing: '0.12em', marginBottom: 12 }}>
            AI 模型
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
                  borderRadius: 16,
                  background: model === m.key ? `${m.color}12` : '#f8faff',
                  border: `1px solid ${model === m.key ? `${m.color}35` : 'rgba(116,140,193,0.12)'}`,
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
                  placeholder={`${m.label} 的 API Key`}
                  value={modelConfigs[m.key]?.apiKey || ''}
                  onChange={e => setModelConfigField(m.key, 'apiKey', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid rgba(116,140,193,0.16)',
                    borderRadius: 12,
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

        <div style={{ fontSize: 10, color: '#5d7cff', letterSpacing: '0.12em', marginBottom: 12 }}>
          交易账户
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PLATFORMS.map(platform => {
            const acc = accounts[platform.key]
            return (
              <div
                key={platform.key}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: '#f8faff',
                  border: `1px solid ${acc.connected ? `${platform.color}28` : 'rgba(116,140,193,0.12)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ color: platform.color, fontSize: 12, fontWeight: 700 }}>{platform.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{platform.name}</span>
                  {acc.connected && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: platform.color, background: `${platform.color}14`, padding: '4px 8px', borderRadius: 999 }}>
                      已连接
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
                      background: '#ffffff',
                      border: '1px solid rgba(116,140,193,0.16)',
                      borderRadius: 12,
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
                    已同步 {acc.positions.length} 条仓位
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
                    borderRadius: 14,
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
                    ? <><Loader size={12} className="animate-spin-slow" /> 连接中...</>
                    : acc.connected ? '重新连接' : '连接'}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>
          为了降低真实资金风险，交易私钥不会持久化到浏览器本地存储。刷新页面后请重新填写执行私钥。
        </div>
      </div>
    </div>
  )
}
