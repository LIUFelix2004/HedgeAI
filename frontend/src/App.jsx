import { useEffect, useRef } from 'react'
import { fetchAllPositions, scanRisk } from './lib/api'
import { sendChatMessage } from './lib/chat'
import { COPY } from './lib/copy'
import { useStore } from './lib/store'
import TopBar from './components/TopBar'
import ChatView from './components/ChatView'
import HistoryPanel from './components/HistoryPanel'
import RiskBanner from './components/RiskBanner'
import SettingsPanel from './components/SettingsPanel'

export default function App() {
  const { showSettings, setRiskAlerts, addMessage, activeView, setAccountPositions, accounts } = useStore()
  const lastAutoAdviceId = useRef('')

  useEffect(() => {
    let alive = true

    async function refreshRisk() {
      try {
        const positionsRes = await fetchAllPositions()
        if (!alive) return
        const latestPositions = positionsRes.data?.positions || []
        for (const [platform, account] of Object.entries(accounts)) {
          if (!account.connected) continue
          setAccountPositions(
            platform,
            latestPositions.filter(position => position.platform === platform)
          )
        }

        const res = await scanRisk()
        if (!alive) return

        const alerts = res.data?.alerts || []
        setRiskAlerts(alerts)

        const severe = alerts.find(alert => alert.severity === 'IMMEDIATE')
        if (!severe || severe.id === lastAutoAdviceId.current) return

        lastAutoAdviceId.current = severe.id
        addMessage({
          role: 'system',
          content: COPY.app.autoRiskMessage(severe.message),
        })
        await sendChatMessage(
          COPY.app.autoRiskPrompt(),
          { displayText: COPY.app.autoRiskDisplay }
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
  }, [accounts, addMessage, setAccountPositions, setRiskAlerts])

  return (
    <div className="app-shell gemini-bg">
      <TopBar />
      <RiskBanner />
      {activeView === 'history' ? <HistoryPanel /> : <ChatView />}
      {showSettings && <SettingsPanel />}
    </div>
  )
}
