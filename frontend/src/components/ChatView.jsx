import { useRef, useEffect, useCallback, useState } from 'react'
import { Cpu } from 'lucide-react'
import { useStore } from '../lib/store'
import { sendChatMessage } from '../lib/chat'
import { COPY } from '../lib/copy'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import DemoPositionButton from './DemoPositionButton'
import ExecutionModeSwitch from './ExecutionModeSwitch'

export default function ChatView() {
  const { messages, isTyping, addMessage, model } = useStore()
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (messages.length === 0) {
      addMessage({ role: 'assistant', content: COPY.welcome, model: 'hedgeai' })
    }
  }, [addMessage, messages.length])

  useEffect(() => {
    if (!autoScroll) return
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 2 ? 'auto' : 'smooth' })
  }, [messages, isTyping, autoScroll])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setAutoScroll(distanceFromBottom < 80)
  }, [])

  const handleSend = useCallback(async (text) => {
    setAutoScroll(true)
    await sendChatMessage(text)
  }, [])

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 20px 20px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            borderRadius: 28,
            padding: '14px 22px',
            marginBottom: 14,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{COPY.chatTitle}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {COPY.chatSubtitle}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {['Perps', 'FX', 'Commodities', 'Indices', 'iAssets', 'Binary Options'].map(tag => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#3657bc',
                    background: 'rgba(79,124,255,0.08)',
                    border: '1px solid rgba(79,124,255,0.12)',
                    borderRadius: 999,
                    padding: '4px 8px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              borderRadius: 999,
              background: 'var(--accent-soft)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#3657bc', fontSize: 11, fontWeight: 600 }}>
              <Cpu size={12} />
              <span>{model}</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(79,124,255,0.15)' }} />
            <ExecutionModeSwitch />
            <DemoPositionButton />
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            flex: 1,
            minHeight: 0,
            height: '100%',
            overflow: 'hidden',
            borderRadius: 32,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: '28px 28px 16px' }}
          >
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <ChatInput onSend={handleSend} disabled={isTyping} />
        </div>
      </div>
    </div>
  )
}
