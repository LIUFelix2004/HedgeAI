import { COPY } from './copy'

export function buildFallbackAnalysis({ accounts = [], riskAlerts = [], reason = '' } = {}) {
  const position = pickRiskPosition(accounts, riskAlerts)
  if (!position) {
    return {
      content: COPY.fallbackUnavailable,
      fallback_reason: reason || 'no position',
      source: 'fallback',
      confidence: 'local-rule',
      strategies: [],
      risk_level: null,
      liquidation_distance_pct: undefined,
    }
  }

  const asset = extractAsset(position.symbol)
  const direction = position.direction || 'long'
  const distance = position.liquidation_distance_pct ?? riskAlerts[0]?.liquidation_distance_pct ?? 0
  const pnl = position.unrealized_pnl_pct ?? riskAlerts[0]?.unrealized_pnl_pct ?? 0
  const shortDirection = direction === 'long' ? 'short' : 'long'

  return {
    content: COPY.fallbackSummary({ symbol: position.symbol || asset, direction, distance }),
    fallback_reason: reason || 'local fallback',
    source: 'fallback',
    confidence: 'local-rule',
    risk_level: distance && distance < 5 ? 'HIGH' : 'MEDIUM',
    liquidation_distance_pct: distance,
    strategies: [
      {
        id: 'A',
        type: 'REVERSE_HEDGE',
        title: `${asset} 反向合约对冲`,
        description: `用约 40% 名义价值建立 ${shortDirection} 向对冲，先降低爆仓风险。`,
        hedge_ratio: '40%',
        estimated_cost: '低',
        complexity: '低',
        pros: `执行路径最直接，可快速降低 ${asset} 方向性暴露。`,
        cons: '会削弱行情反弹时的收益，需要跟随仓位变化动态调整。',
        injective_action: `Preview ${shortDirection} hedge for ${asset} perpetual, ratio=40%, source=fallback`,
        execution_venue: 'injective',
        source: 'fallback',
        confidence: 'local-rule',
      },
      {
        id: 'B',
        type: 'POLYMARKET',
        title: `${asset} 事件市场参考对冲`,
        description: `用事件市场或概率市场覆盖极端下跌叙事，适合作为小比例尾部保护。`,
        hedge_ratio: '15%',
        estimated_cost: '中',
        complexity: '中',
        pros: '风险敞口有限，适合展示事件驱动保护思路。',
        cons: '市场流动性与事件匹配度不稳定，只能作为参考或 dry-run。',
        injective_action: 'N/A',
        execution_venue: 'polymarket',
        source: 'fallback',
        confidence: 'local-rule',
      },
      {
        id: 'C',
        type: 'OPTIONS',
        title: `${asset} 期权保护参考`,
        description: `优先查看保护性 ${direction === 'long' ? 'Put' : 'Call'}，用权利金换取尾部风险保护。`,
        hedge_ratio: '100%',
        estimated_cost: '中高',
        complexity: '高',
        pros: `最大损失更可控，适合距强平 ${distance}%、浮动盈亏 ${pnl}% 的压力场景。`,
        cons: '需要确认真实期权合约、到期日、行权价和流动性。',
        injective_action: 'N/A',
        execution_venue: 'options',
        source: 'fallback',
        confidence: 'local-rule',
      },
    ],
  }
}

function pickRiskPosition(accounts, riskAlerts) {
  const alertPosition = riskAlerts.find(alert => alert.position)?.position
  if (alertPosition) return alertPosition

  const positions = accounts
    .filter(account => account.connected)
    .flatMap(account => account.positions || [])

  return positions.sort((a, b) => {
    const aDist = a.liquidation_distance_pct ?? 100
    const bDist = b.liquidation_distance_pct ?? 100
    return aDist - bDist
  })[0]
}

function extractAsset(symbol = 'BTC') {
  const match = String(symbol).toUpperCase().match(/[A-Z]+/)
  return match?.[0] || 'BTC'
}
