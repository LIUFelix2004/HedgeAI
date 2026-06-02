import { useState, useRef } from 'react'
import { Send, Zap } from 'lucide-react'
import { COPY } from '../lib/copy'

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const textareaRef = useRef(null)

  function handleSend() {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput(e) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  return (
    <div
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--border)',
        background: 'rgba(250,252,255,0.94)',
        backdropFilter: 'blur(18px)',
        padding: '12px 18px 16px',
      }}
    >
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
        <Zap size={12} color="var(--accent)" style={{ flexShrink: 0, marginTop: 6 }} />
        {COPY.chatInput.quickPrompts.map(q => (
          <button
            key={q}
            onClick={() => onSend(q)}
            disabled={disabled}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 999,
              background: '#f4f7ff',
              border: '1px solid rgba(96,124,186,0.12)',
              color: '#5f6e8f',
              fontSize: 11,
              cursor: disabled ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {q}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
          background: '#ffffff',
          border: `1.5px solid ${text.trim() ? 'rgba(79,124,255,0.3)' : 'rgba(116,140,193,0.14)'}`,
          borderRadius: 22,
          padding: '12px 14px',
          boxShadow: text.trim()
            ? '0 12px 32px rgba(79,124,255,0.12)'
            : '0 8px 24px rgba(112,130,173,0.06)',
          transition: 'all 0.2s ease',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onInput={handleInput}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={COPY.chatInput.placeholder}
          rows={1}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: 13,
            resize: 'none',
            lineHeight: 1.6,
            minHeight: 22,
            maxHeight: 120,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: text.trim() && !disabled ? 'linear-gradient(135deg, #6f96ff, #5d7cff)' : '#edf1fa',
            border: 'none',
            cursor: text.trim() && !disabled ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: text.trim() && !disabled ? '#fff' : '#b0bbd4',
            transition: 'all 0.2s ease',
            transform: text.trim() && !disabled ? 'scale(1)' : 'scale(0.92)',
          }}
        >
          <Send size={14} />
        </button>
      </div>

      <div style={{ marginTop: 6, fontSize: 10, color: '#a0adc5', textAlign: 'center' }}>
        {COPY.chatInput.sendHint}
      </div>
    </div>
  )
}
