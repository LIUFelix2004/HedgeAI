import { useState } from 'react'
import { Loader, ExternalLink } from 'lucide-react'
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
        padding: 18,
        marginTop: 12,
        boxShadow: '0 14px 30px rgba(112,130,173,0.09)',
        animation: 'fadeUp 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 11,
            background: `${meta.color}12`,
            border: `1px solid ${meta.color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: meta.color,
          }}
        >
          {meta.icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            方案 {strategy.id}：{strategy.title}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{meta.label}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[
            { label: '对冲比例', val: strategy.hedge_ratio },
            { label: '复杂度', val: strategy.complexity },
          ].map(tag => (
            <div
              key={tag.label}
              style={{
                padding: '4px 8px',
                borderRadius: 10,
                background: `${meta.color}0f`,
                border: `1px solid ${meta.color}18`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, color: 'var(--muted)' }}>{tag.label}</div>
              <div style={{ fontSize: 10, color: meta.color, fontWeight: 700 }}>{tag.val}</div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#52617f', lineHeight: 1.7, marginBottom: 12 }}>
        {strategy.description}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(94,173,119,0.08)', border: '1px solid rgba(94,173,119,0.14)' }}>
          <div style={{ fontSize: 10, color: '#418a59', marginBottom: 4 }}>优点</div>
          <div style={{ fontSize: 12, color: '#52617f' }}>{strategy.pros}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(217,75,96,0.07)', border: '1px solid rgba(217,75,96,0.14)' }}>
          <div style={{ fontSize: 10, color: 'var(--danger)', marginBottom: 4 }}>风险</div>
          <div style={{ fontSize: 12, color: '#52617f' }}>{strategy.cons}</div>
        </div>
      </div>

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
          <div style={{ fontSize: 11, color: '#418a59', marginBottom: 4 }}>交易已提交</div>
          {result.summary && (
            <div style={{ fontSize: 11, color: '#52617f', marginBottom: 6 }}>
              {result.summary}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace' }}>{result.tx_hash?.slice(0, 24)}...</span>
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
  )
}
