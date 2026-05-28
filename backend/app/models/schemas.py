from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Denomination(str, Enum):
    general = "general"
    protestant = "protestant"
    catholic = "catholic"
    orthodox = "orthodox"


class Citation(BaseModel):
    reference: str
    text: str
    source: str = "Bible"
    confidence: float = Field(ge=0, le=1)
    verified: bool = True


class SafetyDecision(BaseModel):
    allowed: bool
    category: str = "safe"
    reason: str = ""
    redirect: str | None = None


class KeyPassage(BaseModel):
    reference: str
    text: str
    translation: str = "WEB"
    source: str = "Bible"
    confidence: float = Field(ge=0, le=1)
    verified: bool = False


class SourceExcerpt(BaseModel):
    title: str
    text: str
    source: str
    page: int | None = None
    confidence: float = Field(ge=0, le=1)


class GroundingStatus(BaseModel):
    scripture_verified: bool
    citation_matched: bool
    retrieval_confidence: float = Field(ge=0, le=1)
    safety_checked: bool = True
    tradition_note: str | None = None


class StructuredAnswer(BaseModel):
    summary: str
    key_passages: list[KeyPassage] = []
    sources: list[SourceExcerpt] = []
    grounding: GroundingStatus


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=4000)
    denomination: Denomination = Denomination.general


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    structured: StructuredAnswer | None = None
    citations: list[Citation] = []
    safety: SafetyDecision
    retrieval_confidence: float
    denomination_note: str | None = None
    memory_summary: str | None = None


class ImageRequest(BaseModel):
    session_id: str
    prompt: str = Field(min_length=1, max_length=1200)
    style: str = "peaceful, reverent, non-photorealistic biblical illustration"


class ImageResponse(BaseModel):
    image_url: str | None = None
    revised_prompt: str
    safety: SafetyDecision
    notes: list[str] = []


class SessionSummary(BaseModel):
    session_id: str
    denomination: Denomination = Denomination.general
    summary: str = ""
    topics: list[str] = []
    messages: list[dict[str, Any]] = []
