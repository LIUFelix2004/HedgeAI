import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { fetchExecutionPrecheck } from '../lib/api'
import { animate } from '../lib/motion'

const MODE_COPY = {
  demo: {
    label: 'Demo',
    title: '演示执行',
    description: '仅返回模拟结果，不会提交真实订单。',
    tone: '#b7791f',
    Icon: ShieldCheck,
  },
  dry_run: {
    label: 'Dry-run',
    title: '订单预览',
    description: '仅生成订单预览，不会真实下单。',
    tone: '#3657bc',
    Icon: CheckCircle2,
  },
  real: {
    label: 'Real',
    title: '真实提交前确认',
    description: '会先执行仓位、余额与保证金预检，只有通过后才允许继续。',
    tone: '#d94b60',
    Icon: AlertTriangle,
  },
}

export default function ConfirmExecutionModal({ open, mode = 'demo', strategy, onCancel, onConfirm }) {
  const [checked, setChecked] = useState(false)
  const [precheck, setPrecheck] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef(null)
  const copy = MODE_COPY[mode] || MODE_COPY.demo
  const isReal = mode === 'real'
  const Icon = copy.Icon
  const canConfirm = !isReal || (checked && !loading && precheck?.can_execute)

  useEffect(() => {
    if (!open) {
      setChecked(false)
      setPrecheck(null)
      setError('')
      setLoading(false)
      return
    }
    animate(panelRef.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 180,
      ease: 'outCubic',
    })
  }, [open])

  useEffect(() => {
    if (!open || !isReal || !strategy) return
    let alive = true
    setLoading(true)
    setError('')
    fetchExecutionPrecheck({ strategy, mode: 'real' })
      .then(res => {
        if (!alive) return
        setPrecheck(res.data)
      })
      .catch(() => {
        if (!alive) return
        setError('Unable to load execution precheck.')
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [open, isReal, strategy])

  if (!open) return null

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        padding: 18,
        background: 'rgba(18, 28, 52, 0.28)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="确认执行方案"
        style={{
          width: 'min(560px, 100%)',
          borderRadius: 18,
          background: '#ffffff',
          border: '1px solid rgba(96,124,186,0.18)',
          boxShadow: '0 22px 54px rgba(31,42,68,0.22)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 18, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              color: copy.tone,
              background: `${copy.tone}12`,
              border: `1px solid ${copy.tone}22`,
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{copy.title}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>{copy.description}</div>
            {strategy?.title ? (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6d7a96' }}>
                方案 {strategy.id}: {strategy.title}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onCancel}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#7d89a4',
              cursor: 'pointer',
              padding: 4,
              flexShrink: 0,
            }}
          >
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: '0 18px 16px', display: 'grid', gap: 12 }}>
          <SummaryRow label="当前模式" value={copy.label} tone={copy.tone} />

          {isReal ? (
            <>
              {loading ? <LoadingState /> : null}
              {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
              {precheck ? (
                <>
                  <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <SummaryRow label="来源仓位" value={`${precheck.source_position?.symbol || 'n/a'} · ${precheck.source_position?.direction || 'n/a'}`} />
                    <SummaryRow label="目标平台" value={precheck.estimated_order?.target_venue || 'n/a'} />
                    <SummaryRow label="订单名义值" value={`${precheck.estimated_order?.order_notional || 0} USDT`} />
                    <SummaryRow label="所需保证金" value={`${precheck.estimated_order?.required_margin || 0} USDT`} />
                  </div>

                  <div style={{ display: 'grid', gap: 8 }}>
                    {precheck.checks?.map(check => (
                      <div
                        key={check.key}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '10px 12px',
                          borderRadius: 14,
                          background: '#f8fbff',
                          border: '1px solid rgba(116,140,193,0.14)',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{check.label}</div>
                          <div style={{ marginTop: 3, fontSize: 11, color: '#52617f', lineHeight: 1.6 }}>{check.message}</div>
                        </div>
                        <CheckStatus status={check.status} />
                      </div>
                    ))}
                  </div>

                  {!precheck.can_execute ? (
                    <InlineNotice tone="danger">
                      预检存在阻断项，请先解决后再进行实盘执行。
                    </InlineNotice>
                  ) : (
                    <InlineNotice tone="ok">
                      预检通过。提交时仍会再次验证仓位快照签名。
                    </InlineNotice>
                  )}
                </>
              ) : null}

              <label
                style={{
                  display: 'flex',
                  gap: 9,
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#52617f',
                  lineHeight: 1.6,
                }}
              >
                <input
                  type="checkbox"
                  aria-label="我确认这是实盘提交"
                  checked={checked}
                  onChange={event => setChecked(event.target.checked)}
                />
                我确认这是实盘提交，并且已经复核当前仓位与风险边界。
              </label>
            </>
          ) : null}
        </div>

        <div
          style={{
            padding: 14,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            borderTop: '1px solid rgba(96,124,186,0.12)',
            background: '#fbfdff',
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: '1px solid rgba(116,140,193,0.2)',
              background: '#ffffff',
              color: '#52617f',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            取消
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => onConfirm?.({ confirmed: isReal && checked, precheckSignature: precheck?.source_signature })}
            style={{
              border: 'none',
              background: canConfirm ? copy.tone : '#d9dfec',
              color: '#ffffff',
              borderRadius: 12,
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 800,
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            确认执行
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, tone }) {
  return (
    <div
      style={{
        borderRadius: 14,
        background: '#f8fbff',
        border: '1px solid rgba(116,140,193,0.14)',
        padding: '11px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        fontSize: 12,
      }}
    >
      <span style={{ color: '#52617f' }}>{label}</span>
      <strong style={{ color: tone || '#3657bc' }}>{value}</strong>
    </div>
  )
}

function CheckStatus({ status }) {
  const meta = status === 'pass'
    ? { label: 'PASS', color: '#2f8a60', bg: 'rgba(94,173,119,0.12)' }
    : status === 'fail'
      ? { label: 'FAIL', color: '#d94b60', bg: 'rgba(217,75,96,0.12)' }
      : { label: 'WARN', color: '#b7791f', bg: 'rgba(183,121,31,0.12)' }
  return (
    <span style={{ alignSelf: 'flex-start', padding: '5px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800, color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  )
}

function InlineNotice({ tone, children }) {
  const meta = tone === 'danger'
    ? { color: '#d94b60', bg: 'rgba(217,75,96,0.08)' }
    : { color: '#2f8a60', bg: 'rgba(94,173,119,0.08)' }
  return (
    <div style={{ padding: '10px 12px', borderRadius: 14, fontSize: 12, lineHeight: 1.6, color: meta.color, background: meta.bg }}>
      {children}
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: '14px 12px', borderRadius: 14, background: '#f8fbff', color: '#52617f', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
      <LoaderCircle size={14} className="animate-spin-slow" />
      正在加载执行预检...
    </div>
  )
}
