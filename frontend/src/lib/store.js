import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      // Accounts
      accounts: {
        hyperliquid: { connected: false, apiKey: '', apiSecret: '', positions: [] },
        injective: { connected: false, address: '', positions: [] },
        polymarket: { connected: false, apiKey: '', positions: [] },
        binance: { connected: false, apiKey: '', apiSecret: '', positions: [] },
      },

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

      // Model
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

      // Chat
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

      // Settings panel
      showSettings: false,
      toggleSettings: () => set(s => ({ showSettings: !s.showSettings })),

      // Risk banner
      riskAlerts: [],
      setRiskAlerts: (alerts) => set({ riskAlerts: alerts }),
    }),
    {
      name: 'hedgeai-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        model: state.model,
        modelConfigs: state.modelConfigs,
      }),
    }
  )
)
