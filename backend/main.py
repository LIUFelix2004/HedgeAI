"""
HedgeAI Backend - FastAPI
Run: uvicorn main:app --reload --port 8000
"""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import accounts, chat, hedge, risk

load_dotenv()

logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("HedgeAI backend starting up")
    logger.info(f"  Injective network : {os.getenv('INJECTIVE_NETWORK', 'testnet')}")
    logger.info(f"  Anthropic key set : {'yes' if os.getenv('ANTHROPIC_API_KEY') else 'NO - set in .env'}")
    yield
    logger.info("HedgeAI backend shutting down")


app = FastAPI(
    title="HedgeAI API",
    description="AI-powered hedge advisor for crypto traders",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(accounts.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(hedge.router, prefix="/api")
app.include_router(risk.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "injective_network": os.getenv("INJECTIVE_NETWORK", "testnet"),
        "anthropic_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
    }


@app.get("/api/dashboard")
async def dashboard():
    from routers.accounts import _sessions, SUPPORT_MATRIX
    from services import audit_service, strategy_history_service, model_usage_service

    connected_platforms = [
        p for p, s in _sessions.items() if s.get("connected")
    ]
    total_positions = sum(
        len(s.get("positions") or [])
        for s in _sessions.values()
        if s.get("connected")
    )
    recent_executions = strategy_history_service.list_strategy_history(limit=10)
    success_count = sum(1 for e in recent_executions if e.get("status") == "success")

    all_positions = []
    for platform, session in _sessions.items():
        if not session.get("connected"):
            continue
        for pos in session.get("positions") or []:
            all_positions.append({**pos, "platform": platform})

    return {
        "connected_platforms": connected_platforms,
        "connected_count": len(connected_platforms),
        "total_positions": total_positions,
        "supported_platforms": list(SUPPORT_MATRIX.keys()),
        "positions": all_positions,
        "recent_executions": recent_executions,
        "recent_executions_count": len(recent_executions),
        "recent_success_rate": round(success_count / max(len(recent_executions), 1) * 100, 1),
        "audit_events_total": len(audit_service.list_audit_events(limit=9999)),
        "model_usage": model_usage_service.list_model_usage(),
    }
