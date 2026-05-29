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
          borderRadius: 14,
          marginBottom: 12,
          background: '#f8fbff',
          border: '1px solid rgba(116,140,193,0.14)',
          fontSize: 12,
          color: '#6d7a96',
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
        borderRadius: 14,
        marginBottom: 12,
        background: 'rgba(141,106,249,0.07)',
        border: '1px solid rgba(141,106,249,0.16)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#8d6af9', fontWeight: 800, marginBottom: 5 }}>
            Polymarket 市场快照
          </div>
          <div style={{ fontSize: 12, color: '#2b3654', lineHeight: 1.6 }}>
            {snapshot.question || '未解析市场问题'}
          </div>
        </div>
        {snapshot.url && (
          <a href={snapshot.url} target="_blank" rel="noreferrer" style={{ color: '#8d6af9', flexShrink: 0 }}>
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
    <div style={{ padding: '8px 9px', borderRadius: 12, background: '#ffffff', border: '1px solid rgba(141,106,249,0.12)' }}>
      <div style={{ fontSize: 9, color: '#7d89a4', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#8d6af9', fontWeight: 800, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}
