# HedgeAI 演示脚本

## 一句话 Pitch

HedgeAI 是一个 **Helix 对齐的 Injective 风险终端**，可以把永续合约、外汇、大宗商品、指数与 iAssets / RWA 敞口转化为结构化对冲行动手册。

## 评委应该注意什么

这不是一个泛用 AI 聊天界面。演示重点围绕：

- **Helix 风格的市场分类**
- **永续合约风险与强平距离**
- **subaccount 感知的产品语言**
- **清晰的 Demo / Dry-run / Real 执行语义**
- **通往 iAssets、RWA 与事件对冲的路线图**

## 3 分钟演示流程

### 0:00 - 0:20

打开应用后这样开场：

> 我们不是只生成 AI 建议，而是在为 Injective 交易者构建一个 Helix 对齐的风险驾驶舱，覆盖 crypto、FX、commodities、indices 和 iAssets。

强调产品外壳：

- Injective 连接状态
- Demo / Dry-run / Real 执行模式
- Injective marketId 驱动的演示面板

### 0:20 - 0:45

打开 Demo 面板，展示分组市场选择器：

- `Helix Crypto Perps`
- `Helix FX`
- `Helix Commodities`
- `Helix Indices`
- `Helix iAssets / RWA`

然后点击 **加载 Demo 仓位**，加载一个 Injective Testnet 仓位。

可以这样讲：

> 这个演示绑定 Injective 的市场对象，同时用 Helix 的产品视角组织，让用户能从 crypto perps 扩展到 FX、commodities、indices，并最终进入链上股票和 RWA 风险管理。

强调：

- `marketId`
- maintenance margin
- maker / taker fee profile
- testnet semantics

### 0:45 - 1:15

展示风险状态：

- 当前参考价格
- Injective Mid
- liquidation distance
- pnl estimate mode

可以这样讲：

> 我们区分真实参考价格与 Injective 测试网市场价格，让操作者既能看到决策上下文，也能看到协议原生市场状态。

### 1:15 - 1:50

触发对冲分析。

如果没有模型 API Key，也可以继续演示：系统会进入 **无需模型 API Key** 的本地兜底流程，并生成三张本地策略卡。

将输出解释为：

- **Injective Perps hedge**
- **event hedge / binary-options-like protection**
- **structured protection / options-style path**

可以这样讲：

> 产品会从永续合约风险出发，扩展到 Helix 对齐的 iAssets、FX、commodities、indices，以及 Injective 生态中的事件驱动保护。

### 1:50 - 2:30

打开一张策略卡，解释：

- hedge ratio
- estimated cost
- 为什么它能降低强平压力
- 为什么它比通用交易机器人更贴合 Injective

执行语义要讲清楚：

- `Demo` 只返回模拟结果
- `Dry-run` 只生成订单预览
- `Real` 必须经过真实提交确认与后端预检

这里要特别说明：实盘执行存在 **安全阻断**，如果缺少确认、凭证或预检不通过，后端不会提交真实订单。

### 2:30 - 3:00

用生态路线图收尾：

> 今天的切入点是 Helix 对齐的永续合约风险管理。下一步，同一套风险驾驶舱会扩展到 iAssets、RWA exposure、FX、commodities，以及 binary-options-style event hedging。

## 最强比赛表述

反复使用这些短语：

- `Helix-aligned Injective risk terminal`
- `perp risk cockpit`
- `subaccount-aware risk management`
- `marketId-bound multi-asset demo flow`
- `roadmap to iAssets, RWA, and event hedges`
- `本地兜底`
- `安全阻断`

避免把项目说成：

- “一个加密货币 AI 助手”
- “通用对冲聊天机器人”
- “又一个交易 copilot”

## 如果现场出问题

兜底话术：

> 即使外部模型或场所服务波动，产品仍然能展示 Injective 核心叙事：market-bound risk state、liquidation-aware decision support，以及 structured hedge pathways。
