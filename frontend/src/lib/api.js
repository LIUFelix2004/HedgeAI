import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 60000 })

export const connectAccount = (platform, creds) =>
  api.post(`/accounts/${platform}/connect`, creds)

export const connectDemoAccount = (config = {}) =>
  api.post('/accounts/injective/demo/connect', config)

export const disconnectAccount = (platform) =>
  api.delete(`/accounts/${platform}/disconnect`)

export const fetchPositions = (platform) =>
  api.get(`/accounts/${platform}/positions`)

export const fetchAllPositions = () =>
  api.get('/accounts/positions/all')

export const fetchInjectiveDemoMarkets = () =>
  api.get('/accounts/injective/demo/markets')

export const fetchInjectiveDemoMarketPreview = (marketId) =>
  api.get('/accounts/injective/demo/market-preview', { params: { market_id: marketId } })

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

export const fetchStrategyHistory = (limit = 50) =>
  api.get('/hedge/history', { params: { limit } })

export const fetchAuditHistory = (limit = 100) =>
  api.get('/hedge/audit', { params: { limit } })

export const fetchExecutionPrecheck = (payload) =>
  api.post('/hedge/precheck', payload)

export const fetchDashboard = () =>
  api.get('/dashboard')
