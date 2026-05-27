import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Loader } from 'lucide-react'
import { executeHedge } from '../lib/api'
import { useStore } from '../lib/store'

const STRATEGY_META = {
  REVERSE_HEDGE: { icon: '⇄', color: '#4f7cff', label: '反向对冲' },
  POLYMARKET: { icon: '◌', color: '#8d6af9', label: 'Polymarket' },
  OPTIONS: { icon: '◍', color: '#37b37e', label: '期权保护' },
}

export default function HedgeCard({ strategy, onExecuted }) {
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const injectiveAddress = useStore(s => s.accounts.injective.address)
  const meta = STRATEGY_META[strategy.type] || STRATEGY_META.REVERSE_HEDGE

  async function handleExecute() {
    setState('loading')
    try {
      const res = await executeHedge({
        strategy,
        wallet_address: injectiveAddress || undefined,
      })
      setResult(res.data)
      setState(res.data?.success ? 'done' : 'error')
      onExecuted?.(res.data)
    } catch {
      setState('error')
    }
  }

  return (
    <div
      style={{
        background: '#ffffff',
        border: `1px solid ${meta.color}22`,
        borderRadius: 22,
        marginTop: 12,
        boxShadow: '0 14px 30px rgba(112,130,173,0.09)',
        overflow: 'hidden',
        animation: 'fadeUp 0.3s ease',
      }}
    >
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          padding: 18,
          background: 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: `${meta.color}12`,
              border: `1px solid ${meta.color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              color: meta.color,
              flexShrink: 0,
            }}
          >
            {meta.icon}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              方案 {strategy.id}：{strategy.title}
            </div>
            <div style={{ fontSize: 12, color: '#55627f', marginTop: 4 }}>
              {strategy.description}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Badge color={meta.color} label="类型" value={meta.label} />
              <Badge color={meta.color} label="对冲比例" value={strategy.hedge_ratio} />
              <Badge color={meta.color} label="复杂度" value={strategy.complexity} />
              <Badge color={meta.color} label="成本" value={strategy.estimated_cost} />
            </div>
          </div>

          <div style={{ color: '#7d8aaa', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px' }}>
          {strategy.reference_summary && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 14,
                marginBottom: 12,
                background: `${meta.color}0f`,
                border: `1px solid ${meta.color}18`,
                fontSize: 12,
                color: '#52617f',
                lineHeight: 1.7,
              }}
            >
              {strategy.reference_summary}
            </div>
          )}

          <div className="hedge-card-grid" style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(94,173,119,0.08)', border: '1px solid rgba(94,173,119,0.14)' }}>
              <div style={{ fontSize: 10, color: '#418a59', marginBottom: 4 }}>优点</div>
              <div style={{ fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>{strategy.pros}</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(217,75,96,0.07)', border: '1px solid rgba(217,75,96,0.14)' }}>
              <div style={{ fontSize: 10, color: 'var(--danger)', marginBottom: 4 }}>风险</div>
              <div style={{ fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>{strategy.cons}</div>
            </div>
          </div>

          {strategy.market_links?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                实时市场链接
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {strategy.market_links.map((link, idx) => (
                  <a
                    key={`${link.url}-${idx}`}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 14,
                      textDecoration: 'none',
                      background: '#f8fbff',
                      border: '1px solid rgba(116,140,193,0.14)',
                      color: '#3b4a68',
                    }}
                  >
                    <ExternalLink size={13} color={meta.color} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>
                        {link.label}
                        {link.venue ? ` · ${link.venue}` : ''}
                      </div>
                      {link.note && (
                        <div style={{ fontSize: 11, color: '#7c88a4', marginTop: 2 }}>
                          {link.note}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {strategy.injective_action && strategy.injective_action !== 'N/A' && (
            <div
              style={{
                padding: '9px 11px',
                borderRadius: 14,
                marginBottom: 12,
                background: 'rgba(79,124,255,0.06)',
                border: '1px solid rgba(79,124,255,0.15)',
                fontSize: 11,
                color: '#6680b8',
                fontFamily: 'monospace',
                lineHeight: 1.7,
              }}
            >
              {strategy.injective_action}
            </div>
          )}

          {state === 'idle' && (
            <button
              onClick={handleExecute}
              style={{
                width: '100%',
                padding: '11px',
                background: `${meta.color}14`,
                border: `1px solid ${meta.color}28`,
                borderRadius: 14,
                color: meta.color,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              执行此方案
            </button>
          )}

          {state === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px', color: meta.color, fontSize: 12 }}>
              <Loader size={12} className="animate-spin-slow" />
              正在生成并广播对冲订单...
            </div>
          )}

          {state === 'done' && result && (
            <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(94,173,119,0.08)', border: '1px solid rgba(94,173,119,0.2)' }}>
              <div style={{ fontSize: 11, color: '#418a59', marginBottom: 4 }}>
                交易已提交{result.venue ? ` · ${result.venue}` : ''}
              </div>
              {result.summary && (
                <div style={{ fontSize: 11, color: '#52617f', marginBottom: 6 }}>
                  {result.summary}
                </div>
              )}
              <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontFamily: 'monospace' }}>
                  {(result.order_id || result.tx_hash || '').slice(0, 24)}...
                </span>
                {result.explorer_url && (
                  <a href={result.explorer_url} target="_blank" rel="noreferrer" style={{ color: '#418a59' }}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          )}

          {state === 'error' && (
            <div style={{ fontSize: 11, color: 'var(--danger)', padding: '8px 10px', background: 'rgba(217,75,96,0.08)', borderRadius: 14 }}>
              {result?.error || '执行失败，请检查参数、账户状态或稍后重试。'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Badge({ color, label, value }) {
  return (
    <div
      style={{
        padding: '4px 8px',
        borderRadius: 10,
        background: `${color}0f`,
        border: `1px solid ${color}18`,
      }}
    >
      <div style={{ fontSize: 9, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 10, color: color, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
