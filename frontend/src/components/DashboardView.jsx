import { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  RefreshCcw,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { fetchDashboard } from '../lib/api'
import { useStore } from '../lib/store'
import PlatformLogo from './PlatformLogo'

export default function DashboardView() {
  const { accounts, riskAlerts } = useStore()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetchDashboard()
      setDashboard(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const connectedPlatforms = Object.entries(accounts).filter(([, a]) => a.connected)
  const totalPositions = connectedPlatforms.reduce((sum, [, a]) => sum + (a.positions?.length || 0), 0)
  const immediateAlerts = riskAlerts.filter(a => a.severity === 'IMMEDIATE').length
  const monitorAlerts = riskAlerts.filter(a => a.severity === 'MONITOR').length

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 20px 20px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-strong)', margin: 0 }}>Dashboard</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 0' }}>Injective 原生风控驾驶舱 · 仓位、风险与执行概览</p>
          </div>
          <button
            type="button"
            onClick={load}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--border)',
              background: 'var(--surface-soft)',
              color: 'var(--accent)',
              borderRadius: 14,
              padding: '8px 12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <RefreshCcw size={13} className={loading ? 'animate-spin-slow' : ''} />
            刷新
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          <StatCard
            icon={<Wallet size={18} />}
            iconColor="var(--accent)"
            label="已连接平台"
            value={connectedPlatforms.length}
            sub={`/ ${Object.keys(accounts).length} 个支持`}
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            iconColor="var(--success)"
            label="活跃仓位"
            value={totalPositions}
            sub="跨平台聚合"
          />
          <StatCard
            icon={<Shield size={18} />}
            iconColor={immediateAlerts > 0 ? 'var(--danger)' : 'var(--success)'}
            label="风险告警"
            value={immediateAlerts + monitorAlerts}
            sub={immediateAlerts > 0 ? `${immediateAlerts} 紧急` : '无紧急'}
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            iconColor="#8d6af9"
            label="策略执行"
            value={dashboard?.recent_executions_count ?? 0}
            sub={`成功率 ${dashboard?.recent_success_rate ?? 0}%`}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
          <div className="glass-panel" style={{ borderRadius: 22, padding: 20, overflowY: 'auto' }}>
            <SectionTitle icon={<Activity size={16} color="var(--accent)" />} title="平台状态" />
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {Object.entries(accounts).map(([key, acc]) => (
                <PlatformRow key={key} platform={key} account={acc} />
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ borderRadius: 22, padding: 20, overflowY: 'auto' }}>
            <SectionTitle icon={<Zap size={16} color="var(--success)" />} title="仓位概览" />
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {connectedPlatforms.length === 0 ? (
                <EmptyState label="暂无已连接平台。点击右上角「设置」连接账户，或在对话页加载 Demo 仓位。" />
              ) : totalPositions === 0 ? (
                <EmptyState label="已连接但暂无仓位数据。尝试在对话页点击「加载 Injective Demo」开始体验。" />
              ) : (
                connectedPlatforms.map(([key, acc]) =>
                  (acc.positions || []).map((pos, idx) => (
                    <PositionRow key={`${key}-${idx}`} platform={key} position={pos} />
                  ))
                )
              )}
            </div>
          </div>
        </div>

        {dashboard?.recent_executions?.length > 0 && (
          <div className="glass-panel" style={{ borderRadius: 22, padding: 20, marginTop: 16 }}>
            <SectionTitle icon={<BarChart3 size={16} color="#8d6af9" />} title="最近执行记录" />
            <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
              {dashboard.recent_executions.map((exec, i) => (
                <ExecutionRow key={i} exec={exec} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, iconColor, label, value, sub }) {
  return (
    <div className="glass-panel" style={{ borderRadius: 18, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${iconColor}18`, display: 'grid', placeItems: 'center', color: iconColor }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-strong)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function SectionTitle({ icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-soft)', display: 'grid', placeItems: 'center' }}>{icon}</div>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-strong)' }}>{title}</span>
    </div>
  )
}

const PLATFORM_COLORS = {
  hyperliquid: '#4fd28b',
  injective: '#78a6c8',
  polymarket: '#9bbbd7',
  binance: '#d6a84d',
}

function PlatformRow({ platform, account }) {
  const color = PLATFORM_COLORS[platform] || 'var(--muted)'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 14,
      background: account.connected ? `${color}0a` : 'var(--surface-soft)',
      border: `1px solid ${account.connected ? `${color}22` : 'var(--border)'}`,
    }}>
      <PlatformLogo platform={platform} size={22} muted={!account.connected} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{platform}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
          {account.connected ? `${account.positions?.length || 0} 个仓位` : '未连接'}
        </div>
      </div>
      <span style={{
        padding: '4px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        color: account.connected ? 'var(--success)' : 'var(--muted)',
        background: account.connected ? 'var(--success-soft)' : 'var(--surface-soft)',
      }}>
        {account.connected ? '已连接' : '离线'}
      </span>
    </div>
  )
}

function PositionRow({ platform, position }) {
  const isLong = position.direction === 'long'
  const pnlPct = position.unrealized_pnl_pct ?? 0
  const liquidationDist = position.liquidation_distance_pct ?? 100

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 14px',
      borderRadius: 14,
      background: 'var(--surface-soft)',
      border: '1px solid var(--border)',
    }}>
      <PlatformLogo platform={platform} size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>{position.symbol || position.ticker}</span>
          <span style={{
            fontSize: 9,
            fontWeight: 800,
            padding: '2px 6px',
            borderRadius: 999,
            color: isLong ? 'var(--success)' : 'var(--danger)',
            background: isLong ? 'var(--success-soft)' : 'var(--danger-soft)',
          }}>
            {isLong ? 'LONG' : 'SHORT'} {position.leverage}x
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: 'var(--muted)' }}>
          <span>名义 {formatCurrency(position.size)}</span>
          <span style={{ color: pnlPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            PnL {pnlPct > 0 ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
          <span style={{ color: liquidationDist < 10 ? 'var(--danger)' : 'var(--muted)' }}>
            距强平 {liquidationDist.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  )
}

function ExecutionRow({ exec }) {
  const isSuccess = exec.status === 'success'
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      borderRadius: 12,
      background: 'var(--surface-soft)',
      border: '1px solid var(--border)',
    }}>
      <span style={{
        fontSize: 9,
        fontWeight: 800,
        padding: '3px 7px',
        borderRadius: 999,
        color: isSuccess ? 'var(--success)' : 'var(--danger)',
        background: isSuccess ? 'var(--success-soft)' : 'var(--danger-soft)',
        flexShrink: 0,
      }}>
        {isSuccess ? 'OK' : 'ERR'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exec.strategy_title || exec.strategy_type || '策略执行'}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
          {exec.mode} · {exec.platform || 'injective'}
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
        {exec.executed_at ? new Date(exec.executed_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--'}
      </div>
    </div>
  )
}

function EmptyState({ label }) {
  return (
    <div style={{ padding: 24, borderRadius: 14, background: 'var(--surface-soft)', color: 'var(--muted)', fontSize: 12, textAlign: 'center', lineHeight: 1.7 }}>
      {label}
    </div>
  )
}

function formatCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}
