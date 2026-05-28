# HedgeAI 六个视觉高成效任务 TDD 行动计划

> 目标：以 TDD 方式推进六个最容易在 demo 中看到成效的任务。每个任务先写失败测试，再实现功能，最后由监督者做独立审查。  
> 原则：anime.js 只承担视觉反馈、动效编排和状态强调，不承载业务判断。交易安全、执行模式、fallback 逻辑必须由测试和后端兜底。

## 团队组织

| 角色 | 职责 | 产出 |
|---|---|---|
| 监督者 / Tech Lead Reviewer | 审查需求拆解、测试有效性、diff 范围、交易安全边界；最终决定是否合并 | 审查意见、风险清单、Go/No-Go |
| TDD Driver | 每个任务先写失败测试，推动 Red -> Green -> Refactor | 测试用例、测试报告 |
| 前端工程师 A | Demo 入口、执行模式、确认弹窗、anime.js 动效 | 前端组件、交互测试 |
| 前端工程师 B | 文案、fallback 策略卡、策略卡展示 | UI 文案、fallback 逻辑、组件测试 |
| 全栈工程师 A | Polymarket dry-run、市场快照、执行模式后端保护 | 后端 schema/router/service、API 测试 |
| 全栈工程师 B | Options 推荐细节、执行语义修正 | options service、schema、UI panel |
| QA / Demo Owner | 维护最小 demo 脚本、录屏验收、回归测试 | 验收清单、问题复现 |

## TDD 工作流

1. Red：先写失败测试，明确预期行为。
2. Green：只写刚好让测试通过的最小实现。
3. Refactor：清理重复、抽 helper、补视觉细节。
4. Review：监督者检查测试是否真的覆盖风险，而不是只验证实现细节。
5. Demo Gate：浏览器手工验收通过后，任务才算完成。

## D0：TDD 与协作基础设施

**目标完成度：80%**  
在进入六个功能任务前，先把测试、审查、浏览器验收和项目专属 skill 固化下来。

### D0 Diff

```diff
.gitignore
- {frontend/
+ frontend/

frontend/package.json
+ "test": "vitest run"
+ "test:watch": "vitest"
+ animejs / vitest / testing-library / jsdom / msw

frontend/vite.config.js
+ test.environment = "jsdom"
+ test.setupFiles = "./src/test/setup.js"

frontend/src/test/setup.js
+ import '@testing-library/jest-dom/vitest'
+ beforeEach(() => localStorage.clear())

项目计划/监督者审查模板.md
+ 监督者审查模板

~/.codex/skills/hedgeai-tdd/SKILL.md
+ 项目专属 TDD / 启动 / 验收 / 审查流程 skill
```

### D0 验收标准

- 已创建 D0 分支。
- `rg` 不再被 `.gitignore` 坏 glob 阻断。
- 前端具备 Vitest + Testing Library 测试入口。
- 监督者审查模板可直接用于每个任务。
- `hedgeai-tdd` skill 可被后续任务复用。
- `pnpm run build` 与 `pnpm run test` 可执行，若失败必须记录具体阻塞原因。

## 公共前置任务

| 项 | 当前完成度 | 目标完成度 | 负责人 |
|---|---:|---:|---|
| 安装 anime.js v4 | 0% | 100% | 前端 A |
| 新增 motion helper | 0% | 100% | 前端 A |
| 修复可见中文乱码 | 20% | 95% | 前端 B |
| 修复 `.gitignore` 坏 glob | 0% | 100% | 全栈 A |
| 建立 TDD 测试脚手架 | 20% | 80% | TDD Driver |

公共 diff：

```diff
frontend/package.json
+ "animejs": "^4.4.1"
+ "vitest": "^2.x"
+ "@testing-library/react": "^15.x"
+ "@testing-library/jest-dom": "^6.x"
+ "@testing-library/user-event": "^14.x"

frontend/src/test/setup.js
+ import '@testing-library/jest-dom/vitest'

frontend/vite.config.js
+ test: { environment: 'jsdom', setupFiles: './src/test/setup.js' }

frontend/src/lib/motion.js
+ export function enterCards(...)
+ export function pulseRisk(...)
+ export function slideIn(...)
+ export function countNumber(...)

frontend/src/lib/copy.js
+ 集中管理 demo 可见文案，避免 JSX 内散落长中文

.gitignore
- {frontend/
+ frontend/
```

监督者公共审查点：

- 测试是否先于实现提交。
- 动效是否可关闭或不影响核心功能。
- 真实交易路径是否有后端保护。
- demo / dry-run / real 是否在 UI 和 API 上同时区分。
- 所有新增文案是否无乱码、无误导。

---

## 任务 1：P0-1 一键加载 Demo 仓位

**当前完成度：45%**  
后端已有 `injective` 地址为 `demo` 时返回 mock 高风险仓位的基础能力，但前端缺少一键入口。

**目标完成度：85%**  
用户点击“加载 Demo 仓位”后，自动连接 demo 账户、同步仓位、触发风险扫描、展示风险 banner，并可继续生成策略卡。

### Red：先写测试

```diff
frontend/src/components/DemoPositionButton.test.jsx
+ mock connectAccount / fetchPositions / scanRisk
+ 点击按钮后断言：
+ - connectAccount('injective', { address: 'demo' }) 被调用
+ - store.accounts.injective.connected === true
+ - store.accounts.injective.positions.length > 0
+ - setRiskAlerts 被写入 IMMEDIATE alert
+ - 按钮显示“Demo 已加载”

backend/tests/test_demo_account.py
+ POST /api/accounts/injective/connect address=demo
+ 断言 connected=true, trading_enabled=false
+ GET /api/accounts/injective/positions 返回 BTC 高风险仓位

backend/tests/test_risk_demo.py
+ 连接 demo 后 GET /api/risk/scan
+ 断言至少一个 IMMEDIATE alert
+ 断言包含 liquidation_distance_pct
```

### Green：实现 diff

```diff
frontend/src/lib/api.js
+ export const connectDemoAccount = () =>
+   connectAccount('injective', { address: 'demo' })

frontend/src/lib/store.js
+ demo: { loading: false, loaded: false, error: '' }
+ setDemoState: (patch) => set(...)

frontend/src/components/DemoPositionButton.jsx
+ 新增组件
+ 调用 connectDemoAccount()
+ 成功后 fetchPositions('injective')
+ 写入 setAccountConnected('injective', true, { address: 'demo', positions })
+ 立即 scanRisk() 并写入 setRiskAlerts()
+ addMessage({ role: 'system', content: '已加载 Demo 高风险仓位' })
+ 使用 anime.js 做 loading / success 反馈

frontend/src/components/ChatView.jsx
+ 顶部标题区加入 DemoPositionButton

backend/routers/accounts.py
+ demo session 标记 mode="demo"
+ demo 返回 trading_enabled=false

backend/routers/risk.py
+ alert 增加 liquidation_distance_pct / unrealized_pnl_pct / position
~ 修复中文风险 message
```

### 监督者审查点

- 不要求用户先打开设置面板。
- demo 账户不能被标记为真实可交易。
- 点击后不依赖 20 秒轮询才出现风险提示。

### 验收标准

- 2 秒内 INJ 状态变为已连接。
- 风险 banner 出现 IMMEDIATE。
- 聊天区出现系统提示。
- 刷新后私钥不持久化。

---

## 任务 2：P0-2 AI 失败 fallback 策略卡片

**当前完成度：20%**  
`sendChatMessage()` 失败时只显示错误文案，不生成策略卡；纯文本策略解析也受乱码影响。

**目标完成度：80%**  
模型不可用、流式接口失败、解析失败时，仍基于当前仓位生成 3 张本地兜底策略卡，并明确标注“本地兜底”。

### Red：先写测试

```diff
frontend/src/lib/fallbackStrategies.test.js
+ 有高风险 BTC long 仓位时生成 3 张策略卡
+ 策略类型分别为 REVERSE_HEDGE / POLYMARKET / OPTIONS
+ 每张卡包含 id/title/description/hedge_ratio/pros/cons/injective_action
+ 无仓位时返回引导用户加载 demo 的内容

frontend/src/lib/chat.test.js
+ sendMessageStream reject 时 updateLastAssistant 写入 fallback strategies
+ sendMessageStream 成功但无法解析策略时进入 fallback
+ fallback_reason 存在且不为空

frontend/src/components/ChatMessage.test.jsx
+ message.fallback_reason 存在时显示“本地兜底”
+ 渲染 3 张 HedgeCard
```

### Green：实现 diff

```diff
frontend/src/lib/fallbackStrategies.js
+ export function buildFallbackAnalysis({ accounts, riskAlerts, reason }) { ... }
+ 根据最大风险仓位生成 A/B/C 三类策略
+ 增加 source: "fallback"
+ 增加 confidence: "local-rule"

frontend/src/lib/chat.js
+ import { buildFallbackAnalysis } from './fallbackStrategies'
~ catch 分支改为生成 fallback analysis
~ parsedMessage === null 时进入 fallback
~ 修复中文策略解析正则：
~ /(?:方案|策略)\s*([A-C])\s*[:：]\s*(.+)/

frontend/src/components/ChatMessage.jsx
+ fallback warning chip
+ 策略卡列表外层 ref，调用 anime.js stagger 入场

frontend/src/components/HedgeCard.jsx
+ strategy.source === "fallback" 时显示“本地兜底”
+ 首次 mount 时执行 enterCards()
```

### 监督者审查点

- fallback 不能伪装成 AI 输出。
- 没有仓位时不能凭空生成可执行策略。
- fallback 输出结构必须与正常 AI 策略卡兼容。

### 验收标准

- 不填模型 API Key 也能生成 3 张卡。
- UI 明确显示“本地兜底”。
- 三张卡错峰入场，顺序稳定为 A/B/C。

---

## 任务 3：P0-3 Demo 文案和错误提示清理

**当前完成度：65% 功能可用，20% 观感合格**  
当前 UI 和部分后端返回中存在大量乱码，严重影响 demo 可信度。

**目标完成度：95%**  
首屏、设置、风险 banner、策略卡、执行结果、后端错误信息全部为正常中文，并区分 demo / dry-run / real。

### Red：先写测试

```diff
frontend/src/lib/copy.test.js
+ COPY 中关键字段不包含 mojibake 特征字符
+ 必备字段存在：demoLoad / generateAdvice / executeStrategy / localFallback

frontend/src/components/TopBar.test.jsx
+ 渲染后包含“HedgeAI”“设置”
+ 不包含明显乱码片段

frontend/src/components/HedgeCard.test.jsx
+ idle 显示“执行此方案”或模式化按钮文案
+ error 状态显示清楚中文错误

backend/tests/test_copy_messages.py
+ risk scan 返回 message 不包含乱码
+ hedge execute 缺少私钥时返回正常中文错误
```

### Green：实现 diff

```diff
frontend/src/lib/copy.js
+ export const COPY = { ... }

frontend/src/App.jsx
~ 替换系统提示和自动建议 prompt

frontend/src/components/TopBar.jsx
~ 修复品牌副标题、设置按钮

frontend/src/components/ChatView.jsx
~ 修复 WELCOME、标题、当前模型标签

frontend/src/components/ChatMessage.jsx
~ 修复“你 / 风险等级 / 距强平”

frontend/src/components/HedgeCard.jsx
~ 修复策略类型、badge label、执行状态、错误状态

frontend/src/components/RiskBanner.jsx
~ 修复“生成建议”和 prompt

frontend/src/components/SettingsPanel.jsx
~ 修复所有字段、hint、错误提示

backend/routers/risk.py
~ 修复 alert.message 中文

backend/routers/hedge.py
~ 修复 ExecuteResult.summary 和 ValueError 中文

frontend/src/index.css
~ 修复 prose li::before 的乱码 bullet
```

### 监督者审查点

- 文案不夸大真实交易能力。
- 错误提示有下一步行动建议。
- demo 模式和真实模式文案不会混淆。

### 验收标准

- demo 录屏中无可见乱码。
- 用户不需要口头解释任何按钮含义。
- 缺私钥、缺市场数据、模型失败都有清楚提示。

---

## 任务 4：P1-1 demo / dry-run / real-run 标签、确认弹窗和执行进度

**当前完成度：15%**  
前端没有统一执行模式，没有确认弹窗；后端也没有统一的执行模式字段。

**目标完成度：75%**  
每张策略卡明确显示当前执行模式。点击执行前弹出确认，确认后展示分步骤进度。真实模式必须后端确认。

### Red：先写测试

```diff
backend/tests/test_execute_modes.py
+ real 模式 confirmed=false 时返回 400 或 success=false
+ demo 模式不调用真实下单 service
+ dry_run 模式返回 mode="dry_run" 和 steps
+ 缺少私钥时 real 模式返回明确错误

frontend/src/components/ExecutionModeSwitch.test.jsx
+ 切换 demo/dry_run/real 后 store.executionMode 更新
+ 当前模式有可见 active 状态

frontend/src/components/ConfirmExecutionModal.test.jsx
+ real 模式必须勾选确认才能提交
+ dry_run/demo 不展示“真实提交”误导文案

frontend/src/components/HedgeCard.execute.test.jsx
+ 点击执行先打开确认弹窗
+ 确认后 executeHedge payload 包含 mode 和 confirmed
+ loading 时显示 ExecutionProgress
```

### Green：实现 diff

```diff
backend/models/schemas.py
+ class ExecuteMode(str, Enum): DEMO / DRY_RUN / REAL
~ ExecuteRequest 增加 mode, confirmed
~ ExecuteResult 增加 mode, steps, warnings

backend/routers/hedge.py
~ execute_hedge(req)
+ real && !confirmed 时拒绝
+ demo/dry_run 不调用真实下单 service
+ 所有返回带 mode 和 steps

frontend/src/lib/store.js
+ executionMode: 'demo'
+ setExecutionMode

frontend/src/components/ExecutionModeSwitch.jsx
+ 新增 segmented control
+ anime.js 控制 active indicator 位移

frontend/src/components/ConfirmExecutionModal.jsx
+ 新增确认弹窗
+ real 模式要求 checkbox
+ anime.js overlay fade + panel slide

frontend/src/components/ExecutionProgress.jsx
+ 新增步骤进度组件
+ anime.js timeline 驱动 step 状态

frontend/src/components/HedgeCard.jsx
~ handleExecute 改为先打开 ConfirmExecutionModal
~ executeHedge payload 增加 mode / confirmed
~ loading 替换为 ExecutionProgress
```

### 监督者审查点

- 真实交易路径必须由后端阻断未确认请求。
- dry-run 不得返回“交易已提交”。
- demo 模式返回必须明确是模拟结果。

### 验收标准

- 页面始终可见当前执行模式。
- real 未确认时无法提交。
- demo 执行显示完整步骤和模拟结果。

---

## 任务 5：P1-3 Polymarket dry-run 市场链接和价格展示

**当前完成度：25%**  
后端能查参考市场并返回链接，但前端只显示普通链接。执行接口仍写死 `demo-token`。

**目标完成度：70%**  
Polymarket 卡片展示真实市场问题、outcome、价格/概率、更新时间和 dry-run 订单预览。真实模式禁止使用固定 demo token。

### Red：先写测试

```diff
backend/tests/test_polymarket_enrichment.py
+ enrich POLYMARKET strategy 后包含 market_snapshot
+ market_links[0] 包含 price/probability/token_id 中可用字段
+ API 失败时不伪造成功市场

backend/tests/test_polymarket_execute.py
+ dry_run 返回订单预览，不调用 place_order
+ real 模式 token_id 缺失时拒绝
+ real 模式不允许 demo-token

frontend/src/components/MarketSnapshot.test.jsx
+ 渲染 question/outcome/price/probability
+ 没有实时市场时显示参考不可用文案

frontend/src/components/HedgeCard.polymarket.test.jsx
+ POLYMARKET strategy 渲染 MarketSnapshot
+ dry_run 执行结果显示“订单预览”
```

### Green：实现 diff

```diff
backend/models/schemas.py
~ StrategyMarketLink 增加 price/probability/updated_at/token_id
~ HedgeStrategy 增加 market_snapshot: Optional[dict]

backend/services/polymarket_service.py
~ find_hedge_for_position 返回 token_id/outcome/price/probability/question/slug/updated_at
~ 失败返回 None，不造假成功

backend/routers/hedge.py
~ _enrich_single_strategy 增加 market_snapshot
~ _execute_polymarket(strategy, mode)
+ dry_run 返回订单预览
+ real 必须有真实 token_id
+ demo 才允许 demo order id

frontend/src/components/MarketSnapshot.jsx
+ 新增组件
+ anime.js 将概率条从 0 动到目标值

frontend/src/components/HedgeCard.jsx
+ POLYMARKET strategy 渲染 MarketSnapshot
~ dry_run 结果文案改为“订单预览已生成”
```

### 监督者审查点

- 非 demo 文案中不能出现 mock order。
- 市场 API 失败时不能伪造价格。
- dry-run 必须像订单预览，而不是交易回执。

### 验收标准

- Polymarket 卡片显示事件标题、价格或概率、外链。
- dry-run 后显示订单预览。
- 后端真实模式不再使用固定 `demo-token`。

---

## 任务 6：P2-2 Options 推荐细节展示

**当前完成度：25%**  
后端可找 Derive reference，但前端只当普通链接展示；`OPTIONS` 执行语义容易被误解为自动买期权。

**目标完成度：65%**  
Options 卡片展示合约、方向、strike/expiry、保护范围、成本区间和适用场景。执行按钮改为“生成期权执行清单”或“打开期权市场确认”。

### Red：先写测试

```diff
backend/tests/test_options_reference.py
+ find_option_for_position 返回 instrument_name / protection_note
+ long 仓位倾向 put protection
+ short 仓位倾向 call protection

backend/tests/test_options_execute_semantics.py
+ OPTIONS dry_run 返回 checklist，不调用 injective_service.execute_order
+ summary 明确“请在 Derive 页面确认”

frontend/src/components/OptionReferencePanel.test.jsx
+ 渲染 venue / instrument / side / strike / expiry
+ 参数不完整时显示“参考合约未完全解析”

frontend/src/components/HedgeCard.options.test.jsx
+ OPTIONS 卡片渲染 OptionReferencePanel
+ 按钮文案不是“真实下单”
```

### Green：实现 diff

```diff
backend/models/schemas.py
+ class OptionReference(BaseModel)
~ HedgeStrategy 增加 option_reference

backend/services/options_market_service.py
~ find_option_for_position 解析 option_type/strike/expiry/instrument_name
+ 输出 protection_note

backend/routers/hedge.py
~ _enrich_single_strategy 写入 option_reference
~ _execute_injective_options 改为 dry-run checklist 语义
~ 非明确支持真实期权前，不调用 injective_service.execute_order

frontend/src/components/OptionReferencePanel.jsx
+ 新增组件
+ 使用 anime.js stagger 展示关键参数

frontend/src/components/HedgeCard.jsx
+ OPTIONS strategy 渲染 OptionReferencePanel
~ OPTIONS 按钮文案：
~ demo/dry_run: 生成期权执行清单
~ real: 打开期权市场确认
```

### 监督者审查点

- 不允许让用户误以为系统已经自动买入期权。
- 推荐理由和执行限制必须分开展示。
- 参数不完整时仍需保留 Derive 入口，但要显示限制。

### 验收标准

- Options 卡片可见合约名、方向、保护理由。
- 点击执行不会伪装成真实期权成交。
- 有明确 Derive 页面入口。

---

## 监督者最终审查清单

每个任务完成后，监督者必须逐项确认：

- Red 阶段测试确实先失败过。
- Green 阶段没有绕过测试或删除关键断言。
- 新增 API 字段有前后端契约测试。
- 真实交易路径有后端保护。
- demo / dry-run / real 三种模式文案一致。
- UI 无乱码、无误导性“已成交/已提交”表述。
- anime.js 动效不影响按钮点击、键盘操作和核心流程。
- `pnpm run build` 通过。
- 后端相关测试通过，若 pytest 插件环境仍异常，需记录阻塞原因和替代验证结果。

## 更新后的里程碑

| 天数 | TDD 目标 | 监督者审查 |
|---:|---|---|
| D1 | 建测试脚手架、修乱码测试、安装 anime.js、修 `.gitignore` | 检查测试能稳定运行 |
| D2 | P0-1 Red/Green：一键 Demo 仓位 | 检查 demo 不具备真实交易能力 |
| D3 | P0-2 Red/Green：fallback 策略卡 | 检查 fallback 不伪装 AI |
| D4 | P1-1 Red/Green：执行模式、确认弹窗、进度 | 检查真实模式后端阻断 |
| D5 | P1-3 Red/Green：Polymarket market snapshot / dry-run | 检查无 demo-token 真实执行 |
| D6 | P2-2 Red/Green：Options 细节展示和执行语义 | 检查不误导为自动期权成交 |
| D7 | 全链路回归、浏览器验收、录屏 | Go/No-Go |

## 最小验收脚本

1. 打开 `http://127.0.0.1:5173/`。
2. 点击“加载 Demo 仓位”。
3. 确认 INJ 已连接，风险 banner 出现。
4. 点击“生成建议”。
5. 模型可用时出现 AI 策略卡；模型不可用时出现“本地兜底”策略卡。
6. 切换 `demo / dry-run / real`，确认按钮文案和确认弹窗随模式变化。
7. 执行 REVERSE_HEDGE demo，看到步骤进度和模拟结果。
8. 查看 Polymarket 卡片，确认市场标题、价格或概率、外链可见。
9. 查看 Options 卡片，确认合约参考、保护理由、Derive 入口可见。
10. 监督者复核没有真实交易误导、没有乱码、测试和 build 结果可追溯。
