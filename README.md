# HedgeAI

AI 对话式加密衍生品风控与对冲 Demo。  
当用户仓位接近爆仓时，系统会聚合账户仓位、生成风险提示、调用大模型给出 3 套对冲方案，并支持在 Injective Demo 模式下返回可验证的交易哈希。

## 项目目标

- 聚合 Hyperliquid / Injective 等账户仓位
- 自动扫描高风险仓位并展示告警
- 通过 AI 生成可读、可执行的对冲建议
- 一键触发 Injective 对冲执行或 Demo 交易广播

## 当前 Demo 范围

- 支持聊天式风险分析与策略生成
- 支持 Hyperliquid 只读仓位拉取
- 支持 Injective `demo` 示例仓位
- 支持 Injective Demo 执行返回 `tx_hash`
- 支持风险扫描横幅与自动触发 AI 建议

暂未完成：

- Binance 真实接入
- Polymarket 完整实盘下单闭环
- 服务端持久化会话与用户系统

## 技术栈

- Frontend: React 18 + Vite + Zustand
- Backend: FastAPI + Pydantic
- AI: Anthropic / OpenAI-compatible APIs
- Chain: Injective
- Market data: Hyperliquid / Polymarket

## 目录结构

```text
backend/
  main.py
  models/
  routers/
  services/
frontend/
  src/
    components/
    lib/
README.md
DEMO.md
```

## 快速开始

### 1. 启动后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 `http://localhost:5173`，并通过 Vite 代理访问后端 `http://localhost:8000`。

## 环境变量

后端示例见 [backend/.env.example](d:/HedgeAI/backend/.env.example)。

关键变量：

- `ANTHROPIC_API_KEY`: Claude 所需
- `OPENAI_API_KEY`: GPT-4o 可选
- `DEEPSEEK_API_KEY`: DeepSeek 可选
- `GROK_API_KEY`: Grok 可选
- `INJECTIVE_NETWORK`: `testnet` 或 `mainnet`
- `INJECTIVE_PRIVATE_KEY`: 真实执行时可选，不填则走 Demo 执行

## API 概览

- `POST /api/accounts/{platform}/connect`
- `GET /api/accounts/{platform}/positions`
- `GET /api/accounts/positions/all`
- `POST /api/chat/stream`
- `POST /api/chat/message`
- `POST /api/hedge/execute`
- `GET /api/risk/scan`
- `GET /api/health`

## 示例仓位 Demo

设置面板中为 Injective 提供了“加载示例仓位”入口。  
它会使用 `demo` 地址连接一组预置 BTC 高风险多单，便于稳定演示：

- 风险扫描横幅
- AI 自动建议
- 对冲卡片
- Demo 交易执行

更详细的演示脚本见 [DEMO.md](d:/HedgeAI/DEMO.md)。

## 核心链路

1. 连接真实账户，或加载 Injective 示例仓位
2. 风险扫描发现高风险仓位
3. 前端展示告警横幅，并自动触发 AI 风控分析
4. AI 输出中文分析和三套对冲卡片
5. 用户点击执行
6. 后端根据当前仓位、对冲比例、方向推导执行参数
7. 返回 Injective 交易哈希或 Demo 哈希

## 开发说明

- 当前会话使用内存存储，适合 Demo，不适合生产
- 如果未配置 Injective 私钥，执行接口会自动返回 Demo 交易结果
- 如果输入 `demo` 作为 Injective 地址，会直接返回预置示例仓位

## 验证建议

- 前端执行 `npm run build`
- 后端至少验证 `python -m py_compile` 能通过
- 手工验证主链路：示例仓位 -> 风险提示 -> AI 建议 -> 执行
