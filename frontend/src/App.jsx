import { useEffect, useRef } from 'react'
import { scanRisk } from './lib/api'
import { sendChatMessage } from './lib/chat'
import { useStore } from './lib/store'
import TopBar from './components/TopBar'
import ChatView from './components/ChatView'
import RiskBanner from './components/RiskBanner'
import SettingsPanel from './components/SettingsPanel'

export default function App() {
  const { showSettings, setRiskAlerts, addMessage } = useStore()
  const lastAutoAdviceId = useRef('')

  useEffect(() => {
    let alive = true

    async function refreshRisk() {
      try {
        const res = await scanRisk()
        if (!alive) return

        const alerts = res.data?.alerts || []
        setRiskAlerts(alerts)

        const severe = alerts.find(alert => alert.severity === 'IMMEDIATE')
        if (!severe || severe.id === lastAutoAdviceId.current) return

        lastAutoAdviceId.current = severe.id
        addMessage({
          role: 'system',
          content: `检测到高风险仓位：${severe.message}，已自动发起 AI 对冲分析。`,
        })
        await sendChatMessage(
          '请基于当前已连接账户的仓位信息，给我三套可执行的对冲方案。优先降低爆仓风险，并解释每套方案适合什么场景。',
          { displayText: '请基于当前高风险仓位给出对冲方案' }
        )
      } catch {
        // Keep silent during polling; the chat flow will surface actionable errors.
      }
    }

    refreshRisk()
    const timer = window.setInterval(refreshRisk, 20000)

    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [addMessage, setRiskAlerts])

  return (
    <div className="app-shell gemini-bg">
      <TopBar />
      <RiskBanner />
      <ChatView />
      {showSettings && <SettingsPanel />}
    </div>
  )
}
