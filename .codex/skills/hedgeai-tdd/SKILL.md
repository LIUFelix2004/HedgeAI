---
name: hedgeai-tdd
description: Use for HedgeAI project work that needs TDD, branch hygiene, frontend/backend test scaffolding, demo validation, Browser visual QA, supervisor review, or safe handling of demo/dry-run/real trading execution modes.
---

# HedgeAI TDD

Use this skill when changing the HedgeAI repo, especially for the six visual demo tasks, execution safety, fallback strategy cards, anime.js UI motion, or any task that should follow Red -> Green -> Refactor -> Review.

## Project Commands

Run commands from `C:\Users\Theo\Documents\HedgeFundAI\HedgeAI` unless a task says otherwise.

- Frontend dev server: use fnm, then `pnpm.cmd run dev`.
- Frontend build: use fnm, then `pnpm.cmd run build`.
- Frontend tests: use fnm, then `pnpm.cmd run test`.
- Backend server: `backend\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000` from `backend`.
- Backend tests: `backend\.venv\Scripts\python.exe -m pytest`.

PowerShell notes:

- Use `pnpm.cmd`, not `pnpm`, because `.ps1` shims may be blocked.
- `fnm` is at `C:\Users\Theo\AppData\Local\fnm\fnm.exe`.
- If `pytest` fails because of a plugin environment issue, record the exact failure and run targeted import or API checks as fallback.

## TDD Workflow

1. Create or confirm the feature branch before editing.
2. Write a focused failing test first.
3. Run the narrow test and capture the failure reason.
4. Implement the smallest code change that passes the test.
5. Run the narrow test again.
6. Refactor only after the behavior is protected.
7. Run the relevant build/test command.
8. Use Browser visual QA for user-visible frontend changes.
9. Fill the supervisor review template before considering the task complete.

## Supervisor Gate

Before finalizing a task, check:

- Demo, dry-run, and real modes are distinct in UI and API payloads.
- Real execution is blocked on the backend without confirmation and credentials.
- Dry-run never says a trade was submitted.
- Local fallback strategies are labeled as fallback, not AI output.
- External APIs are mocked in tests.
- No visible mojibake remains in touched UI.
- anime.js motion improves state feedback and does not block interaction.
- The final response names tests run and any unresolved blockers.

## Multi-Agent Pattern

Only spawn agents when the user explicitly authorizes team/sub-agent work.

- Supervisor: review tests, safety boundaries, and UX copy.
- Explorer: answer one narrow codebase question.
- Worker: implement one bounded patch with a disjoint write set.

Workers must be told that others may edit the repo and that they must not revert unrelated changes.

## Visual QA

For frontend changes:

- Open `http://127.0.0.1:5173/` in Browser when the dev server is running.
- Verify the main user path, not only static rendering.
- Check desktop and mobile widths when layout or text changes.
- Confirm buttons, cards, labels, modals, progress states, and error states do not overlap.

## Reference

Use `references/review-checklist.md` for the review checklist and fill `项目计划/监督者审查模板.md` in the repo when a task is ready for supervisor review.
