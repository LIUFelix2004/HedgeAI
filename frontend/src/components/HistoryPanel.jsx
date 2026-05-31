import { useEffect, useState } from 'react'
import { RefreshCcw, Clock, Shield } from 'lucide-react'
import { fetchAuditHistory, fetchStrategyHistory } from '../lib/api'

export default function HistoryPanel() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [historyItems, setHistoryItems] = useState([])
  const [auditItems, setAuditItems] = useState([])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [historyRes, auditRes] = await Promise.all([
        fetchStrategyHistory(),
        fetchAuditHistory(),
      ])
      setHistoryItems(historyRes.data?.items || [])
      setAuditItems(auditRes.data?.items || [])
    } catch {
      setError('暂时无法加载执行历史，请稍后重试。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 20px 20px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            borderRadius: 28,
            padding: '18px 22px',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>执行历史</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              回顾已保存的策略执行结果和审计事件记录。
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid rgba(79,124,255,0.18)',
              background: 'rgba(79,124,255,0.08)',
              color: '#3657bc',
              borderRadius: 14,
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin-slow' : ''} />
            刷新
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, flex: 1, minHeight: 0 }}>
          <Panel title="策略历史" subtitle={`${historyItems.length} 条记录`} icon={<Clock size={16} color="#4f7cff" />}>
            {loading ? <LoadingSkeleton count={3} /> : null}
            {!loading && error ? <EmptyState label={error} tone="danger" /> : null}
            {!loading && !error && historyItems.length === 0 ? <EmptyState label="暂无策略执行记录。试试在聊天中执行一个方案吧！" /> : null}
            {!loading && !error && historyItems.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {historyItems.map(item => (
                  <HistoryCard key={`${item.audit_id}-${item.ts}`} item={item} />
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel title="审计追踪" subtitle={`${auditItems.length} 条事件`} icon={<Shield size={16} color="#37b37e" />}>
            {loading ? <LoadingSkeleton count={3} /> : null}
            {!loading && error ? <EmptyState label={error} tone="danger" /> : null}
            {!loading && !error && auditItems.length === 0 ? <EmptyState label="暂无审计事件。所有执行操作都会在此留下记录。" /> : null}
            {!loading && !error && auditItems.length > 0 ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {auditItems.map(item => (
                  <AuditCard key={`${item.audit_id}-${item.ts}`} item={item} />
                ))}
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, icon, children }) {
  return (
    <div
      className="glass-panel"
      style={{
        borderRadius: 30,
        padding: 20,
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: 'var(--accent-soft)' }}>{icon}</div>}
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  )
}

function HistoryCard({ item }) {
  const blocked = item.status !== 'success'
  const modeColors = { demo: '#b7791f', dry_run: '#3657bc', real: '#2f8a60' }
  const modeColor = modeColors[item.execution_mode] || '#7d89a4'
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(111,125,153,0.12)', padding: 14, transition: 'box-shadow 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.strategy_title}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <MiniTag label={item.strategy_type} color="#4f7cff" />
            <MiniTag label={item.execution_mode} color={modeColor} />
            {item.venue && <MiniTag label={item.venue} color="#8d6af9" />}
          </div>
        </div>
        <StatusPill value={item.status} blocked={blocked} />
      </div>
      <div style={{ fontSize: 12, color: '#52617f', lineHeight: 1.7, marginTop: 8 }}>
        {item.result_summary || item.error_code || '暂无摘要。'}
      </div>
      {(item.audit_id || item.tx_hash || item.order_id) && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, fontSize: 10, color: '#93a0bc', fontFamily: 'monospace' }}>
          {item.audit_id && <span>{item.audit_id}</span>}
          {item.tx_hash && <span>{item.tx_hash.slice(0, 16)}...</span>}
          {item.order_id && <span>{item.order_id.slice(0, 16)}...</span>}
        </div>
      )}
    </div>
  )
}

function AuditCard({ item }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(111,125,153,0.12)', padding: 14, transition: 'box-shadow 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {item.audit_id}
        </div>
        <StatusPill value={item.status} blocked={item.status !== 'success'} />
      </div>
      <div style={{ fontSize: 12, color: '#52617f', lineHeight: 1.7 }}>
        {item.summary || item.error_code || '暂无摘要。'}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        <MiniTag label={`模式: ${item.execution_mode || 'n/a'}`} color="#3657bc" />
        <MiniTag label={`策略: ${item.strategy_type || 'n/a'}`} color="#4f7cff" />
        {item.venue && <MiniTag label={item.venue} color="#8d6af9" />}
      </div>
    </div>
  )
}

function LoadingSkeleton({ count = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(111,125,153,0.08)', padding: 14 }}>
          <div style={{ height: 14, width: '60%', background: 'rgba(79,124,255,0.08)', borderRadius: 8, marginBottom: 10 }} className="animate-pulse-dot" />
          <div style={{ height: 10, width: '90%', background: 'rgba(79,124,255,0.05)', borderRadius: 6, marginBottom: 6 }} className="animate-pulse-dot" />
          <div style={{ height: 10, width: '40%', background: 'rgba(79,124,255,0.05)', borderRadius: 6 }} className="animate-pulse-dot" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ label, tone = 'muted' }) {
  return (
    <div style={{ padding: 24, borderRadius: 18, background: 'rgba(255,255,255,0.7)', color: tone === 'danger' ? '#d94b60' : '#7d89a4', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
      {label}
    </div>
  )
}

function MiniTag({ label, color }) {
  return (
    <span style={{ fontSize: 10, padding: '3px 7px', borderRadius: 6, background: `${color}10`, color, fontWeight: 600 }}>
      {label}
    </span>
  )
}

function StatusPill({ value, blocked }) {
  const statusLabels = { success: '成功', blocked: '已阻止', failed: '失败' }
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        padding: '5px 9px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        background: blocked ? 'rgba(217,75,96,0.1)' : 'rgba(94,173,119,0.1)',
        color: blocked ? '#d94b60' : '#2f8a60',
      }}
    >
      {statusLabels[value] || value}
    </span>
  )
}
