import { enrichStrategies, sendMessageStream } from './api'
import { buildFallbackAnalysis } from './fallbackStrategies'
import { useStore } from './store'

function extractStrategies(fullText) {
  const jsonParsed = extractJsonStrategies(fullText)
  if (jsonParsed) return jsonParsed

  const textParsed = extractPlainTextStrategies(fullText)
  if (textParsed) return textParsed

  return null
}

function extractJsonStrategies(fullText) {
  const match = fullText.match(/```json:strategies\n([\s\S]*?)```/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1])
    return {
      content: buildAssistantSummary(parsed),
      strategies: parsed.strategies || [],
      risk_level: parsed.risk_level,
      liquidation_distance_pct: parsed.liquidation_distance_pct,
      urgency: parsed.urgency,
    }
  } catch {
    return null
  }
}

function extractPlainTextStrategies(fullText) {
  const blocks = splitStrategyBlocks(fullText)
  if (!blocks.length) return null

  const strategies = blocks.map((block, index) => {
    const type = inferStrategyType(block)
    const titleMatch = block.match(/(?:方案|策略)\s*([A-C])\s*[:：]\s*(.+)/)
    const title = titleMatch?.[2]?.trim() || `${type} 方案`

    return {
      id: titleMatch?.[1] || String.fromCharCode(65 + index),
      type,
      title,
      description: extractDescription(block),
      hedge_ratio: firstValue(block, ['对冲比例', '比例']) || defaultRatio(type),
      estimated_cost: firstValue(block, ['成本']) || '待确认',
      complexity: firstValue(block, ['复杂度']) || '中',
      pros: extractSection(block, ['优点', 'Pros']) || '见展开详情',
      cons: extractSection(block, ['缺点', 'Cons', '风险']) || '见展开详情',
      injective_action: extractAction(block),
      execution_venue: inferVenue(type),
    }
  })

  return {
    content: extractSummaryText(fullText) || `已基于当前仓位生成 ${strategies.length} 套对冲方案。展开下方卡片可查看详情。`,
    strategies,
    risk_level: inferRiskLevel(fullText),
    liquidation_distance_pct: inferLiquidationDistance(fullText),
  }
}

function splitStrategyBlocks(text) {
  const lines = text.split('\n')
  const blocks = []
  let current = null

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (/(?:^|[\s*#-])(?:方案|策略)\s*[A-C]\s*[:：]/.test(line)) {
      if (current) blocks.push(current.join('\n'))
      current = [line]
      continue
    }
    if (current) current.push(rawLine)
  }

  if (current) blocks.push(current.join('\n'))
  return blocks
}

function inferStrategyType(block) {
  const lower = block.toLowerCase()
  if (lower.includes('polymarket')) return 'POLYMARKET'
  if (lower.includes('期权') || lower.includes('option')) return 'OPTIONS'
  return 'REVERSE_HEDGE'
}

function inferVenue(type) {
  if (type === 'POLYMARKET') return 'polymarket'
  if (type === 'OPTIONS') return 'options'
  return 'injective'
}

function defaultRatio(type) {
  if (type === 'POLYMARKET') return '15%'
  if (type === 'OPTIONS') return '100%'
  return '40%'
}

function firstValue(text, labels) {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label}\\s*[:：]\\s*([^\\n]+)`))
    if (match?.[1]) return match[1].trim()
  }
  return null
}

function extractDescription(block) {
  const action = firstValue(block, ['行动', '执行', '思路', '原理'])
  if (action) return action

  const lines = block
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/(?:方案|策略)\s*[A-C]\s*[:：]/.test(line))

  return lines[0] || '展开查看详细说明'
}

function extractAction(block) {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean)
  const actionLines = lines.filter(line => (
    line.includes('Action') ||
    line.includes('MsgCreate') ||
    line.includes('Direction') ||
    line.includes('Quantity') ||
    line.includes('Leverage') ||
    line.includes('OrderType') ||
    line.includes('建议动作')
  ))

  if (actionLines.length) return actionLines.join(' | ')

  return firstValue(block, ['操作指令', '执行']) || '参考展开内容执行'
}

function extractSection(block, labels) {
  const lines = block.split('\n').map(line => line.trim()).filter(Boolean)

  for (const label of labels) {
    const start = lines.findIndex(
      line => line.startsWith(`${label}:`) || line.startsWith(`${label}：`) || line === label
    )
    if (start === -1) continue

    const values = []
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i]
      if (/^(优点|缺点|风险|Pros|Cons|成本|复杂度|建议动作|操作指令)\s*[:：]?$/.test(line)) break
      if (/^(优点|缺点|风险|Pros|Cons|成本|复杂度|建议动作|操作指令)\s*[:：]/.test(line)) break
      values.push(line.replace(/^[-•\s]*/, ''))
    }
    if (values.length) return values.join('；')
  }

  return null
}

function inferRiskLevel(text) {
  if (/HIGH|高风险|爆仓|强平边缘/i.test(text)) return 'HIGH'
  if (/MEDIUM|中等风险|谨慎|监控/i.test(text)) return 'MEDIUM'
  return null
}

function inferLiquidationDistance(text) {
  const match = text.match(/(?:距强平|距离强平)[^\d]{0,8}(\d+(?:\.\d+)?)\s*%/i)
  return match ? Number(match[1]) : undefined
}

function extractSummaryText(text) {
  const lines = text
    .replace(/```json:strategies[\s\S]*?```/, '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const summary = []
  for (const line of lines) {
    if (/(?:方案|策略)\s*[A-C]\s*[:：]/.test(line)) break
    summary.push(line)
    if (summary.length >= 5) break
  }

  return summary.join('\n\n')
}

function buildAssistantSummary(parsed) {
  const lines = []
  lines.push(`已基于当前仓位生成 ${parsed.strategies?.length || 0} 套对冲方案。`)

  if (parsed.risk_summary) {
    lines.push(`风险判断：${parsed.risk_summary}`)
  }

  if (parsed.liquidation_distance_pct !== undefined) {
    lines.push(`距离强平：${parsed.liquidation_distance_pct}%`)
  }

  if (parsed.urgency) {
    lines.push(`建议动作：${parsed.urgency}`)
  }

  lines.push('展开下方卡片可查看每套方案的详细逻辑、实时市场链接和执行入口。')
  return lines.join('\n\n')
}

async function enrichParsedStrategies(parsed, connectedAccounts) {
  if (!parsed?.strategies?.length) return parsed

  try {
    const res = await enrichStrategies({
      strategies: parsed.strategies,
      accounts: connectedAccounts,
    })
    return {
      ...parsed,
      strategies: res.data?.strategies || parsed.strategies,
    }
  } catch {
    return parsed
  }
}

function buildLocalFallback(reason, connectedAccounts) {
  const state = useStore.getState()
  return buildFallbackAnalysis({
    accounts: connectedAccounts,
    riskAlerts: state.riskAlerts,
    reason,
  })
}

export async function sendChatMessage(text, options = {}) {
  const {
    displayText = text,
    silentUser = false,
  } = options

  const state = useStore.getState()
  if (state.isTyping) return false

  if (!silentUser) {
    state.addMessage({ role: 'user', content: displayText })
  }

  state.setTyping(true)
  state.addMessage({ role: 'assistant', content: '', model: state.model, typing: false })

  const connectedAccounts = Object.entries(state.accounts)
    .filter(([, acc]) => acc.connected)
    .map(([key, acc]) => ({ platform: key, ...acc }))

  let fullText = ''
  let parsedMessage = null

  try {
    await sendMessageStream(
      {
        message: text,
        model: state.model,
        model_api_key: state.modelConfigs[state.model]?.apiKey || '',
        accounts: connectedAccounts,
        history: state.messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      },
      (chunk) => {
        fullText += chunk
        useStore.getState().updateLastAssistant({ content: fullText })
      },
      () => {
        parsedMessage = extractStrategies(fullText)
      }
    )

    if (parsedMessage) {
      const enriched = await enrichParsedStrategies(parsedMessage, connectedAccounts)
      useStore.getState().updateLastAssistant(enriched)
    } else {
      useStore.getState().updateLastAssistant(
        buildLocalFallback('未解析到结构化策略', connectedAccounts)
      )
    }
  } catch (error) {
    useStore.getState().updateLastAssistant({
      ...buildLocalFallback(error?.message || '模型连接失败', connectedAccounts),
    })
  } finally {
    useStore.getState().setTyping(false)
  }

  return true
}
