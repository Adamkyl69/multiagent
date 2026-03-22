from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AuthContext(BaseModel):
    auth_subject: str
    email: str | None = None
    display_name: str | None = None


class ClarificationQuestionItem(BaseModel):
    key: str
    question: str
    rationale: str


class PromptIntakeRequest(BaseModel):
    prompt: str = Field(min_length=1)
    clarification_answers: dict[str, str] = Field(default_factory=dict)


class PromptIntakeAssessment(BaseModel):
    status: str
    domain: str
    prompt_quality_score: int
    is_high_risk: bool
    clarification_questions: list[ClarificationQuestionItem] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


class AgentCapabilities(BaseModel):
    ask: bool = True
    challenge: bool = True
    cite: bool = True
    score: bool = True
    recommend: bool = False


class AgentDraft(BaseModel):
    name: str
    role: str
    purpose: str
    instructions: str
    tone: str
    tools: list[str] = Field(default_factory=list)
    capabilities: AgentCapabilities
    model_provider: str = "gemini"
    model_name: str = "gemini-1.5-flash"


class FlowStepDraft(BaseModel):
    name: str
    description: str
    rules: list[str] | dict[str, Any] = Field(default_factory=list)


class ProjectGenerationRequest(BaseModel):
    prompt: str = Field(min_length=1)
    clarification_answers: dict[str, str] = Field(default_factory=dict)
    force_generate_with_assumptions: bool = False


class ProjectVersionSnapshot(BaseModel):
    title: str
    objective: str
    prompt: str
    domain: str
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    agents: list[AgentDraft] = Field(default_factory=list)
    flow: list[FlowStepDraft] = Field(default_factory=list)


class ProjectResponse(BaseModel):
    project_id: str
    workspace_id: str
    title: str
    objective: str
    prompt: str
    intake_status: str
    prompt_quality_score: int
    generated_with_assumptions: bool
    status: str
    latest_version_id: str
    latest_version_number: int
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    agents: list[AgentDraft] = Field(default_factory=list)
    flow: list[FlowStepDraft] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ProjectUpdateRequest(BaseModel):
    title: str | None = None
    objective: str | None = None
    status: str | None = None
    agents: list[AgentDraft] | None = None
    flow: list[FlowStepDraft] | None = None


class ProjectVersionResponse(BaseModel):
    project_id: str
    version_id: str
    version_number: int
    created_at: datetime


class LaunchRunRequest(BaseModel):
    project_id: str
    project_version_id: str | None = None


class RunResponse(BaseModel):
    run_id: str
    project_id: str
    project_version_id: str
    status: str
    estimated_cost_cents: int
    actual_cost_cents: int
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None


class TranscriptMessageResponse(BaseModel):
    id: str
    phase_name: str
    speaker_name: str
    message_type: str
    content: str
    sequence: int
    created_at: datetime


class RunEventResponse(BaseModel):
    id: str
    event_type: str
    payload: dict[str, Any]
    sequence: int
    created_at: datetime


class FinalOutputResponse(BaseModel):
    run_id: str
    summary: str
    verdict: str
    recommendations: list[str] = Field(default_factory=list)
    raw_output: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class UsageEventResponse(BaseModel):
    id: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_estimate_cents: int
    status: str
    occurred_at: datetime
    project_id: str | None = None
    run_id: str | None = None


class UsageOverviewResponse(BaseModel):
    workspace_id: str
    subscription_status: str
    plan_code: str
    included_tokens: int
    used_tokens: int
    remaining_tokens: int
    included_cost_cents: int
    used_cost_cents: int
    remaining_cost_cents: int
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None


class PlanResponse(BaseModel):
    workspace_id: str
    plan_code: str
    subscription_status: str
    stripe_customer_id: str | None = None
    stripe_subscription_id: str | None = None
    period_start: datetime | None = None
    period_end: datetime | None = None


class CheckoutSessionRequest(BaseModel):
    price_id: str | None = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str


class AuthMeResponse(BaseModel):
    user_id: str
    auth_subject: str
    email: str | None = None
    workspace_id: str
    workspace_name: str
    plan_code: str
    subscription_status: str


# --- Expert Templates ---

VALID_DECISION_DOMAINS = [
    "pricing", "hiring", "product", "market_expansion", "health",
    "investment", "operations", "strategy", "technology", "legal",
    "marketing", "partnerships", "organizational", "personal",
]


class SaveAgentAsTemplateRequest(BaseModel):
    agent_index: int = Field(ge=0, description="Index of the agent in the run's agent list")
    decision_domains: list[str] = Field(min_length=1, max_length=3, description="1-3 decision domains")
    performance_note: str = Field(min_length=10, max_length=500, description="Why this agent was valuable")


class CreateExpertAgentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    purpose: str = Field(min_length=10, max_length=2000)
    instructions: str = Field(min_length=20, max_length=5000)
    tone: str = Field(default="balanced")
    model_provider: str = Field(default="gemini")
    model_name: str = Field(default="gemini-1.5-flash")
    decision_domains: list[str] = Field(min_length=1, max_length=3, description="1-3 decision domains")
    performance_note: str | None = Field(default=None, max_length=500)


class UpdateExpertTemplateRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    purpose: str | None = None
    instructions: str | None = None
    tone: str | None = None
    model_provider: str | None = None
    model_name: str | None = None
    decision_domains: list[str] | None = None
    performance_note: str | None = None


class RateTemplateRequest(BaseModel):
    was_helpful: bool
    feedback_note: str | None = Field(default=None, max_length=500)


class ExpertTemplateResponse(BaseModel):
    id: str
    workspace_id: str
    created_from_run_id: str | None
    name: str
    role: str
    purpose: str
    instructions: str
    tone: str
    model_provider: str
    model_name: str
    decision_domains: list[str] = Field(default_factory=list)
    performance_note: str | None = None
    times_used: int = 0
    helpful_count: int = 0
    total_ratings: int = 0
    helpful_rate: float = 0.0  # computed: helpful_count / max(total_ratings, 1)
    created_at: datetime
    updated_at: datetime


class ExpertTemplateListResponse(BaseModel):
    templates: list[ExpertTemplateResponse] = Field(default_factory=list)
    count: int = 0
    limit: int = 15
