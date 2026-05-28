import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldCheck, X } from 'lucide-react'
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
    description: '仅生成订单预览，不会下单。',
    tone: '#3657bc',
    Icon: CheckCircle2,
  },
  real: {
    label: 'Real',
    title: '真实提交',
    description: '将进入真实执行路径，请确认账户、仓位和风险边界。',
    tone: '#d94b60',
    Icon: AlertTriangle,
  },
}

export default function ConfirmExecutionModal({ open, mode = 'demo', strategy, onCancel, onConfirm }) {
  const [checked, setChecked] = useState(false)
  const panelRef = useRef(null)
  const copy = MODE_COPY[mode] || MODE_COPY.demo
  const isReal = mode === 'real'
  const canConfirm = !isReal || checked
  const Icon = copy.Icon

  useEffect(() => {
    if (!open) {
      setChecked(false)
      return
    }
    animate(panelRef.current, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 180,
      ease: 'outCubic',
    })
  }, [open])

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
          width: 'min(460px, 100%)',
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
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
              {copy.title}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>
              {copy.description}
            </div>
            {strategy?.title && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6d7a96' }}>
                方案 {strategy.id}：{strategy.title}
              </div>
            )}
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

        <div style={{ padding: '0 18px 16px' }}>
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
            <span style={{ color: '#52617f' }}>当前模式</span>
            <strong style={{ color: copy.tone }}>{copy.label}</strong>
          </div>

          {isReal && (
            <label
              style={{
                marginTop: 12,
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
                checked={checked}
                onChange={event => setChecked(event.target.checked)}
              />
              我确认这是实盘提交
            </label>
          )}
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
            onClick={() => onConfirm?.({ confirmed: isReal && checked })}
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
