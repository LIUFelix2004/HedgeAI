import { useEffect, useMemo, useRef } from 'react'
import { CheckCircle2, Loader } from 'lucide-react'
import { enterCards } from '../lib/motion'

const DEFAULT_STEPS = {
  demo: ['校验执行模式', '生成模拟订单', '返回演示结果'],
  dry_run: ['校验执行模式', '生成订单预览', '返回预览结果'],
  real: ['校验执行模式', '确认实盘权限', '提交执行请求'],
}

export default function ExecutionProgress({ mode = 'demo', steps, completed = false }) {
  const rootRef = useRef(null)
  const visibleSteps = useMemo(() => {
    if (Array.isArray(steps) && steps.length > 0) return steps
    return DEFAULT_STEPS[mode] || DEFAULT_STEPS.demo
  }, [mode, steps])

  useEffect(() => {
    if (!rootRef.current) return
    enterCards(rootRef.current.querySelectorAll('[data-step]'), { stagger: 45, duration: 220 })
  }, [visibleSteps])

  return (
    <div
      ref={rootRef}
      role="status"
      aria-label="执行进度"
      style={{
        padding: '10px 12px',
        borderRadius: 14,
        background: '#f8fbff',
        border: '1px solid rgba(116,140,193,0.14)',
        marginBottom: completed ? 10 : 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {completed ? (
          <CheckCircle2 size={14} color="#418a59" />
        ) : (
          <Loader size={14} color="#3657bc" className="animate-spin-slow" />
        )}
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
          {completed ? '执行步骤已完成' : '正在执行'}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 7 }}>
        {visibleSteps.map((step, index) => (
          <div
            key={`${step}-${index}`}
            data-step
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 1fr',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#52617f',
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                fontSize: 10,
                fontWeight: 800,
                color: completed || index === 0 ? '#ffffff' : '#6d7a96',
                background: completed || index === 0 ? '#3657bc' : 'rgba(116,140,193,0.16)',
              }}
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
