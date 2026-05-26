import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from services.ai_service import stream_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(req: ChatRequest):
    """
    SSE streaming endpoint.
    Sends: data: {"text": "..."}\n\n
    Ends with: data: [DONE]\n\n
    """
    accounts_raw = [a.model_dump() for a in req.accounts]
    history_raw = [h.model_dump() for h in req.history]

    async def event_generator():
        try:
            async for chunk in stream_response(
                message=req.message,
                model=req.model,
                accounts=accounts_raw,
                history=history_raw,
                model_api_key=req.model_api_key,
            ):
                payload = json.dumps({"text": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0)
        except Exception as e:
            err = json.dumps({"text": f"\n\nAI 错误: {str(e)}"}, ensure_ascii=False)
            yield f"data: {err}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/message")
async def chat_message(req: ChatRequest):
    """Non-streaming fallback: collect full response then return."""
    accounts_raw = [a.model_dump() for a in req.accounts]
    history_raw = [h.model_dump() for h in req.history]

    full = ""
    async for chunk in stream_response(
        message=req.message,
        model=req.model,
        accounts=accounts_raw,
        history=history_raw,
        model_api_key=req.model_api_key,
    ):
        full += chunk

    return {"response": full}
