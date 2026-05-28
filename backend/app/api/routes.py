import asyncio
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.image_generation.service import ImageGenerationService
from app.memory.store import MemoryStore
from app.models.schemas import ChatRequest, ChatResponse, ImageRequest, ImageResponse, SessionSummary
from app.services.chat_orchestrator import ChatOrchestrator

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    try:
        return await ChatOrchestrator().answer(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate grounded response") from exc


@router.post("/chat/stream")
async def chat_stream(payload: ChatRequest) -> StreamingResponse:
    async def event_stream():
        try:
            response = await ChatOrchestrator().answer(payload)
            structured = response.structured
            if structured is None:
                yield _sse("summary_delta", {"delta": response.answer})
                yield _sse("done", response.model_dump())
                return

            words = structured.summary.split(" ")
            for index, word in enumerate(words):
                suffix = "" if index == len(words) - 1 else " "
                yield _sse("summary_delta", {"delta": word + suffix})
                await asyncio.sleep(0.035)

            yield _sse("summary_done", {"summary": structured.summary})
            await asyncio.sleep(0.18)
            yield _sse("passages", {"key_passages": [passage.model_dump() for passage in structured.key_passages]})
            await asyncio.sleep(0.16)
            yield _sse("sources", {"sources": [source.model_dump() for source in structured.sources]})
            await asyncio.sleep(0.16)
            yield _sse("grounding", {"grounding": structured.grounding.model_dump()})
            yield _sse("done", response.model_dump())
        except Exception as exc:
            yield _sse("error", {"message": "Unable to generate grounded response"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/images", response_model=ImageResponse)
async def generate_image(payload: ImageRequest) -> ImageResponse:
    try:
        return await ImageGenerationService().generate(payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate image") from exc


@router.get("/sessions/{session_id}", response_model=SessionSummary)
async def get_session(session_id: str) -> SessionSummary:
    return await MemoryStore.current().get_session(session_id)


@router.get("/sessions", response_model=list[SessionSummary])
async def sessions() -> list[SessionSummary]:
    return await MemoryStore.current().list_sessions()
