import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import helixMarketsSnapshot from './helixMarkets.snapshot.json'

const DEFAULT_DEMO_MARKET = helixMarketsSnapshot.find(market => market.symbol === 'BTC/USDC') || helixMarketsSnapshot[0]
const KNOWN_DEMO_MARKET_IDS = new Set(helixMarketsSnapshot.map(market => market.market_id))

const baseAccounts = {
  hyperliquid: { connected: false, address: '', privateKey: '', positions: [] },
  injective: { connected: false, address: '', privateKey: '', positions: [] },
  polymarket: { connected: false, apiKey: '', privateKey: '', positions: [] },
  binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
}
const baseDemoConfig = {
  market_id: DEFAULT_DEMO_MARKET.market_id,
  symbol: DEFAULT_DEMO_MARKET.symbol,
  direction: 'long',
  margin_used: '540',
  entry_price: '90000',
  leverage: '10',
}
const baseHelixMarkets = []
const baseHelixPreview = null

function sanitizeAccountsForPersist(accounts) {
  return {
    hyperliquid: {
      ...accounts.hyperliquid,
      privateKey: '',
    },
    injective: {
      ...accounts.injective,
      privateKey: '',
    },
    polymarket: {
      ...accounts.polymarket,
      privateKey: '',
    },
    binance: {
      ...accounts.binance,
      apiSecret: '',
    },
  }
}

let messageSequence = 0

function nextMessageId() {
  messageSequence = (messageSequence + 1) % 1000
  return Date.now() + messageSequence / 1000
}

function sanitizeDemoConfig(demoConfig) {
  const merged = { ...baseDemoConfig, ...(demoConfig || {}) }
  const hasKnownMarket = KNOWN_DEMO_MARKET_IDS.has(merged.market_id)
  const fallbackMarket = DEFAULT_DEMO_MARKET
  const selectedMarket = hasKnownMarket
    ? helixMarketsSnapshot.find(market => market.market_id === merged.market_id) || fallbackMarket
    : fallbackMarket

  return {
    ...merged,
    market_id: selectedMarket.market_id,
    symbol: selectedMarket.symbol,
  }
}

export const useStore = create(
  persist(
    (set) => ({
      accounts: baseAccounts,
      demo: { loading: false, loaded: false, error: '' },
      demoConfig: baseDemoConfig,
      demoPnlMode: 'reference',
      helixMarkets: baseHelixMarkets,
      helixMarketPreview: baseHelixPreview,
      executionMode: 'demo',
      setExecutionMode: (executionMode) => set({ executionMode }),
      setDemoPnlMode: (demoPnlMode) => set({ demoPnlMode }),
      setHelixMarkets: (helixMarkets) => set({ helixMarkets }),
      setHelixMarketPreview: (helixMarketPreview) => set({ helixMarketPreview }),

      setDemoState: (patch) =>
        set(s => ({
          demo: { ...s.demo, ...patch },
        })),

      setDemoConfigField: (field, value) =>
        set(s => ({
          demoConfig: { ...s.demoConfig, [field]: value },
        })),

      setAccountField: (platform, field, value) =>
        set(s => ({
          accounts: {
            ...s.accounts,
            [platform]: { ...s.accounts[platform], [field]: value },
          },
        })),

      setAccountConnected: (platform, connected, extra = {}) =>
        set(s => ({
          accounts: {
            ...s.accounts,
            [platform]: { ...s.accounts[platform], connected, ...extra },
          },
        })),

      setAccountPositions: (platform, positions) =>
        set(s => ({
          accounts: {
            ...s.accounts,
            [platform]: { ...s.accounts[platform], positions },
          },
        })),

      disconnectAccountState: (platform) =>
        set(s => ({
          accounts: {
            ...s.accounts,
            [platform]: { ...baseAccounts[platform] },
          },
        })),

      model: 'claude',
      setModel: (m) => set({ model: m }),
      modelConfigs: {
        claude: { apiKey: '' },
        gpt4o: { apiKey: '' },
        deepseek: { apiKey: '' },
        grok: { apiKey: '' },
      },
      setModelConfigField: (model, field, value) =>
        set(s => ({
          modelConfigs: {
            ...s.modelConfigs,
            [model]: { ...s.modelConfigs[model], [field]: value },
          },
        })),

      messages: [],
      isTyping: false,

      addMessage: (msg) =>
        set(s => ({ messages: [...s.messages, { id: nextMessageId(), ...msg }] })),

      updateLastAssistant: (patch) =>
        set(s => {
          const msgs = [...s.messages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'assistant') {
              msgs[i] = { ...msgs[i], ...patch }
              break
            }
          }
          return { messages: msgs }
        }),

      setTyping: (v) => set({ isTyping: v }),
      clearMessages: () => set({ messages: [] }),

      showSettings: false,
      toggleSettings: () => set(s => ({ showSettings: !s.showSettings })),
      activeView: 'chat',
      setActiveView: (activeView) => set({ activeView }),

      riskAlerts: [],
      setRiskAlerts: (alerts) => set({ riskAlerts: alerts }),
    }),
    {
      name: 'hedgeai-ui-store-v3-helix',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const typedPersisted = persistedState || {}
        return {
          ...currentState,
          ...typedPersisted,
          demoConfig: sanitizeDemoConfig(typedPersisted.demoConfig ?? currentState.demoConfig),
        }
      },
      partialize: (state) => ({
        accounts: sanitizeAccountsForPersist(state.accounts),
        demoConfig: state.demoConfig,
        demoPnlMode: state.demoPnlMode,
        model: state.model,
        modelConfigs: state.modelConfigs,
      }),
    }
  )
)
