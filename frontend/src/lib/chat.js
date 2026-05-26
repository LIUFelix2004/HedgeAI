import { sendMessageStream } from './api'
import { useStore } from './store'

function extractStrategies(fullText) {
  const match = fullText.match(/```json:strategies\n([\s\S]*?)```/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[1])
    return {
      content: fullText.replace(/```json:strategies[\s\S]*?```/, '').trim(),
      strategies: parsed.strategies || [],
      risk_level: parsed.risk_level,
      liquidation_distance_pct: parsed.liquidation_distance_pct,
    }
  } catch {
    return null
  }
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
        const parsed = extractStrategies(fullText)
        if (parsed) {
          useStore.getState().updateLastAssistant(parsed)
        }
        useStore.getState().setTyping(false)
      }
    )
  } catch {
    useStore.getState().updateLastAssistant({
      content: '连接失败，请检查后端服务、网络状态，以及当前模型的 API Key 是否已配置。',
    })
    useStore.getState().setTyping(false)
  }

  return true
}
