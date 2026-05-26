"""
AI service: multi-model chat with streaming + hedge analysis.
Supported models: claude, gpt4o, deepseek, grok
"""
import json
import logging
import os
from typing import AsyncGenerator, Optional

import anthropic

logger = logging.getLogger(__name__)

MODEL_CONFIGS = {
    "claude": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-20250514",
        "env": "ANTHROPIC_API_KEY",
    },
    "gpt4o": {
        "provider": "openai_compatible",
        "model": "gpt-4o",
        "url": "https://api.openai.com/v1/chat/completions",
        "env": "OPENAI_API_KEY",
    },
    "deepseek": {
        "provider": "openai_compatible",
        "model": "deepseek-chat",
        "url": "https://api.deepseek.com/v1/chat/completions",
        "env": "DEEPSEEK_API_KEY",
    },
    "grok": {
        "provider": "openai_compatible",
        "model": "grok-4.3",
        "url": "https://api.x.ai/v1/chat/completions",
        "env": "GROK_API_KEY",
    },
}

SYSTEM_PROMPT = """You are HedgeAI, an expert crypto risk manager and AI hedge advisor.

Your job:
1. Analyze user's futures/perpetual positions
2. Identify risks such as liquidation distance, over-leverage, concentration, and downside exposure
3. Recommend concrete hedging strategies using:
   - Reverse contracts
   - Polymarket prediction markets
   - Injective on-chain options
4. Explain everything in plain Chinese for non-expert traders

When you have enough position info to generate strategies, output this EXACT block at the END of your response:
```json:strategies
{
  "risk_level": "HIGH|MEDIUM|LOW",
  "risk_summary": "一句中文总结",
  "liquidation_distance_pct": 4.2,
  "urgency": "IMMEDIATE|MONITOR|SAFE",
  "strategies": [
    {
      "id": "A",
      "type": "REVERSE_HEDGE",
      "title": "反向合约对冲",
      "description": "说明具体方向、比例和执行思路",
      "hedge_ratio": "40%",
      "estimated_cost": "低",
      "complexity": "低",
      "pros": "优点",
      "cons": "缺点",
      "injective_action": "MsgCreateDerivativeMarketOrder on BTC-USDT-PERP"
    },
    {
      "id": "B",
      "type": "POLYMARKET",
      "title": "Polymarket 事件对冲",
      "description": "说明如何用事件市场对冲方向风险",
      "hedge_ratio": "15%",
      "estimated_cost": "中",
      "complexity": "低",
      "pros": "优点",
      "cons": "缺点",
      "injective_action": "N/A"
    },
    {
      "id": "C",
      "type": "OPTIONS",
      "title": "Injective 链上期权保护",
      "description": "说明行权价、期限和保护范围",
      "hedge_ratio": "100%",
      "estimated_cost": "高",
      "complexity": "中",
      "pros": "优点",
      "cons": "缺点",
      "injective_action": "Buy BTC-PUT-82000-7D via Injective options module"
    }
  ]
}
```

Requirements:
- Always respond in Chinese
- Be concise but precise with numbers
- If the user did not provide position information, answer educationally without the strategies block
- If position risk is high, prioritize survival and liquidation protection over profit maximization
"""


def _build_context(accounts: list, history: list) -> str:
    parts = []
    for acc in accounts:
        if acc.get("connected"):
            platform = acc.get("platform", "")
            positions = acc.get("positions", [])
            if positions:
                parts.append(f"\n[{platform.upper()} 账户仓位]")
                for p in positions:
                    parts.append(
                        f"  {p.get('symbol')} {p.get('direction')} "
                        f"{p.get('leverage', 1)}x | "
                        f"开仓: ${p.get('entry_price', 0):,.0f} | "
                        f"当前: ${p.get('current_price', 0):,.0f} | "
                        f"浮盈亏: {p.get('unrealized_pnl_pct')}% | "
                        f"距强平: {p.get('liquidation_distance_pct')}%"
                    )
    return "\n".join(parts) if parts else ""


def _resolve_api_key(model: str, model_api_key: Optional[str]) -> str:
    provided = (model_api_key or "").strip()
    if provided:
        return provided

    cfg = MODEL_CONFIGS.get(model)
    if not cfg:
        return ""
    return os.getenv(cfg["env"], "").strip()


async def stream_claude(
    message: str,
    accounts: list,
    history: list,
    api_key: str,
) -> AsyncGenerator[str, None]:
    if not api_key:
        raise ValueError("Claude API Key 未配置")

    client = anthropic.AsyncAnthropic(api_key=api_key)
    context = _build_context(accounts, history)
    user_content = f"{context}\n\n用户问题: {message}" if context else message

    messages = []
    for h in history[-8:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_content})

    async with client.messages.stream(
        model=MODEL_CONFIGS["claude"]["model"],
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def stream_openai_compatible(
    message: str,
    model_key: str,
    accounts: list,
    history: list,
    api_key: str,
) -> AsyncGenerator[str, None]:
    import httpx

    if not api_key:
        raise ValueError(f"{model_key} API Key 未配置")

    cfg = MODEL_CONFIGS[model_key]
    context = _build_context(accounts, history)
    user_content = f"{context}\n\n用户问题: {message}" if context else message

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-8:]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_content})

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST",
                cfg["url"],
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": cfg["model"], "messages": messages, "stream": True, "max_tokens": 1500},
            ) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    detail = body.decode("utf-8", errors="ignore")
                    logger.error("%s API error %s: %s", model_key, resp.status_code, detail)
                    raise ValueError(f"{model_key} 接口报错 {resp.status_code}: {detail[:300]}")

                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            pass
    except httpx.ConnectError as e:
        logger.error("%s connection error: %s", model_key, repr(e))
        raise ValueError(f"{model_key} 连接失败：后端当前无法连接到 {cfg['url']}")


async def stream_response(
    message: str,
    model: str,
    accounts: list,
    history: list,
    model_api_key: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    selected_model = model if model in MODEL_CONFIGS else "claude"
    api_key = _resolve_api_key(selected_model, model_api_key)

    if selected_model == "claude":
        async for chunk in stream_claude(message, accounts, history, api_key):
            yield chunk
        return

    async for chunk in stream_openai_compatible(message, selected_model, accounts, history, api_key):
        yield chunk
