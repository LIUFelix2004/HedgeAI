import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from models.schemas import ChatRequest
from services import model_usage_service
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
        full = ""
        try:
            async for chunk in stream_response(
                message=req.message,
                model=req.model,
                accounts=accounts_raw,
                history=history_raw,
                model_api_key=req.model_api_key,
            ):
                full += chunk
                payload = json.dumps({"text": chunk}, ensure_ascii=False)
                yield f"data: {payload}\n\n"
                await asyncio.sleep(0)
            model_usage_service.record_model_usage(req.model, "success", full)
        except Exception as e:
            model_usage_service.record_model_usage(req.model, "failure", str(e))
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
    try:
        async for chunk in stream_response(
            message=req.message,
            model=req.model,
            accounts=accounts_raw,
            history=history_raw,
            model_api_key=req.model_api_key,
        ):
            full += chunk
    except Exception as e:
        model_usage_service.record_model_usage(req.model, "failure", str(e))
        raise

    model_usage_service.record_model_usage(req.model, "success", full)

    return {"response": full}


@router.get("/model-usage")
async def model_usage():
    return {"models": model_usage_service.list_model_usage()}
