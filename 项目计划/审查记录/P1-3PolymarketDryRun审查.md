# P1-3 Polymarket Dry-run 审查

## 范围

- 分支：`feat/d0-tdd-collaboration-infra`
- 阶段：P1-3 Polymarket market snapshot / dry-run
- 日期：2026-05-29
- 监督者：Lovelace（只读审查）

## 交付内容

- `StrategyMarketLink` 增加 `outcome`、`price`、`probability`、`updated_at`、`token_id`。
- `HedgeStrategy` 增加 `market_snapshot`。
- `ExecuteResult` 增加 `order_preview`。
- Polymarket public search 解析 `clobTokenIds` / `tokenIds`、价格、概率和更新时间。
- `/api/hedge/enrich-strategies` 为 Polymarket 策略写入 `market_snapshot`。
- Polymarket dry-run 返回结构化订单预览，不调用 `place_order`。
- Polymarket real 模式继续阻断，避免 `demo-token` 或 mock 下单被误认为实盘成功。
- 前端新增 `MarketSnapshot`。
- `HedgeCard` 为 Polymarket 策略展示市场快照，并在执行完成后展示订单预览。

## TDD 证据

### Red

- 后端 Red：`backend\.venv\Scripts\python.exe -m unittest backend.tests.test_polymarket_enrichment backend.tests.test_polymarket_execute`
- Red 结果：缺少 `market_snapshot` 与 `order_preview`。
- 前端 Red：`fnm.exe exec --using v24.16.0 pnpm.cmd run test -- MarketSnapshot.test.jsx HedgeCard.polymarket.test.jsx`
- Red 结果：缺少 `MarketSnapshot`，`HedgeCard` 未展示 Polymarket 市场快照与订单预览。

### Green

- 后端窄测：`backend\.venv\Scripts\python.exe -m unittest backend.tests.test_polymarket_enrichment backend.tests.test_polymarket_execute`，3 tests 通过。
- 后端完整测试：`backend\.venv\Scripts\python.exe -m unittest discover backend\tests`，19 tests 通过。
- 后端语法检查：`backend\.venv\Scripts\python.exe -m py_compile backend\models\schemas.py backend\routers\hedge.py backend\services\polymarket_service.py` 通过。
- 前端完整测试：`fnm.exe exec --using v24.16.0 pnpm.cmd run test`，15 files / 28 tests 通过。
- 前端构建：`fnm.exe exec --using v24.16.0 pnpm.cmd run build` 通过，1796 modules transformed。
- 乱码扫描：`frontend/src backend/routers backend/tests backend/models backend/services` 无命中。

## 安全审查

- [x] dry-run 返回订单预览，不调用真实下单服务。
- [x] real 模式仍被后端阻断。
- [x] `demo-token` 不再有成功实盘路径。
- [x] 非 demo token 的 Polymarket real confirmed 也继续阻断。
- [x] 没有 `market_snapshot` 但有 `market_links` 时，dry-run 可降级生成订单预览。
- [x] 缺少真实凭证时不会展示真实下单成功。
- [x] 下单服务在测试中被 mock，并断言未调用。

## UX 审查

- [x] Polymarket 卡片展示市场问题、结果、价格、概率。
- [x] 无市场快照时显示“实时市场暂不可用”。
- [x] dry-run 执行后展示 side、token、price、size。
- [x] 订单预览文案与真实提交语义区分。

## Browser 可视 QA

- 结果：未完成。
- 原因：`node_repl` / Browser 自动化仍失败，错误为 `windows sandbox failed: spawn setup refresh`。
- 需要人工补验：
  - Polymarket 卡片市场快照在桌面和窄屏不溢出。
  - 订单预览 token 较长时能换行。
  - 市场不可用状态不与按钮重叠。

## 当前判定

- 自动化验收：Go。
- Browser 工具验收：Blocked by tool。
- 监督者审查：Go。
- 监督者发现项与处理：
  - P2：real 阻断测试只覆盖 `demo-token`。已补非 demo token 的 real confirmed 阻断测试。
  - P3：`market_snapshot` / `order_preview` 暂为 dict，后续可抽为强类型模型。
  - P3：极长市场问题在移动端仍需 Browser/人工补验。
  - 建议补测：`market_links` fallback。已补 dry-run 降级测试。
- 阶段结论：Go；Browser 可视 QA 待工具恢复或人工补验。
