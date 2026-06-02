import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Loader, Play, RefreshCw, Search } from 'lucide-react'
import {
  connectDemoAccount,
  fetchInjectiveDemoMarketPreview,
  fetchInjectiveDemoMarkets,
  fetchPositions,
  scanRisk,
} from '../lib/api'
import { animate } from '../lib/motion'
import { useStore } from '../lib/store'
import helixMarketsSnapshot from '../lib/helixMarkets.snapshot.json'

const BUILTIN_MARKETS = helixMarketsSnapshot
const DEFAULT_DEMO_MARKET = BUILTIN_MARKETS.find(market => market.symbol === 'BTC/USDC') || BUILTIN_MARKETS[0]
const UI_VERSION = 'Helix Mainnet Snapshot v1'

const HELIX_GROUPS = [
  { key: 'crypto', label: 'Helix Crypto Perps' },
  { key: 'rwa_stocks', label: 'Helix US Equities / iAssets' },
  { key: 'fx', label: 'Helix FX' },
  { key: 'commodities', label: 'Helix Commodities' },
  { key: 'indices', label: 'Helix Indices' },
  { key: 'exotic', label: 'Helix Exotic' },
]

export default function DemoPositionButton() {
  const buttonRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')

  const {
    accounts,
    demo,
    demoConfig,
    demoPnlMode,
    helixMarkets,
    helixMarketPreview,
    setDemoState,
    setDemoConfigField,
    setDemoPnlMode,
    setHelixMarkets,
    setHelixMarketPreview,
    setAccountConnected,
    setAccountPositions,
    setRiskAlerts,
    addMessage,
  } = useStore()

  const position = accounts.injective.positions?.[0]
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [marketsError, setMarketsError] = useState('')
  const [marketsFetched, setMarketsFetched] = useState(false)

  const markets = helixMarkets.length ? helixMarkets : BUILTIN_MARKETS
  const hasKnownMarketSelection = markets.some(market => market.market_id === demoConfig.market_id)

  useEffect(() => {
    if (!demoConfig.market_id) {
      setDemoConfigField('market_id', DEFAULT_DEMO_MARKET.market_id)
      setDemoConfigField('symbol', DEFAULT_DEMO_MARKET.symbol)
    }
  }, [demoConfig.market_id, setDemoConfigField])

  useEffect(() => {
    if (hasKnownMarketSelection || (!marketsFetched && !helixMarkets.length)) return
    const fallbackMarket = markets.find(market => market.symbol === DEFAULT_DEMO_MARKET.symbol) || DEFAULT_DEMO_MARKET
    if (!fallbackMarket) return
    setDemoConfigField('market_id', fallbackMarket.market_id)
    setDemoConfigField('symbol', fallbackMarket.symbol)
  }, [demoConfig.market_id, hasKnownMarketSelection, helixMarkets.length, markets, marketsFetched, setDemoConfigField])

  useEffect(() => {
    let alive = true
    setMarketsLoading(true)
    setMarketsFetched(false)
    setMarketsError('')

    fetchInjectiveDemoMarkets()
      .then(res => {
        if (!alive) return
        const remoteMarkets = res.data?.markets || []
        if (!remoteMarkets.length) {
          setMarketsError('Helix 主网市场列表为空，已回退到内置市场。')
          return
        }
        const merged = mergeMarkets(BUILTIN_MARKETS, remoteMarkets)
        setHelixMarkets(merged)
        const selected = merged.find(item => item.market_id === demoConfig.market_id)
        if (selected?.symbol) setDemoConfigField('symbol', selected.symbol)
      })
      .catch(error => {
        if (!alive) return
        setMarketsError(error?.response?.data?.detail || error?.message || 'Helix 市场列表加载失败，已回退到内置市场。')
      })
      .finally(() => {
        if (alive) {
          setMarketsLoading(false)
          setMarketsFetched(true)
        }
      })

    return () => {
      alive = false
    }
  }, [demoConfig.market_id, setDemoConfigField, setHelixMarkets])

  useEffect(() => {
    if (!demoConfig.market_id) return
    let alive = true
    fetchInjectiveDemoMarketPreview(demoConfig.market_id)
      .then(res => {
        if (!alive) return
        setHelixMarketPreview(res.data)
      })
      .catch(() => {
        if (!alive) return
        setHelixMarketPreview(null)
      })
    return () => {
      alive = false
    }
  }, [demoConfig.market_id, setHelixMarketPreview])

  const selectedMarket = useMemo(
    () => markets.find(market => market.market_id === demoConfig.market_id) || DEFAULT_DEMO_MARKET,
    [demoConfig.market_id, markets]
  )

  const groupedMarkets = useMemo(() => {
    const buckets = Object.fromEntries(HELIX_GROUPS.map(group => [group.key, []]))
    for (const market of markets) {
      const category = market.category || classifyHelixMarket(market)
      if (!buckets[category]) buckets[category] = []
      const haystack = `${market.ticker} ${market.symbol} ${categoryLabel(category)}`.toLowerCase()
      if (!search || haystack.includes(search.toLowerCase())) {
        buckets[category].push(market)
      }
    }
    return HELIX_GROUPS
      .map(group => ({ ...group, markets: buckets[group.key] || [] }))
      .filter(group => group.markets.length > 0)
  }, [markets, search])

  const visibleMarketCount = groupedMarkets.reduce((sum, group) => sum + group.markets.length, 0)

  const hasPendingChanges = useMemo(() => {
    if (!position) return false
    const sameMarket = String(position.market_id || '') === String(demoConfig.market_id || '')
    const sameDirection = String(position.direction || '') === String(demoConfig.direction || '')
    const sameEntry = nearlyEqual(position.entry_price, Number(demoConfig.entry_price))
    const sameLeverage = nearlyEqual(position.leverage, Number(demoConfig.leverage))
    const sameMargin = nearlyEqual(position.margin_used, Number(demoConfig.margin_used))
    return !(sameMarket && sameDirection && sameEntry && sameLeverage && sameMargin)
  }, [demoConfig.direction, demoConfig.entry_price, demoConfig.leverage, demoConfig.margin_used, demoConfig.market_id, position])

  async function handleLoadDemo() {
    if (demo.loading) return
    setDemoState({ loading: true, error: '' })

    try {
      const payload = {
        market_id: selectedMarket.market_id || demoConfig.market_id,
        symbol: selectedMarket.symbol || demoConfig.symbol,
        direction: demoConfig.direction,
        margin_used: Number(demoConfig.margin_used),
        entry_price: Number(demoConfig.entry_price),
        leverage: Number(demoConfig.leverage),
      }

      const connectRes = await connectDemoAccount(payload)
      const positionsRes = await fetchPositions('injective')
      const positions = positionsRes.data?.positions || connectRes.data?.positions || []

      setAccountConnected('injective', true, {
        address: 'demo',
        positions,
        trading_enabled: false,
        mode: 'demo',
      })
      setAccountPositions('injective', positions)

      const riskRes = await scanRisk()
      setRiskAlerts(riskRes.data?.alerts || [])
      addMessage({
        role: 'system',
        content: `已加载 Helix 主网风格 Demo：${selectedMarket.ticker} ${payload.direction === 'long' ? '做多' : '做空'} ${payload.leverage}x，风险扫描已刷新。`,
      })
      setDemoState({ loading: false, loaded: true, error: '' })
      setOpen(true)

      animate(buttonRef.current, {
        scale: [1, 1.04, 1],
        duration: 420,
        ease: 'outCubic',
      })
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || '模拟仓加载失败，请稍后重试。'
      setDemoState({
        loading: false,
        loaded: false,
        error: detail,
      })
    }
  }

  const label = demo.loading
    ? '加载中...'
    : hasPendingChanges
      ? '重新加载模拟仓'
      : demo.loaded
        ? '模拟仓已加载'
        : '加载模拟仓'

  const metrics = useMemo(() => {
    if (!position) return []
    const pnlValue = demoPnlMode === 'injective'
      ? position.unrealized_pnl_value_injective ?? position.unrealized_pnl_value
      : position.unrealized_pnl_value_reference ?? position.unrealized_pnl_value
    const pnlPct = demoPnlMode === 'injective'
      ? position.unrealized_pnl_pct_injective ?? position.unrealized_pnl_pct
      : position.unrealized_pnl_pct_reference ?? position.unrealized_pnl_pct

    return [
      ['当前价', formatCurrency(position.reference_price)],
      ['Injective Mid', formatCurrency(position.injective_mark_price)],
      ['浮盈亏', `${formatSigned(pnlValue)} USDT (${formatSigned(pnlPct)}%)`],
      ['强平价', formatCurrency(position.liquidation_price)],
      ['距强平', formatPercent(position.liquidation_distance_pct)],
      ['名义价值', formatCurrency(position.size)],
      ['真实价源', position.reference_price_source || '--'],
      ['Best Bid / Ask', `${formatCurrency(position.best_bid_price)} / ${formatCurrency(position.best_ask_price)}`],
      ['维持保证金率', formatRatio(position.maintenance_margin_ratio)],
    ]
  }, [demoPnlMode, position])

  const previewCategory = selectedMarket.category || classifyHelixMarket(selectedMarket)

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" aria-label="自定义" onClick={() => setOpen(v => !v)} style={buttonStyles.secondary}>
          自定义
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button
          ref={buttonRef}
          onClick={handleLoadDemo}
          disabled={demo.loading}
          style={{
            ...buttonStyles.primary,
            background: demo.loaded && !hasPendingChanges ? 'rgba(94,173,119,0.12)' : 'rgba(79,124,255,0.12)',
            color: demo.loaded && !hasPendingChanges ? '#418a59' : '#3657bc',
            cursor: demo.loading ? 'default' : 'pointer',
          }}
        >
          {demo.loading ? <Loader size={13} className="animate-spin-slow" /> : hasPendingChanges ? <RefreshCw size={13} /> : <Play size={13} />}
          {label}
        </button>
      </div>

      {open && (
        <div style={panelStyles.wrapper}>
          <div style={panelStyles.title}>Helix / RWA Demo Market Selector</div>
          <div style={panelStyles.versionTag}>{UI_VERSION}</div>

          <div style={panelStyles.grid}>
            <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
              <Label htmlFor="helix-market-trigger" text="Helix Market" />
              <button
                id="helix-market-trigger"
                type="button"
                onClick={() => setPickerOpen(v => !v)}
                style={panelStyles.pickerTrigger}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedMarket.ticker}</span>
                <ChevronDown size={14} />
              </button>

              {pickerOpen && (
                <div style={panelStyles.pickerPanel}>
                  <div style={panelStyles.searchRow}>
                    <Search size={12} color="#7a8bb0" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="搜索 Helix 主网市场..."
                      style={panelStyles.searchInput}
                    />
                  </div>

                  <div style={panelStyles.marketCount}>
                    共 {markets.length} 个 Helix 主网市场，当前显示 {visibleMarketCount} 个
                  </div>

                  <div style={panelStyles.marketList}>
                    {groupedMarkets.map(group => (
                      <div key={group.key}>
                        <div style={panelStyles.groupTitle}>{group.label}</div>
                        {group.markets.map(market => (
                          <button
                            key={market.market_id}
                            type="button"
                            onClick={() => {
                              setDemoConfigField('market_id', market.market_id)
                              setDemoConfigField('symbol', market.symbol)
                              setPickerOpen(false)
                            }}
                            style={{
                              ...panelStyles.marketOption,
                              background: market.market_id === selectedMarket.market_id ? 'rgba(79,124,255,0.12)' : 'transparent',
                              color: market.market_id === selectedMarket.market_id ? '#3657bc' : '#36435f',
                            }}
                          >
                            <span>{market.ticker}</span>
                            <span style={panelStyles.optionBadge}>{categoryLabel(market.category || classifyHelixMarket(market))}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="demo-direction" text="方向" />
              <select id="demo-direction" value={demoConfig.direction} onChange={e => setDemoConfigField('direction', e.target.value)} style={inputStyle}>
                <option value="long">做多</option>
                <option value="short">做空</option>
              </select>
            </div>

            <Field id="demo-margin" label="保证金金额" value={demoConfig.margin_used} onChange={value => setDemoConfigField('margin_used', value)} placeholder="540" type="number" />
            <Field id="demo-entry" label="开仓成本价" value={demoConfig.entry_price} onChange={value => setDemoConfigField('entry_price', value)} placeholder="90000" type="number" />
            <Field id="demo-leverage" label="杠杆" value={demoConfig.leverage} onChange={value => setDemoConfigField('leverage', value)} placeholder="10" type="number" />
          </div>

          {marketsLoading && <div style={panelStyles.infoBox}>正在从 Helix / Injective mainnet 刷新真实市场列表。</div>}
          {marketsError && <div style={panelStyles.warningBox}>{marketsError}</div>}

          <div style={panelStyles.infoBox}>已加载 {markets.length} 个 Helix 主网市场</div>

          {selectedMarket && (
            <div style={panelStyles.marketCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{selectedMarket.ticker}</div>
                <span style={panelStyles.categoryBadge}>{categoryLabel(previewCategory)}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>Market ID</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 2, wordBreak: 'break-all' }}>{selectedMarket.market_id}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <Meta label="初始保证金率" value={formatRatio(selectedMarket.initial_margin_ratio)} />
                <Meta label="维持保证金率" value={formatRatio(selectedMarket.maintenance_margin_ratio)} />
                <Meta label="Maker / Taker" value={`${formatRatio(selectedMarket.maker_fee_rate)} / ${formatRatio(selectedMarket.taker_fee_rate)}`} />
                <Meta label="模式" value="Perpetual / Mainnet data" />
              </div>
            </div>
          )}

          {helixMarketPreview && (
            <div style={panelStyles.marketCard}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Helix 实时市场预览</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Meta label="真实参考价" value={formatCurrency(helixMarketPreview.reference_price)} />
                <Meta label="真实价源" value={helixMarketPreview.reference_price_source || '--'} />
                <Meta label="Injective Mid" value={formatCurrency(helixMarketPreview.injective_mark_price)} />
                <Meta label="Best Bid / Ask" value={`${formatCurrency(helixMarketPreview.best_bid_price)} / ${formatCurrency(helixMarketPreview.best_ask_price)}`} />
              </div>
            </div>
          )}

          <div style={panelStyles.hint}>
            这个选择器按 Helix 主网市场分组组织：Crypto、US Equities、FX、Commodities、Indices、iAssets / RWA。当前价固定显示真实参考价，Injective Mid 使用主网盘口中间价。
          </div>

          {hasPendingChanges && (
            <div style={panelStyles.warning}>
              <AlertTriangle size={12} color="var(--warn)" />
              <span>你刚刚修改了参数，下面的估值还是旧仓位数据。点击“重新加载模拟仓”后才会按当前表单更新。</span>
            </div>
          )}

          {position && !hasPendingChanges && (
            <div style={panelStyles.metricsSection}>
              <div style={panelStyles.metricsTitle}>Helix / Injective 实时估算</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <ToggleChip active={demoPnlMode === 'reference'} onClick={() => setDemoPnlMode('reference')} label="按真实价估算" />
                <ToggleChip active={demoPnlMode === 'injective'} onClick={() => setDemoPnlMode('injective')} label="按 Injective Mid 估算" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <Meta label="Ticker" value={position.ticker || position.symbol} />
                <Meta label="Subaccount" value={position.subaccount_id || '--'} />
                <Meta label="Helix 分类" value={categoryLabel(position.market_category || previewCategory)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {metrics.map(([metricLabel, metricValue]) => (
                  <div key={metricLabel} style={panelStyles.metricCard}>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{metricLabel}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{metricValue}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {demo.error && <div style={{ maxWidth: 260, fontSize: 10, color: 'var(--danger)', textAlign: 'right' }}>{demo.error}</div>}
    </div>
  )
}

function mergeMarkets(baseMarkets, remoteMarkets) {
  const seen = new Map(baseMarkets.map(item => [item.market_id, item]))
  for (const item of remoteMarkets) {
    seen.set(item.market_id, { ...seen.get(item.market_id), ...item })
  }
  return Array.from(seen.values()).sort((a, b) => String(a.ticker).localeCompare(String(b.ticker)))
}

function classifyHelixMarket(market) {
  const ticker = String(market?.ticker || market?.symbol || '').toUpperCase()
  if (/(AAPL|TSLA|NVDA|META|AMZN|MSFT|GOOG|GOOGL|PLTR|MSTR|COIN|HOOD|CRCL)/.test(ticker)) return 'rwa_stocks'
  if (/(INDEX|EVINDEX|NASDAQ|SPX|DJI)/.test(ticker)) return 'indices'
  if (/(XAU|XAG|GOLD|SILVER|OIL)/.test(ticker)) return 'commodities'
  if (/(GBP|EUR|JPY|AUD|CHF|CAD|FX)/.test(ticker)) return 'fx'
  return 'crypto'
}

function categoryLabel(category) {
  return {
    crypto: 'Crypto',
    rwa_stocks: 'US Equities / iAssets',
    fx: 'FX',
    commodities: 'Commodities',
    indices: 'Indices',
    exotic: 'Exotic',
  }[category] || 'Market'
}

function Field({ id, label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <Label htmlFor={id} text={label} />
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )
}

function Label({ htmlFor, text }) {
  return <label htmlFor={htmlFor} style={{ display: 'block', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>{text}</label>
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function ToggleChip({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 10px',
        borderRadius: 999,
        border: `1px solid ${active ? 'rgba(79,124,255,0.28)' : 'rgba(116,140,193,0.14)'}`,
        background: active ? 'rgba(79,124,255,0.12)' : '#ffffff',
        color: active ? '#3657bc' : 'var(--muted)',
        fontSize: 10,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )
}

const inputStyle = {
  width: '100%',
  background: '#ffffff',
  border: '1px solid rgba(116,140,193,0.16)',
  borderRadius: 12,
  color: 'var(--text)',
  padding: '8px 10px',
  fontSize: 12,
  outline: 'none',
}

const buttonStyles = {
  primary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minWidth: 132,
    height: 36,
    padding: '0 13px',
    borderRadius: 14,
    border: '1px solid rgba(79,124,255,0.22)',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  secondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    padding: '0 11px',
    borderRadius: 14,
    border: '1px solid rgba(79,124,255,0.18)',
    background: 'rgba(255,255,255,0.75)',
    color: '#3657bc',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
}

const panelStyles = {
  wrapper: {
    width: 360,
    padding: 14,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.96)',
    border: '1px solid rgba(116,140,193,0.14)',
    boxShadow: '0 18px 42px rgba(102,121,166,0.16)',
  },
  title: {
    fontSize: 11,
    fontWeight: 800,
    color: '#3657bc',
    letterSpacing: '0.06em',
    marginBottom: 10,
  },
  versionTag: {
    fontSize: 10,
    fontWeight: 700,
    color: '#7a8bb0',
    marginTop: -4,
    marginBottom: 10,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  pickerTrigger: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(116,140,193,0.16)',
    background: '#ffffff',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
  },
  pickerPanel: {
    position: 'absolute',
    zIndex: 20,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 14,
    background: '#ffffff',
    border: '1px solid rgba(116,140,193,0.18)',
    boxShadow: '0 16px 40px rgba(102,121,166,0.18)',
    overflow: 'hidden',
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid rgba(116,140,193,0.12)',
  },
  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 12,
    color: 'var(--text)',
    background: 'transparent',
  },
  marketCount: {
    padding: '8px 12px',
    fontSize: 10,
    color: 'var(--muted)',
    borderBottom: '1px solid rgba(116,140,193,0.08)',
  },
  marketList: {
    maxHeight: 260,
    overflowY: 'auto',
    padding: 8,
    display: 'grid',
    gap: 8,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: 800,
    color: '#3657bc',
    padding: '4px 6px',
  },
  marketOption: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    textAlign: 'left',
  },
  optionBadge: {
    fontSize: 9,
    color: '#7a8bb0',
    background: 'rgba(116,140,193,0.08)',
    borderRadius: 999,
    padding: '3px 6px',
    flexShrink: 0,
  },
  marketCard: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 14,
    background: '#f8faff',
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: 800,
    color: '#3657bc',
    background: 'rgba(79,124,255,0.1)',
    borderRadius: 999,
    padding: '4px 8px',
    letterSpacing: '0.03em',
  },
  hint: {
    marginTop: 10,
    fontSize: 10,
    color: 'var(--muted)',
    lineHeight: 1.5,
  },
  infoBox: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(79,124,255,0.08)',
    border: '1px solid rgba(79,124,255,0.14)',
    color: '#3657bc',
    fontSize: 10,
    lineHeight: 1.5,
  },
  warningBox: {
    marginTop: 10,
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(183,121,31,0.08)',
    border: '1px solid rgba(183,121,31,0.16)',
    color: '#7a6020',
    fontSize: 10,
    lineHeight: 1.5,
  },
  warning: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(183,121,31,0.08)',
    border: '1px solid rgba(183,121,31,0.16)',
    color: '#7a6020',
    fontSize: 10,
    lineHeight: 1.5,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-start',
  },
  metricsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid rgba(116,140,193,0.12)',
  },
  metricsTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 8,
  },
  metricCard: {
    background: '#f8faff',
    borderRadius: 12,
    padding: '8px 10px',
  },
}

function formatCurrency(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `$${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function formatSigned(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `${number > 0 ? '+' : ''}${number.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function formatRatio(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `${(number * 100).toFixed(2)}%`
}

function formatPercent(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '--'
  return `${number.toFixed(2)}%`
}

function nearlyEqual(a, b) {
  const x = Number(a)
  const y = Number(b)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false
  return Math.abs(x - y) < 0.0001
}
