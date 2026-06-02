import { ExternalLink } from 'lucide-react'

function formatProbability(value) {
  if (value === undefined || value === null || value === '') return 'N/A'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return `${Math.round(numeric * 100)}%`
}

function formatPrice(value) {
  if (value === undefined || value === null || value === '') return 'N/A'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return numeric.toFixed(2).replace(/0$/, '').replace(/\.0$/, '')
}

export default function MarketSnapshot({ snapshot }) {
  if (!snapshot) {
    return (
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 'var(--panel-radius)',
          marginBottom: 12,
          background: 'var(--surface-soft)',
          border: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--muted)',
        }}
      >
        实时市场暂不可用
      </div>
    )
  }

  const price = formatPrice(snapshot.price)
  const probability = formatProbability(snapshot.probability ?? snapshot.price)

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: 'var(--panel-radius)',
        marginBottom: 12,
        background: 'rgba(120,166,200,0.08)',
        border: '1px solid rgba(120,166,200,0.18)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 800, marginBottom: 5 }}>
            Polymarket 市场快照
          </div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>
            {snapshot.question || '未解析市场问题'}
          </div>
        </div>
        {snapshot.url && (
          <a href={snapshot.url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent2)', flexShrink: 0 }}>
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          marginTop: 10,
        }}
      >
        <Metric label="结果" value={snapshot.outcome || 'N/A'} />
        <Metric label="价格" value={price} />
        <Metric label="概率" value={probability} />
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div style={{ padding: '8px 9px', borderRadius: 8, background: 'rgba(8,14,20,0.72)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--accent2)', fontWeight: 800, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}
