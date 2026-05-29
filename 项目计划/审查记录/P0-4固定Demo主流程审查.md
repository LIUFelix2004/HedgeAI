# P0-4 固定 Demo 主流程审查

## 范围

- 分支：`feat/d0-tdd-collaboration-infra`
- 阶段：P0-4 固定 3 分钟 Demo 主流程
- 日期：2026-05-29
- 监督者：等待返回

## 交付内容

- 重写 `DEMO.md`：
  - 明确“无需模型 API Key”。
  - 明确点击“加载 Demo 仓位”作为固定入口。
  - 明确模型失败时进入“本地兜底”。
  - 明确 Demo 来源仓位执行时走安全阻断，不伪装成真实成交。
- 更新 `README.md` 推荐 Demo 流程。
- 新增 `frontend/src/lib/demoScript.test.js`，防止演示脚本回退到旧话术。
- 新增 `frontend/src/components/DemoMainFlow.test.jsx`，覆盖固定主链路：
  - 点击加载 Demo 仓位。
  - 风险横幅出现。
  - 点击生成建议。
  - 模型流式失败。
  - 渲染三张本地兜底策略卡。
- `store.addMessage()` 改为使用稳定唯一 id，避免快速连续消息造成 React duplicate key 警告。

## TDD 证据

### Red

- 前端 Red 命令：`fnm.exe exec --using v24.16.0 pnpm.cmd run test -- demoScript.test.js DemoMainFlow.test.jsx`
- Red 结果：
  - `demoScript.test.js` 失败，因为旧 `DEMO.md` 未包含“加载 Demo 仓位”“无需模型 API Key”“本地兜底”“安全阻断”，且仍包含旧的 API Key / tx_hash 话术。
  - `DemoMainFlow.test.jsx` 已证明当前代码主链路可执行，但暴露了快速连续消息 duplicate key 警告。

### Green

- 前端窄测试：9 个测试文件、14 个测试通过。
- 前端完整测试：9 个测试文件、14 个测试通过。
- 前端构建：通过，1792 modules transformed。
- 后端完整测试：8 个测试通过。
- 后端语法检查：通过。
- 扩大乱码扫描：无命中。

## 风险审查

- [x] 演示脚本不要求真实账户或私钥。
- [x] 演示脚本不要求模型 API Key。
- [x] fallback 明确标注“本地兜底”。
- [x] Demo 来源仓位不会被讲成真实成交。
- [x] Polymarket / Options 仍按参考或 dry-run 语义讲解。
- [x] React 消息 key 重复风险已修复。

## Browser 可视 QA

- 结果：未完成。
- 原因：Browser 插件仍因 `windows sandbox failed: spawn setup refresh` 失败。
- 需人工补验：
  - 打开页面后能看到“加载 Demo 仓位”。
  - 点击后风险横幅出现。
  - 不填模型 API Key，点击“生成建议”后出现三张“本地兜底”卡。
  - 展开卡片时无乱码、无重叠、无真实成交误导。

## 当前判定

- 自动化验收：Go。
- Browser 工具验收：Blocked by tool。
- 监督者初审：No-Go，指出欢迎语和 AI 解析总结仍残留“必须 Key / 真实仓位”叙事。
- No-Go 修复：
  - `COPY.welcome` 改为优先引导“加载 Demo 仓位”，模型 API Key 仅作为增强路径。
  - `chat.js` 解析策略总结从“真实仓位”改为“当前仓位”。
  - 新增回归断言，防止欢迎语和解析总结回退到旧文案。
- No-Go 修复后验证：
  - 前端完整测试：9 个测试文件、16 个测试通过。
  - 前端构建：通过。
  - 后端完整测试：8 个测试通过。
  - 旧话术扫描：应用源码、`DEMO.md`、`README.md` 无命中。
- 监督者复审：Go。
- 消息 ID 调整说明：`DemoMainFlow.test.jsx` 暴露快速连续消息可能出现 React duplicate key 警告，因此本阶段纳入 `store.addMessage()` 的稳定唯一 id 调整。
- 阶段结论：Go，允许进入 P1-1；Browser 可视 QA 待工具恢复后补验。
