import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
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
        background: 'rgba(7,12,18,0.88)',
        backdropFilter: 'blur(18px)',
        padding: '14px 18px 18px',
      }}
    >
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
        {COPY.chatInput.quickPrompts.map(q => (
          <button
            key={q}
            onClick={() => onSend(q)}
            disabled={disabled}
            style={{
              flexShrink: 0,
              padding: '7px 12px',
              borderRadius: 8,
              background: 'rgba(19,29,40,0.78)',
              border: '1px solid var(--border)',
              color: 'var(--muted)',
              fontSize: 11,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
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
          background: 'var(--surface-strong)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--panel-radius)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow)',
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
            fontSize: 14,
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
            width: 38,
            height: 38,
            borderRadius: 8,
            background: text.trim() && !disabled ? 'linear-gradient(135deg, #4fd28b, #78a6c8)' : 'rgba(123,157,183,0.12)',
            border: '1px solid rgba(123,157,183,0.18)',
            cursor: text.trim() && !disabled ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: text.trim() && !disabled ? '#06100c' : 'var(--muted)',
          }}
        >
          <Send size={14} />
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: 'var(--muted)', textAlign: 'center' }}>
        {COPY.chatInput.sendHint}
      </div>
    </div>
  )
}
