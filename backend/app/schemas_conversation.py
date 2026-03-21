from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConversationMessageMetadata(BaseModel):
    quick_replies: list[str] | None = None
    suggestions: dict[str, Any] | None = None
    decision_frame: dict[str, Any] | None = None
    show_frame_confirmation: bool = False


class ConversationMessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metadata: ConversationMessageMetadata | None = None
    created_at: datetime


class DecisionClassification(BaseModel):
    """Automatic classification of the decision type"""
    decision_type: str = ""  # strategic, emotional, financial, creative, operational, ethical
    stakes: str = ""  # low, medium, high, critical
    decision_mode: str = ""  # comparison, prediction, prioritization, go_no_go
    complexity: str = ""  # simple, moderate, complex
    recommended_framework: str = ""  # pros_cons, swot, decision_matrix, risk_analysis


class DecisionFrame(BaseModel):
    """Clean framing of the decision before debate"""
    decision_statement: str = ""  # Clear statement of what's being decided
    alternatives: list[str] = Field(default_factory=list)  # Options being considered
    primary_objective: str = ""  # What success looks like
    constraints: list[str] = Field(default_factory=list)  # Limitations and requirements
    evaluation_criteria: list[str] = Field(default_factory=list)  # How to judge options
    timeline: str = ""  # When decision needs to be made


class CollectedContext(BaseModel):
    # Stage 1: Entry
    raw_question: str = ""  # Original user question
    additional_context: str = ""  # Optional context user provided
    
    # Stage 2: Classification (automatic)
    classification: DecisionClassification = Field(default_factory=DecisionClassification)
    
    # Stage 3: Clarifying questions answered
    clarifications: dict[str, str] = Field(default_factory=dict)
    pending_questions: list[str] = Field(default_factory=list)
    questions_asked: int = 0
    
    # Stage 4: Decision frame
    decision_frame: DecisionFrame = Field(default_factory=DecisionFrame)
    frame_confirmed: bool = False
    
    # Stage 5: Agents
    agents: list[dict[str, Any]] = Field(default_factory=list)
    
    # Flow control
    stage: str = "entry"  # entry, classification, clarification, frame, agents, ready
    completeness: int = 0


class StartConversationRequest(BaseModel):
    initial_message: str = Field(min_length=1)
    context: str | None = None  # Optional additional context


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
    decision_frame: dict[str, Any] | None = None
