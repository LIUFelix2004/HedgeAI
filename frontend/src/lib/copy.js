export const COPY = {
  demoLoad: '加载 Demo 仓位',
  demoLoading: '加载中...',
  demoLoaded: 'Demo 已加载',
  demoLoadFailed: 'Demo 仓位加载失败，请稍后重试。',
  demoLoadedMessage: '已加载 Demo 高风险仓位：Injective BTC/USDT 10x 多单，风险扫描已刷新。',
  generateAdvice: '生成建议',
  executeStrategy: '执行此方案',
  localFallback: '本地兜底',
  fallbackUnavailable: '当前没有可用仓位。请先点击“加载 Demo 仓位”，再生成本地兜底策略。',
  fallbackSummary: ({ symbol, direction, distance }) =>
    `模型暂不可用，已基于 ${symbol} ${direction} 仓位生成 3 套本地兜底策略。当前距强平约 ${distance}%。`,
  settings: '设置',

  appSubtitle: 'AI 对话式风控与对冲 Demo',
  chatTitle: '卡片式对冲分析',
  chatSubtitle: '用中文描述你的仓位、风险目标或偏好，我们会返回可展开、可执行的策略卡片。',
  currentModel: '当前模型',
  userLabel: '你',
  assistantLabel: 'HedgeAI',
  riskLevel: '风险等级',
  liquidationDistance: '距强平',

  app: {
    autoRiskMessage: message => `检测到高风险仓位：${message}，已自动发起 AI 对冲分析。`,
    autoRiskPrompt: () => '请基于当前已连接账户的仓位信息，给我三套可执行的对冲方案。优先降低爆仓风险，并解释每套方案适合什么场景。',
    autoRiskDisplay: '请基于当前高风险仓位给出对冲方案',
  },

  chatInput: {
    quickPrompts: [
      '分析我当前仓位的爆仓风险',
      '我的 BTC 多单已经浮亏，给我三套可执行的对冲方案',
      '帮我计算一个稳妥的对冲比例',
      '解释一下反向合约和期权保护有什么区别',
      '如果我要优先保命，应该选哪套方案？',
    ],
    placeholder: '描述你的仓位、风险目标或对冲偏好，例如：我的 BTC 10x 多单已经接近强平，帮我保住下行风险。',
    sendHint: '按 Enter 发送，Shift + Enter 换行。',
  },

  welcome: `欢迎使用 **HedgeAI**。

你可以：

- 连接 Hyperliquid 或 Injective 账户
- 直接点击“加载 Demo 仓位”
- 让系统输出卡片化的对冲建议与执行入口

建议优先点击“加载 Demo 仓位”跑通固定演示路径；如果现场有可用模型 API Key，可以在设置里填入后展示增强版 AI 分析。`,

  riskBanner: {
    analyzePrompt: message => `请分析这个高风险仓位，并给我三套可执行的对冲方案：${message}`,
    analyzeDisplay: symbol => `请分析高风险仓位：${symbol}`,
  },

  settingsPanel: {
    subtitle: '连接真实账户并配置模型与执行凭证',
    modelSection: 'AI 模型',
    accountSection: '交易账户',
    apiKeyPlaceholder: label => `${label} 的 API Key`,
    connected: '已连接',
    syncedPositions: count => `已同步 ${count} 条仓位`,
    connecting: '连接中...',
    reconnect: '重新连接',
    connect: '连接',
    connectionFailed: '连接失败，请检查地址、私钥或网络状态。',
    privateKeyNotice: '为了降低真实资金风险，交易私钥不会持久化到浏览器本地存储。刷新页面后请重新填写执行私钥。',
    platforms: {
      hyperliquid: {
        fields: {
          address: '账户地址',
          privateKey: 'API 钱包私钥（执行用）',
        },
        hint: '读取仓位只需要账户地址；真实下单需要 API 钱包私钥。出于安全考虑，私钥不会在刷新后保留。',
      },
      injective: {
        fields: {
          address: '钱包地址',
          privateKey: '私钥（执行用）',
        },
        hint: '读取链上仓位使用地址；真实链上执行需要私钥。出于安全考虑，私钥不会在刷新后保留。',
      },
      polymarket: {
        fields: {
          apiKey: 'API Key',
        },
        hint: '当前主要用于策略展示和市场参考；真实自动下单暂不作为本轮 Demo 主路径。',
      },
      binance: {
        fields: {
          apiKey: 'API Key',
          apiSecret: 'API Secret',
        },
        hint: 'Binance 暂为预留入口，建议当前 Demo 不作为主链路使用。',
      },
    },
    models: {
      claude: '结构化分析稳定，中文表达自然',
      gpt4o: '通用能力均衡，适合快速试跑',
      deepseek: '中文体验自然，成本更友好',
      grok: 'xAI 接口备用模型',
    },
  },

  strategy: {
    planPrefix: '方案',
    types: {
      reverseHedge: '反向对冲',
      polymarket: 'Polymarket',
      options: '期权保护',
    },
    type: '类型',
    hedgeRatio: '对冲比例',
    complexity: '复杂度',
    estimatedCost: '成本',
    pros: '优点',
    cons: '风险',
    marketLinks: '实时市场链接',
    executing: '正在准备执行请求...',
    submitTrade: '交易已提交',
    demoSubmitted: '模拟执行完成',
    executionFailed: '执行失败，请检查参数、账户状态或稍后重试。',
  },
}
