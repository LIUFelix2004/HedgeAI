# HedgeAI Review Checklist

## Required Evidence

- Branch name:
- Task ID:
- Red test command and failure:
- Green test command and pass:
- Build command and result:
- Browser visual QA result:

## Safety Checks

- Demo mode cannot be confused with real execution.
- Dry-run uses realistic inputs but does not submit orders.
- Real mode requires backend confirmation and credentials.
- Polymarket real execution never uses a fixed demo token.
- Options recommendations do not imply automatic option purchase unless truly implemented.

## UX Checks

- No mojibake in changed screens.
- Error copy gives a next action.
- Motion does not obscure content or block clicks.
- Strategy cards remain readable on small screens.
