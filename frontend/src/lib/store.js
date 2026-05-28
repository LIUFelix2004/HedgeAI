import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

const baseAccounts = {
  hyperliquid: { connected: false, address: '', privateKey: '', positions: [] },
  injective: { connected: false, address: '', privateKey: '', positions: [] },
  polymarket: { connected: false, apiKey: '', privateKey: '', positions: [] },
  binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
}

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

export const useStore = create(
  persist(
    (set) => ({
      accounts: baseAccounts,
      demo: { loading: false, loaded: false, error: '' },

      setDemoState: (patch) =>
        set(s => ({
          demo: { ...s.demo, ...patch },
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
        set(s => ({ messages: [...s.messages, { id: Date.now(), ...msg }] })),

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

      riskAlerts: [],
      setRiskAlerts: (alerts) => set({ riskAlerts: alerts }),
    }),
    {
      name: 'hedgeai-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: sanitizeAccountsForPersist(state.accounts),
        model: state.model,
        modelConfigs: state.modelConfigs,
      }),
    }
  )
)
