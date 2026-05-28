import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 60000 })

export const connectAccount = (platform, creds) =>
  api.post(`/accounts/${platform}/connect`, creds)

export const connectDemoAccount = () =>
  connectAccount('injective', { address: 'demo' })

export const fetchPositions = (platform) =>
  api.get(`/accounts/${platform}/positions`)

export const fetchAllPositions = () =>
  api.get('/accounts/positions/all')

export const sendMessage = (payload) =>
  api.post('/chat/message', payload)

export async function sendMessageStream(payload, onChunk, onDone) {
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok || !res.body) {
    throw new Error(`stream request failed: ${res.status}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue

      const raw = line.slice(6).trim()
      if (raw === '[DONE]') {
        onDone?.()
        return
      }

      try {
        const { text } = JSON.parse(raw)
        if (text) onChunk(text)
      } catch {
        // Ignore partial SSE lines or keepalive payloads.
      }
    }
  }

  onDone?.()
}

export const enrichStrategies = (payload) =>
  api.post('/hedge/enrich-strategies', payload)

export const executeHedge = (payload) =>
  api.post('/hedge/execute', payload)

export const scanRisk = () =>
  api.get('/risk/scan')
