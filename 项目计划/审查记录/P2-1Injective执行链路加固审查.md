# Supervisor Review: P2-1 Injective 执行链路加固

## Scope

- Branch: `feat/d0-tdd-collaboration-infra`
- Task: P2-1 Injective 执行链路加固
- Reviewer: Lovelace
- Date: 2026-05-29

## TDD Evidence

- Red test command: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_injective_execution_hardening`
- Red failure summary:
  - REVERSE_HEDGE dry-run 没有返回 Injective `order_preview`。
  - `injective_service.validate_order_params` 不存在。
  - real 执行返回丢失 `raw_response`。
  - DOGE 未知市场被错误地按 BTC 来源查找，错误原因不指向 unsupported market。
- Green test command: `backend\.venv\Scripts\python.exe -m unittest backend.tests.test_injective_execution_hardening`
- Green pass summary: 4 tests passed，覆盖 dry-run 订单预览、未知市场阻断、raw_response 透传和 Injective 参数校验。
- Red test command: `fnm exec --using v24.16.0 pnpm.cmd run test -- HedgeCard.execute.test.jsx`
- Red failure summary: 前端订单预览仍按 Polymarket token 展示，找不到 Injective market_id、quantity、notional、leverage。
- Green test command: `fnm exec --using v24.16.0 pnpm.cmd run test -- HedgeCard.execute.test.jsx`
- Green pass summary: 16 files / 30 tests passed，Injective dry-run 参数可见。
- Refactor notes: 将 Injective 市场白名单和参数校验放入 `injective_service`；`hedge` 路由复用 service 构造 order preview；前端 `OrderPreview` 从 Polymarket token 专用扩展为通用订单参数视图。

## Safety Review

- [x] Demo, dry-run, and real modes are visually and behaviorally distinct.
- [x] Real execution is blocked on the backend when confirmation or credentials are missing.
- [x] Unknown Injective markets are blocked before service calls.
- [x] Dry-run output cannot be mistaken for a submitted trade.
- [x] Dry-run returns order parameters without calling real execution services.
- [x] No UI copy claims unsupported live execution.

## UX Review

- [x] No visible mojibake or broken copy in touched UI strings.
- [x] Injective order preview displays market, asset, side, quantity, notional, and leverage.
- [x] Existing Polymarket order preview remains covered.
- [x] Browser visual QA is blocked by tool error: `windows sandbox failed: spawn setup refresh`.

## Test Review

- [x] Frontend tests cover user-visible preview behavior.
- [x] Backend tests cover API contracts and execution safety boundaries.
- [x] External APIs are mocked in tests.
- [x] Build passes.

## Verification

- `backend\.venv\Scripts\python.exe -m unittest discover backend\tests`: 32 tests passed.
- `fnm exec --using v24.16.0 pnpm.cmd run test`: 16 files / 30 tests passed.
- `fnm exec --using v24.16.0 pnpm.cmd run build`: passed.
- Mojibake scan over source paths: no matches.

## Decision

- Status: Go
- Required fixes: None.
- Follow-up risks:
  - 真实链上执行仍缺少 tick size / quantity step 精度归一。
  - 余额、保证金和手续费预校验尚未接入。
  - raw response 已透传，但持久化审计日志留给 P2-4。
