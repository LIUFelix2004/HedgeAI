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
