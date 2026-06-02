export const COPY = {
  demoLoad: '加载 Injective Demo',
  demoLoading: '加载中...',
  demoLoaded: 'Demo 已加载',
  demoLoadFailed: 'Injective Demo 加载失败，请稍后重试。',
  demoLoadedMessage: '已加载 Injective Testnet 高风险仓位，风险扫描与对冲建议入口已刷新。',
  generateAdvice: '生成建议',
  executeStrategy: '执行此方案',
  localFallback: '本地兜底',
  fallbackUnavailable: '当前没有可用仓位。请先加载 Demo 仓位（Injective），或连接一个可读取仓位的账户。',
  fallbackSummary: ({ symbol, direction, distance }) =>
    `模型暂时不可用，已基于 ${symbol} ${direction} 仓位生成 3 套本地兜底策略。当前距强平约 ${distance}%。`,
  settings: '设置',

  appSubtitle: 'AI 风控与对冲工作台',
  chatTitle: '卡片式对冲分析',
  chatSubtitle: '用中文描述你的仓位、风险目标或偏好，我们会返回可展开、可执行的策略卡片。',
  appSubtitle: 'Helix-Aligned Injective Risk Terminal',
  chatTitle: 'Helix / Injective 原生对冲终端',
  chatSubtitle: '覆盖 Perps、FX、Commodities、Indices 与 iAssets / RWA 的风险控制与对冲生成',
  currentModel: '当前模型',
  userLabel: '你',
  assistantLabel: 'HedgeAI',
  riskLevel: '风险等级',
  liquidationDistance: '距强平',

  app: {
    autoRiskMessage: message => `检测到高风险 Injective 仓位：${message}，已自动发起对冲分析。`,
    autoRiskPrompt: () => '请基于当前已连接账户的仓位信息，给我三套可执行的 Injective 对冲方案，优先降低强平与方向性风险，并解释每套方案适合什么情境。',
    autoRiskDisplay: '请基于当前高风险仓位给出对冲方案',
  },

  chatInput: {
    quickPrompts: [
      '分析我当前 Helix 永续仓位的强平风险',
      '基于 BTC/USDT PERP 给我三套 Helix 风格对冲方案',
      '如果我要优先保住保证金，最稳妥的 subaccount 对冲方式是什么',
      '解释 Helix 上的 iAssets、FX、Commodities 和 binary options 怎么配合对冲',
      '帮我把方向性仓位拆成 Helix perps + 事件型保护两层',
    ],
    placeholder: '描述你的 Injective 仓位、风险目标或想验证的生态能力，例如：我在 Injective 上有一笔 ETH 永续多单，想要一套更像比赛作品的原生对冲方案。',
    sendHint: '按 Enter 发送，Shift + Enter 换行。',
  },

  welcome: `欢迎使用 **HedgeAI**，一个面向 **Helix / Injective 生态** 的原生风险控制与对冲终端。

**这不是泛化的“AI 交易助手”**，而是围绕 Injective 的核心金融原语来组织体验：

- **Helix Perps**：基于 marketId、subaccount、保证金率与 orderbook 做风险识别
- **Injective Testnet Demo**：直接加载高风险仓位，现场演示 liquidation risk 与对冲决策
- **iAssets / RWA 叙事**：把链上股票、外汇、商品、指数与跨市场暴露纳入统一风险驾驶舱
- **Binary Options / Event Hedges**：把事件型保护作为第二层尾部风险工具

**推荐演示路径**

1. 点击右上角 **加载 Injective Demo**
2. 观察自动风险扫描与强平距离提示
3. 让系统给出 3 套 Injective 原生对冲方案
4. 展示 Demo / Dry-run / Real 三种执行语义边界

> 这版作品最适合在比赛里被讲成：**Helix 对齐的 Injective 风险终端 + RWA / iAssets 风险驾驶舱**，而不是泛用型量化聊天工具。`,

  riskBanner: {
    analyzePrompt: message => `请基于这条 Injective 风险告警，给我三套可执行的对冲方案：${message}`,
    analyzeDisplay: symbol => `请分析这个高风险仓位：${symbol}`,
  },

  settingsPanel: {
    subtitle: '连接真实账户，或用 Injective Testnet Demo 展示 subaccount、market 与风控链路',
    modelSection: 'AI 模型',
    accountSection: '交易账户',
    apiKeyPlaceholder: label => `${label} 的 API Key`,
    connected: '已连接',
    syncedPositions: count => `已同步 ${count} 条仓位`,
    connecting: '连接中...',
    reconnect: '重新连接',
    connect: '连接',
    disconnect: '断开连接',
    connectionFailed: '连接失败，请检查地址、私钥或网络状态。',
    privateKeyNotice: '为了降低真实资金风险，执行私钥不会持久化到浏览器本地存储。刷新页面后请重新填写。',
    platforms: {
      hyperliquid: {
        fields: {
          address: '账户地址',
          privateKey: '执行私钥（可选）',
        },
        hint: '作为跨市场对比数据源使用，帮助你展示 HedgeAI 支持多 venue 风险视角。',
      },
      injective: {
        fields: {
          address: '钱包地址',
          privateKey: '执行私钥（可选）',
        },
        hint: '比赛主叙事建议优先使用 Injective：marketId、subaccount、perps、testnet demo、风险扫描与执行预览都围绕这里展开。',
      },
      polymarket: {
        fields: {
          apiKey: 'API Key',
        },
        hint: '可作为事件型对冲的参考市场，用于补充 Binary Options / Event Hedge 叙事。',
      },
      binance: {
        fields: {
          apiKey: 'API Key',
          apiSecret: 'API Secret',
        },
        hint: '更适合作为参考价格与跨市场对照，不建议作为比赛主生态入口。',
      },
    },
    models: {
      claude: '适合输出结构化、评委可读的中文策略说明',
      gpt4o: '适合快速演示与多风格表达',
      deepseek: '中文自然、成本友好，适合现场多轮互动',
      grok: '备用模型入口，用于展示多模型兼容性',
    },
  },

  strategy: {
    planPrefix: '方案',
    types: {
      reverseHedge: 'Injective Perps',
      polymarket: 'Event Hedge',
      options: 'Options / Structured',
    },
    type: '类型',
    hedgeRatio: '对冲比例',
    complexity: '复杂度',
    estimatedCost: '成本',
    pros: '优点',
    cons: '风险',
    marketLinks: '生态入口',
    executing: '正在准备执行请求...',
    submitTrade: '交易已提交',
    demoSubmitted: '模拟执行完成',
    dryRunReady: '订单预览已生成',
    executionFailed: '执行失败，请检查参数、账户状态或稍后重试。',
  },

  executionMode: {
    demo: 'Demo',
    dryRun: 'Dry-run',
    real: 'Real',
  },
}
