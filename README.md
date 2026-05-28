# HedgeAI

HedgeAI 是一个面向加密合约交易者的 AI 风控与对冲助手 Demo。

它想解决的问题很直接：当用户的合约仓位开始浮亏、接近强平时，普通交易者通常只剩下“死扛”或“割肉”两个选择。HedgeAI 希望把更专业的风险管理动作做成一个对话式产品：读取仓位，识别风险，解释原因，生成几套可执行的对冲方案，并把执行入口放到策略卡片里。

当前项目更适合作为比赛或产品原型演示，而不是直接接入真实资金的生产系统。

## 你可以用它演示什么

当前代码已经具备一条比较完整的 Demo 主链路：

1. 点击“加载 Demo 仓位”，或连接真实只读账户。
2. 后端扫描账户仓位风险。
3. 前端展示高风险告警。
4. 点击风险横幅里的“生成建议”。
5. 模型可用时输出 AI 分析；模型不可用时生成“本地兜底”策略卡。
6. 用户可以在卡片上查看执行思路、市场参考链接和执行入口。

更具体地说，当前可以演示：

- AI 聊天式仓位风险分析
- 高风险仓位扫描与顶部告警
- Injective `demo` 示例仓位
- 无模型 API Key 时的本地兜底策略卡
- Hyperliquid 只读仓位拉取
- 多模型入口：Claude、GPT-4o、DeepSeek、Grok
- Polymarket 事件市场参考搜索
- Derive 期权市场参考搜索
- 策略卡片展示、展开、执行结果展示

## 当前能力边界

为了避免误解，下面是代码当前更真实的状态。

| 模块 | 当前状态 | 说明 |
| --- | --- | --- |
| AI 风险分析 | 可用 | 通过模型 API 生成中文分析和策略 JSON |
| 风险扫描 | 可用 | 基于已连接账户仓位计算告警 |
| Injective 示例仓位 | 可用 | 使用地址 `demo` 返回内置 BTC 高风险多单 |
| Hyperliquid 仓位读取 | 基本可用 | 使用公开账户地址读取仓位 |
| Injective 真实执行 | 部分可用 | 需要配置私钥；仍建议只在 testnet 验证 |
| Polymarket 策略参考 | 部分可用 | 可以搜索事件市场，但完整实盘下单闭环还未完成 |
| 期权策略参考 | 部分可用 | 当前通过 Derive 公共数据找参考合约，不是完整期权交易闭环 |
| Binance 接入 | 预留 | 前端有入口，后端目前不是完整真实接入 |
| 会话持久化 | 未完成 | 后端账户会话仍存在内存里，重启会丢失 |
| 实盘安全控制 | 未完成 | 缺少统一 dry-run/real-run 开关、额度限制、审计日志和二次确认 |

## 技术栈

### 前端

- React 18
- Vite
- Zustand
- Axios
- React Markdown
- Lucide React

### 后端

- Python FastAPI
- Pydantic
- SSE 流式响应
- Anthropic SDK
- OpenAI-compatible Chat Completion API
- Injective Python SDK
- Hyperliquid Python SDK
- Polymarket `py-clob-client`

## 项目结构

```text
HedgeAI/
  backend/
    main.py
    models/
      schemas.py
    routers/
      accounts.py
      chat.py
      hedge.py
      risk.py
    services/
      ai_service.py
      hyperliquid_service.py
      injective_service.py
      options_market_service.py
      polymarket_service.py
    tests/
      test_chat_smoke.py
    .env.example
    requirements.txt

  frontend/
    src/
      App.jsx
      components/
      lib/
    package.json
    vite.config.js

  DEMO.md
  README.md
```

## 快速开始

建议先跑通 Demo 链路，再尝试接真实账户。

### 1. 启动后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

如果你使用 macOS 或 Linux，把激活虚拟环境和复制 env 文件的命令换成：

```bash
source .venv/bin/activate
cp .env.example .env
```

后端启动后，可以访问：

```text
http://localhost:8000/api/health
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在：

```text
http://localhost:5173
```

Vite 已经配置好 `/api` 代理，会把前端请求转发到：

```text
http://localhost:8000
```

## 环境变量

后端环境变量示例在 `backend/.env.example`。

最常用的是：

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...
GROK_API_KEY=...

INJECTIVE_NETWORK=testnet
INJECTIVE_PRIVATE_KEY=
INJECTIVE_EXECUTION_LEVERAGE=5

CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

说明：

- `ANTHROPIC_API_KEY`：使用 Claude 时需要。
- `OPENAI_API_KEY`：使用 GPT-4o 时需要。
- `DEEPSEEK_API_KEY`：使用 DeepSeek 时需要。
- `GROK_API_KEY`：使用 Grok 时需要。
- `INJECTIVE_NETWORK`：建议 Demo 阶段保持 `testnet`。
- `INJECTIVE_PRIVATE_KEY`：只有执行真实链上交易时才需要。不要把主网大额钱包私钥放进 Demo 环境。

## 推荐 Demo 流程

最稳的演示方式是使用内置 Injective 示例仓位。

1. 启动后端和前端。
2. 打开 `http://localhost:5173`。
3. 点击“加载 Demo 仓位”。
4. 等待顶部风险告警出现。
5. 点击风险横幅里的“生成建议”。
6. 如果模型 API Key 可用，展示 AI 分析；如果没有 Key，展示“本地兜底”三张策略卡。
7. 展开生成的 3 张策略卡片。
8. 讲解反向合约、Polymarket、期权保护三种思路。
9. 说明 Demo 仓位不会被当成真实可交易仓位执行。

完整 3 分钟演示脚本见 `DEMO.md`。

## 核心 API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/api/health` | 后端健康检查 |
| `POST` | `/api/accounts/{platform}/connect` | 连接账户 |
| `GET` | `/api/accounts/{platform}/positions` | 获取单个平台仓位 |
| `GET` | `/api/accounts/positions/all` | 聚合所有已连接账户仓位 |
| `GET` | `/api/risk/scan` | 扫描高风险仓位 |
| `POST` | `/api/chat/stream` | 流式 AI 对话 |
| `POST` | `/api/chat/message` | 非流式 AI 对话 |
| `POST` | `/api/hedge/enrich-strategies` | 给策略补充市场参考 |
| `POST` | `/api/hedge/execute` | 执行策略 |

## 开发验证

推荐一键质量门禁：

```bash
python scripts/quality_gate.py
```

该脚本会自动为后端 pytest 设置 `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1`，避免本地第三方 pytest 插件污染测试环境；随后依次运行后端 pytest、前端 vitest 和前端 build。

只跑后端：

```bash
python scripts/quality_gate.py --backend-only
```

只跑前端测试和构建：

```bash
python scripts/quality_gate.py --frontend-only
```

## 安全提醒

这个项目目前是 Demo / Prototype，不建议直接接真实资金运行。

在进入真实交易前，至少需要补齐：

- 统一的 `demo` / `dry-run` / `real-run` 执行模式
- 真实执行前的二次确认
- 单笔和单日额度限制
- 市场白名单
- 操作审计日志
- 后端安全会话存储
- API Key 和私钥的加密存储或托管方案
- 交易前余额、仓位、滑点和重复提交校验

如果只是演示，请尽量使用：

- Injective testnet
- `demo` 示例仓位
- 小额测试钱包
- 预设模型 Key

## 后续路线

建议按这个顺序推进：

1. 先保证 Demo 主链路稳定：示例仓位、风险扫描、AI 策略卡片。
2. 补齐执行安全层：dry-run、real-run、确认、额度、审计。
3. 把账户会话从内存迁移到 Redis 或数据库。
4. 完成 Polymarket 真实市场发现、下单、订单查询闭环。
5. 明确期权执行 venue，并补齐报价、下单、成交确认。
6. 增加 accounts、risk、hedge 的单测和集成测试。
7. 再考虑 Binance / OKX / Bybit 等更多平台。

## 一句话介绍

HedgeAI 不是想替用户盲目交易，而是想在仓位最危险的时候，把“风险发生了什么、可以怎么防守、执行会付出什么成本”讲清楚，并把下一步操作变得足够具体。
