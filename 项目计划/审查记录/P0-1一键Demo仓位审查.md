# P0-1 一键 Demo 仓位审查

## 范围

- 分支：`feat/d0-tdd-collaboration-infra`
- 阶段：P0-1 一键加载 Demo 仓位
- 日期：2026-05-29
- 监督者：
  - 初审：`019e6fda-266e-7e61-ae29-66461cbc8704`，结论 No-Go
  - 第三轮复审：`019e6fe4-caa7-7690-bec7-170ebff1d923`，结论 Go

## 交付内容

- 新增 `frontend/src/components/DemoPositionButton.jsx`。
- 新增 `connectDemoAccount()` API helper。
- store 新增 `demo` 状态与 `setDemoState()`。
- 聊天标题区展示“加载 Demo 仓位”按钮。
- 点击按钮后自动：
  - 连接 Injective demo 账户。
  - 拉取 demo 仓位。
  - 写入前端账户状态。
  - 调用风险扫描并写入 `riskAlerts`。
  - 写入聊天区系统提示。
- 后端 demo session 增加 `mode="demo"`。
- 风险 alert 增加 `liquidation_distance_pct`、`unrealized_pnl_pct`、`position` 字段。

## TDD 证据

### Red

- 前端 Red 命令：`fnm.exe exec --using v24.16.0 pnpm.cmd run test -- DemoPositionButton.test.jsx`
- 前端 Red 结果：`DemoPositionButton.test.jsx` 失败于无法解析 `./DemoPositionButton`。
- 后端 Red 命令：`backend\.venv\Scripts\python.exe -m unittest backend.tests.test_demo_account backend.tests.test_risk_demo`
- 后端 Red 结果：
  - `KeyError: 'mode'`
  - 风险 alert 缺少 `liquidation_distance_pct`。
- 监督者初审 No-Go 后补充安全 Red：
  - demo 地址即使传入 `privateKey` 也不得 `trading_enabled=true`。
  - demo 来源仓位不得触发真实 Hyperliquid 下单。

### Green

- 前端窄测试：`DemoPositionButton.test.jsx` 通过。
- 后端窄测试：`test_demo_account`、`test_risk_demo` 通过。
- 前端完整测试：4 个测试文件、6 个测试通过。
- 后端完整测试：6 个测试通过。
- 安全修复后后端完整测试：8 个测试通过。
- 前端构建：通过，1791 modules transformed。
- 后端语法检查：`accounts.py`、`risk.py` 通过。

## 静态验收

- 乱码扫描：`frontend/src backend/routers` 无命中。
- Demo 账户安全：
  - `trading_enabled=false`
  - session `mode="demo"`
  - demo session 不保存传入的私钥
  - demo 来源仓位执行真实下单时返回 `execution_mode="blocked"`
  - 无私钥持久化改动

## Browser 可视 QA

- 结果：未完成。
- 原因：Browser 插件仍因 `windows sandbox failed: spawn setup refresh` 失败。
- 需人工补验：
  - 首屏可见“加载 Demo 仓位”按钮。
  - 点击后按钮变为“Demo 已加载”。
  - INJ 状态点变为已连接。
  - 风险横幅立即出现。

## 当前判定

- 自动化验收：Go。
- Browser 工具验收：Blocked by tool。
- 监督者初审：No-Go，已按安全项修复。
- 监督者复审：No-Go，安全项通过；指出后端 touched 行在审查环境中存在乱码显示风险。
- 编码修复：
  - `backend/routers/hedge.py` 两处新增用户可见中文错误改为 ASCII 源码中的 Unicode 转义，运行时仍返回中文。
  - `backend/tests/test_demo_execution_safety.py` 的策略测试数据改为英文，避免工具误读。
  - 扩大乱码扫描到 `backend/tests`，包含 `锛|銆|涓|浠` 等片段。
- 编码修复后验证：
  - 后端完整测试：8 个测试通过。
  - 前端完整测试：4 个测试文件、6 个测试通过。
  - 前端构建：通过。
  - 扩大乱码扫描：无命中。
- 监督者最终复审：Go。
- 阶段结论：Go，允许进入 P0-2；Browser 可视 QA 待工具恢复后补验。
