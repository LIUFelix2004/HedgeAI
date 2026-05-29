import { useRef, useEffect, useCallback, useState } from 'react'
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
            padding: '18px 22px',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{COPY.chatTitle}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              {COPY.chatSubtitle}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              borderRadius: 999,
              background: 'var(--accent-soft)',
              color: '#3657bc',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <span>{COPY.currentModel}：{model}</span>
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
