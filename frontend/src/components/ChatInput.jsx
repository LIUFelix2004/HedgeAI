import { useState, useRef } from 'react'
import { Send } from 'lucide-react'

const QUICK_PROMPTS = [
  '分析我当前仓位的爆仓风险',
  '我的 BTC 多单已经浮亏，给我三套可执行的对冲方案',
  '帮我计算一个稳妥的对冲比例',
  '解释一下反向合约和期权保护有什么区别',
  '如果我想优先保命，应该选哪套方案？',
]

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
        background: 'rgba(250,252,255,0.92)',
        backdropFilter: 'blur(18px)',
        padding: '14px 18px 18px',
      }}
    >
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
        {QUICK_PROMPTS.map(q => (
          <button
            key={q}
            onClick={() => onSend(q)}
            disabled={disabled}
            style={{
              flexShrink: 0,
              padding: '7px 12px',
              borderRadius: 999,
              background: '#f1f5ff',
              border: '1px solid rgba(96,124,186,0.14)',
              color: '#5f6e8f',
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
          background: '#ffffff',
          border: '1px solid rgba(116,140,193,0.16)',
          borderRadius: 22,
          padding: '14px 16px',
          boxShadow: '0 12px 28px rgba(112,130,173,0.1)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onInput={handleInput}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你的仓位、风险目标或对冲偏好，例如：我的 BTC 10x 多单已经接近强平，帮我保住下行风险。"
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
            borderRadius: 14,
            background: text.trim() && !disabled ? 'linear-gradient(135deg, #6f96ff, #5d7cff)' : '#e8eefc',
            border: 'none',
            cursor: text.trim() && !disabled ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: text.trim() && !disabled ? '#fff' : '#94a0bb',
          }}
        >
          <Send size={14} />
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 10, color: '#8b98b5', textAlign: 'center' }}>
        按 Enter 发送，Shift + Enter 换行。
      </div>
    </div>
  )
}
