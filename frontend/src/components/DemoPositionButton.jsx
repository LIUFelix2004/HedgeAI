import { useRef } from 'react'
import { Loader, Play } from 'lucide-react'
import { connectDemoAccount, fetchPositions, scanRisk } from '../lib/api'
import { COPY } from '../lib/copy'
import { animate } from '../lib/motion'
import { useStore } from '../lib/store'

export default function DemoPositionButton() {
  const buttonRef = useRef(null)
  const {
    demo,
    setDemoState,
    setAccountConnected,
    setRiskAlerts,
    addMessage,
  } = useStore()

  async function handleLoadDemo() {
    if (demo.loading) return
    setDemoState({ loading: true, error: '' })

    try {
      const connectRes = await connectDemoAccount()
      const positionsRes = await fetchPositions('injective')
      const positions = positionsRes.data?.positions || connectRes.data?.positions || []

      setAccountConnected('injective', true, {
        address: 'demo',
        positions,
        trading_enabled: false,
        mode: 'demo',
      })

      const riskRes = await scanRisk()
      setRiskAlerts(riskRes.data?.alerts || [])
      addMessage({ role: 'system', content: COPY.demoLoadedMessage })
      setDemoState({ loading: false, loaded: true, error: '' })

      animate(buttonRef.current, {
        scale: [1, 1.04, 1],
        duration: 420,
        ease: 'outCubic',
      })
    } catch (error) {
      setDemoState({
        loading: false,
        loaded: false,
        error: error?.response?.data?.detail || COPY.demoLoadFailed,
      })
    }
  }

  const label = demo.loading ? COPY.demoLoading : demo.loaded ? COPY.demoLoaded : COPY.demoLoad

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        ref={buttonRef}
        onClick={handleLoadDemo}
        disabled={demo.loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          minWidth: 132,
          height: 36,
          padding: '0 13px',
          borderRadius: 8,
          border: `1px solid ${demo.loaded ? 'rgba(79,210,139,0.28)' : 'rgba(120,166,200,0.24)'}`,
          background: demo.loaded ? 'var(--success-soft)' : 'var(--accent-soft)',
          color: demo.loaded ? 'var(--success)' : 'var(--accent2)',
          fontSize: 12,
          fontWeight: 700,
          cursor: demo.loading ? 'default' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {demo.loading ? <Loader size={13} className="animate-spin-slow" /> : <Play size={13} />}
        {label}
      </button>
      {demo.error && (
        <div style={{ maxWidth: 220, fontSize: 10, color: 'var(--danger)', textAlign: 'right' }}>
          {demo.error}
        </div>
      )}
    </div>
  )
}
