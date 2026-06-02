# HedgeAI

HedgeAI 是一个面向 **Injective 原生永续合约风险管理** 的对冲终端，用于子账户监控、强平风险识别，以及事件驱动的下行保护。

这个项目不是通用的 AI 交易聊天框。它的产品定位是：

- **Injective 永续合约风险驾驶舱**
- **围绕 marketId 与 subaccount 构建的测试网原生演示**
- **用于强平保护的 AI 对冲规划器**
- **面向 iAssets、RWA 敞口与二元期权式事件对冲的扩展路径**

## 产品主张

大多数加密交易演示停留在“和你的仓位聊天”。HedgeAI 希望更像一个建立在 Injective 市场之上的 **风险控制层**：

- 将真实或模拟仓位读取为 **绑定 Injective 市场的对象**
- 跟踪 **强平距离、保证金状态与永续合约敞口**
- 将风险转化为 **三条可执行的对冲路径**
- 明确区分 **演示模式、干运行模式与真实执行模式**

在黑客松或 Demo Day 场景中，最有力的表达是：

> HedgeAI 是一个 Injective 原生风险与对冲终端，可以把子账户风险转化为结构化的对冲行动手册。

## 为什么它具有 Injective 原生感

当前演示刻意围绕 Injective 的核心概念展开：

- **Injective 测试网演示市场**
- **永续合约 marketId**
- **子账户语义**
- **结合保证金的强平估算**
- **Injective 中间价与真实参考价格对比**
- **通过事件对冲和结构化保护讲述跨场景风险故事**

## 核心体验

当前产品流程如下：

1. 加载一个 **Injective 测试网演示仓位**
2. 扫描风险并展示 **高优先级强平提醒**
3. 生成 **三条对冲策略**
4. 清晰区分以下执行状态：
   - `Demo`
   - `Dry-run`
   - `Real`

这让项目特别适合：

- 黑客松演示
- 产品概念验证
- Injective 生态叙事
- 风险工具原型

## 生态路线图

路线图会继续向 Injective 深化，而不是过早分散到太多方向：

### 阶段 1：永续合约风险终端

- 支持 marketId 感知的仓位
- 支持 subaccount 感知的监控
- 提供强平风险提醒
- 完成测试网演示流程

### 阶段 2：Injective 原生对冲层

- Helix 永续合约对冲预设
- 按市场类型组织的对冲模板
- 按场所展示真实执行与干运行预览
- 结合资金费率给出对冲建议

### 阶段 3：生态化表达

- **iAssets / RWA 敞口监控**
- **二元期权 / 事件对冲模块**
- 组合级风险驾驶舱
- 跨市场叙事型对冲

## 面向评委的演示叙事

不推荐的 pitch 是：

> 我们做了一个 AI 交易助手。

更推荐的 pitch 是：

> 我们做了一个 Injective 原生风险终端，可以把永续合约强平风险转化为结构化对冲行动。

这个表述应在以下内容中保持一致：

- 首页
- 聊天欢迎语
- 演示讲稿
- 仓库文档
- 评审展示材料

## 技术栈

### 前端

- React 18
- Vite
- Zustand
- Axios
- React Markdown
- Lucide React

### 后端

- FastAPI
- Pydantic
- SSE 流式响应
- Injective Python SDK
- Hyperliquid Python SDK
- Anthropic / OpenAI 兼容模型集成

## 本地运行

### 后端

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

启动后打开：

- 前端：`http://localhost:5173`
- 后端健康检查：`http://localhost:8000/api/health`

## 演示脚本

查看 [DEMO.md](./DEMO.md) 获取适合比赛展示的精简演示流程。
