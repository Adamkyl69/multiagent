from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConversationMessageMetadata(BaseModel):
    quick_replies: list[str] | None = None
    suggestions: dict[str, Any] | None = None


class ConversationMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metadata: ConversationMessageMetadata | None = None
    created_at: datetime


class CollectedContext(BaseModel):
    topic: str | None = None
    decision_makers: list[str] = Field(default_factory=list)
    constraints: dict[str, str] = Field(default_factory=dict)
    goals: list[str] = Field(default_factory=list)
    agents: list[dict[str, Any]] = Field(default_factory=list)
    flow: dict[str, Any] = Field(default_factory=dict)
    stage: str = "topic"
    completeness: int = 0


class StartConversationRequest(BaseModel):
    initial_message: str = Field(min_length=1)


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1)


class ConversationResponse(BaseModel):
    session_id: str
    message: ConversationMessageResponse
    context: CollectedContext
    can_generate: bool = False


class ConversationHistoryResponse(BaseModel):
    session_id: str
    status: str
    messages: list[ConversationMessageResponse]
    context: CollectedContext
    can_generate: bool


class LLMConversationResult(BaseModel):
    extracted_info: dict[str, Any] = Field(default_factory=dict)
    next_question: str
    quick_replies: list[str] | None = None
    suggestions: dict[str, Any] | None = None
    stage_complete: bool = False
    next_stage: str | None = None
