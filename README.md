# HedgeAI

HedgeAI is an **Injective-native hedge terminal** for perpetual risk management, subaccount monitoring, and event-driven downside protection.

This project is not positioned as a generic AI trading chatbox. The product story is:

- **Risk cockpit for Injective perps**
- **Testnet-native demo built around marketId and subaccount**
- **AI hedge planner for liquidation protection**
- **Expansion path toward iAssets, RWA exposure, and binary options style event hedges**

## Product Thesis

Most crypto trading demos stop at “chat with your position.” HedgeAI is designed to feel more like a **control layer on top of Injective markets**:

- It reads or simulates a position as an **Injective market-bound object**
- It tracks **liquidation distance, margin regime, and perp exposure**
- It turns that risk into **three executable hedge paths**
- It keeps a clear line between **demo**, **dry-run**, and **real execution**

For a hackathon or demo day, the strongest framing is:

> HedgeAI is an **Injective-native risk and hedge terminal** that converts subaccount risk into structured hedge playbooks.

## Why It Feels Like Injective

The current demo is intentionally centered on Injective concepts:

- **Injective Testnet demo markets**
- **Perpetual market IDs**
- **Subaccount semantics**
- **Margin-aware liquidation estimates**
- **Injective mid-price vs. real reference price**
- **Cross-venue storytelling through event hedges and structured protection**

## Core Experience

The current product flow is:

1. Load an **Injective Testnet demo position**
2. Scan risk and surface **high-priority liquidation alerts**
3. Generate **three hedge strategies**
4. Show a clean separation between:
   - `Demo`
   - `Dry-run`
   - `Real`

This makes the project strong for:

- hackathon demos
- product concept validation
- Injective ecosystem storytelling
- risk tooling prototypes

## Ecosystem Roadmap

The roadmap should keep leaning deeper into Injective rather than spreading too broadly:

### Phase 1: Perps Risk Terminal

- marketId-aware positions
- subaccount-aware monitoring
- liquidation-aware alerts
- testnet demo flow

### Phase 2: Injective-Native Hedge Layer

- Helix perp hedge presets
- hedge templates by market class
- real/dry-run previews by venue
- funding-aware hedge suggestions

### Phase 3: Ecosystem Expression

- **iAssets / RWA exposure monitoring**
- **binary options / event hedge modules**
- portfolio-level risk cockpit
- cross-market narrative hedging

## Demo Narrative for Judges

The best pitch is not:

> “We built an AI trading assistant.”

The best pitch is:

> “We built an Injective-native risk terminal that turns perp liquidation risk into structured hedge actions.”

That framing should stay consistent across:

- homepage
- chat welcome copy
- demo speech
- repository docs
- judging presentation

## Tech Stack

### Frontend

- React 18
- Vite
- Zustand
- Axios
- React Markdown
- Lucide React

### Backend

- FastAPI
- Pydantic
- SSE streaming
- Injective Python SDK
- Hyperliquid Python SDK
- Anthropic / OpenAI-compatible model integrations

## Local Run

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Then open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:8000/api/health`

## Demo Script

See [DEMO.md](./DEMO.md) for a concise competition-ready flow.
