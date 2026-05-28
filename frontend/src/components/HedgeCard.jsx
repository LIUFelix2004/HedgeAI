import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import ConfirmExecutionModal from './ConfirmExecutionModal'
import ExecutionProgress from './ExecutionProgress'
import MarketSnapshot from './MarketSnapshot'
import { executeHedge } from '../lib/api'
import { COPY } from '../lib/copy'
import { getExecutionStatusCopy } from '../lib/executionStatus'
import { useStore } from '../lib/store'

const STRATEGY_META = {
  REVERSE_HEDGE: { icon: 'INJ', color: '#4f7cff', label: COPY.strategy.types.reverseHedge },
  POLYMARKET: { icon: 'PM', color: '#8d6af9', label: COPY.strategy.types.polymarket },
  OPTIONS: { icon: 'OPT', color: '#37b37e', label: COPY.strategy.types.options },
}

function getModeLabel(mode) {
  if (mode === 'dry_run') return COPY.executionMode.dryRun
  return COPY.executionMode[mode] || COPY.executionMode.demo
}

export default function HedgeCard({ strategy, onExecuted }) {
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [expanded, setExpanded] = useState(true)
  const [showConfirm, setShowConfirm] = useState(false)
  const injectiveAddress = useStore(s => s.accounts.injective.address)
  const executionMode = useStore(s => s.executionMode)
  const meta = STRATEGY_META[strategy.type] || STRATEGY_META.REVERSE_HEDGE
  const executionStatus = result ? getExecutionStatusCopy(result) : null
  const modeLabel = getModeLabel(executionMode)
  const successTone = executionStatus?.tone === 'demo'
    ? { color: 'var(--warn)', background: 'rgba(183,121,31,0.08)', border: '1px solid rgba(183,121,31,0.2)' }
    : executionStatus?.tone === 'dry_run'
      ? { color: '#3657bc', background: 'rgba(79,124,255,0.08)', border: '1px solid rgba(79,124,255,0.2)' }
      : { color: '#418a59', background: 'rgba(94,173,119,0.08)', border: '1px solid rgba(94,173,119,0.2)' }

  async function runExecution({ confirmed = false } = {}) {
    setShowConfirm(false)
    setState('loading')
    setResult(null)

    const realMode = executionMode === 'real'
    try {
      const res = await executeHedge({
        strategy,
        wallet_address: injectiveAddress || undefined,
        mode: executionMode,
        confirmed: realMode ? confirmed : false,
        ...(realMode ? { idempotency_key: makeIdempotencyKey(strategy) } : {}),
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
              fontSize: 10,
              color: meta.color,
              flexShrink: 0,
              fontWeight: 800,
            }}
          >
            {meta.icon}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {COPY.strategy.planPrefix} {strategy.id}：{strategy.title}
            </div>
            <div style={{ fontSize: 12, color: '#55627f', marginTop: 4 }}>
              {strategy.description}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Badge color={meta.color} label={COPY.strategy.type} value={meta.label} />
              <Badge color={meta.color} label={COPY.strategy.hedgeRatio} value={strategy.hedge_ratio} />
              <Badge color={meta.color} label={COPY.strategy.complexity} value={strategy.complexity} />
              <Badge color={meta.color} label={COPY.strategy.estimatedCost} value={strategy.estimated_cost} />
              <Badge color={meta.color} label="执行模式" value={modeLabel} />
            </div>
          </div>

          <div style={{ color: '#7d8aaa', flexShrink: 0 }}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px' }}>
          {strategy.source === 'fallback' && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'var(--warn)', background: 'rgba(183,121,31,0.1)', padding: '4px 10px', borderRadius: 999 }}>
                {COPY.localFallback}
              </span>
            </div>
          )}

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

          {strategy.type === 'POLYMARKET' && (
            <MarketSnapshot snapshot={strategy.market_snapshot} />
          )}

          {strategy.type === 'OPTIONS' && strategy.market_snapshot && (
            <OptionSnapshot snapshot={strategy.market_snapshot} />
          )}

          <div className="hedge-card-grid" style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(94,173,119,0.08)', border: '1px solid rgba(94,173,119,0.14)' }}>
              <div style={{ fontSize: 10, color: '#418a59', marginBottom: 4 }}>{COPY.strategy.pros}</div>
              <div style={{ fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>{strategy.pros}</div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 14, background: 'rgba(217,75,96,0.07)', border: '1px solid rgba(217,75,96,0.14)' }}>
              <div style={{ fontSize: 10, color: 'var(--danger)', marginBottom: 4 }}>{COPY.strategy.cons}</div>
              <div style={{ fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>{strategy.cons}</div>
            </div>
          </div>

          {strategy.market_links?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                {COPY.strategy.marketLinks}
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
              onClick={() => setShowConfirm(true)}
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
              {COPY.executeStrategy}
            </button>
          )}

          {state === 'loading' && (
            <ExecutionProgress mode={executionMode} />
          )}

          {state === 'done' && result && (
            <>
              {result.steps?.length > 0 && (
                <ExecutionProgress
                  mode={result.execution_mode || executionMode}
                  steps={result.steps}
                  completed
                />
              )}
              {result.order_preview && (
                <OrderPreview preview={result.order_preview} />
              )}
              <div
                data-testid="execution-result"
                data-execution-tone={executionStatus.tone}
                style={{ padding: '10px 12px', borderRadius: 14, background: successTone.background, border: successTone.border }}
              >
                <div style={{ fontSize: 11, color: successTone.color, marginBottom: 4 }}>
                  {executionStatus.title}{result.venue ? ` · ${result.venue}` : ''}
                </div>
                {result.summary && (
                  <div style={{ fontSize: 11, color: '#52617f', marginBottom: 6 }}>
                    {result.summary}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace' }}>
                    {(result.order_id || result.tx_hash || 'preview').slice(0, 24)}...
                  </span>
                  {result.explorer_url && (
                    <a href={result.explorer_url} target="_blank" rel="noreferrer" style={{ color: '#418a59' }}>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          {state === 'error' && (
            <div style={{ fontSize: 11, color: 'var(--danger)', padding: '8px 10px', background: 'rgba(217,75,96,0.08)', borderRadius: 14 }}>
              {result?.error || COPY.strategy.executionFailed}
            </div>
          )}
        </div>
      )}

      <ConfirmExecutionModal
        open={showConfirm}
        mode={executionMode}
        strategy={strategy}
        onCancel={() => setShowConfirm(false)}
        onConfirm={runExecution}
      />
    </div>
  )
}

function makeIdempotencyKey(strategy) {
  const randomPart = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${strategy.id || 'strategy'}-${randomPart}`
}

function OptionSnapshot({ snapshot }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 14,
        marginBottom: 12,
        background: 'rgba(55,179,126,0.07)',
        border: '1px solid rgba(55,179,126,0.16)',
      }}
    >
      <div style={{ fontSize: 11, color: '#2f8a60', fontWeight: 800, marginBottom: 8 }}>
        Derive 期权参考
      </div>
      <div style={{ display: 'grid', gap: 6, fontSize: 11, color: '#52617f' }}>
        <PreviewRow label="合约" value={snapshot.instrument_name || snapshot.display_label || 'N/A'} mono />
        <PreviewRow label="类型" value={snapshot.option_type || 'N/A'} />
        <PreviewRow label="行权价" value={snapshot.strike ?? 'N/A'} />
        <PreviewRow label="到期日" value={snapshot.expiry_date || 'N/A'} />
        {snapshot.days_to_expiry !== undefined && <PreviewRow label="剩余" value={`${snapshot.days_to_expiry} 天`} />}
        <PreviewRow label="保护" value={snapshot.protection_range || 'N/A'} />
      </div>
    </div>
  )
}

function OrderPreview({ preview }) {
  const size = preview.size !== undefined
    ? `${preview.size} USDT`
    : preview.notional !== undefined ? `${preview.notional} USDT` : 'N/A'
  const price = preview.price !== undefined ? preview.price : 'N/A'
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: 14,
        marginBottom: 10,
        background: 'rgba(79,124,255,0.07)',
        border: '1px solid rgba(79,124,255,0.16)',
      }}
    >
      <div style={{ fontSize: 11, color: '#3657bc', fontWeight: 800, marginBottom: 8 }}>
        订单预览
      </div>
      <div style={{ display: 'grid', gap: 6, fontSize: 11, color: '#52617f' }}>
        <PreviewRow label="方向" value={preview.side || 'buy'} />
        {preview.asset && <PreviewRow label="标的" value={preview.asset} />}
        <PreviewRow label={preview.market_id ? '市场' : 'Token'} value={preview.market_id || preview.token_id || 'N/A'} mono />
        {preview.quantity !== undefined && <PreviewRow label="数量" value={preview.quantity} />}
        <PreviewRow label="价格" value={price} />
        <PreviewRow label="规模" value={size} />
        {preview.leverage !== undefined && <PreviewRow label="杠杆" value={`${preview.leverage}x`} />}
      </div>
    </div>
  )
}

function PreviewRow({ label, value, mono = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 8 }}>
      <span style={{ color: '#7d89a4' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : undefined, overflowWrap: 'anywhere' }}>{value}</span>
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
