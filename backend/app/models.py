from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    auth_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class WorkspaceMembership(Base):
    __tablename__ = "workspace_memberships"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_workspace_membership"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(50), default="owner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), unique=True, index=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plan_code: Mapped[str] = mapped_column(String(50), default="trial")
    status: Mapped[str] = mapped_column(String(50), default="trialing")
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class UsageBalance(Base):
    __tablename__ = "usage_balances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), unique=True, index=True)
    billing_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    billing_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    included_tokens: Mapped[int] = mapped_column(Integer, default=10000000)  # 10M tokens for dev
    used_tokens: Mapped[int] = mapped_column(Integer, default=0)
    included_cost_cents: Mapped[int] = mapped_column(Integer, default=500000)  # $5000 for dev
    used_cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    objective: Mapped[str] = mapped_column(Text)
    prompt: Mapped[str] = mapped_column(Text)
    intake_status: Mapped[str] = mapped_column(String(50), default="ready_to_generate")
    prompt_quality_score: Mapped[int] = mapped_column(Integer, default=0)
    generated_with_assumptions: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ClarificationSession(Base):
    __tablename__ = "clarification_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    prompt: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ClarificationQuestion(Base):
    __tablename__ = "clarification_questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("clarification_sessions.id"), index=True)
    question_key: Mapped[str] = mapped_column(String(100))
    question_text: Mapped[str] = mapped_column(Text)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0)


class ProjectVersion(Base):
    __tablename__ = "project_versions"
    __table_args__ = (UniqueConstraint("project_id", "version_number", name="uq_project_version"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    snapshot_json: Mapped[dict] = mapped_column(JSON)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AgentConfiguration(Base):
    __tablename__ = "agent_configurations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_version_id: Mapped[str] = mapped_column(ForeignKey("project_versions.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    role_title: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(Text)
    instructions: Mapped[str] = mapped_column(Text)
    tone: Mapped[str] = mapped_column(String(100), default="balanced")
    tools_json: Mapped[list] = mapped_column(JSON, default=list)
    capabilities_json: Mapped[dict] = mapped_column(JSON, default=dict)
    model_provider: Mapped[str] = mapped_column(String(50), default="gemini")
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-1.5-flash")
    position: Mapped[int] = mapped_column(Integer, default=0)


class FlowConfiguration(Base):
    __tablename__ = "flow_configurations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    project_version_id: Mapped[str] = mapped_column(ForeignKey("project_versions.id"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    rules_json: Mapped[dict] = mapped_column(JSON, default=dict)
    position: Mapped[int] = mapped_column(Integer, default=0)


class DebateRun(Base):
    __tablename__ = "debate_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), index=True)
    project_version_id: Mapped[str] = mapped_column(ForeignKey("project_versions.id"), index=True)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(50), default="queued")
    estimated_cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    actual_cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class DebateMessage(Base):
    __tablename__ = "debate_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("debate_runs.id"), index=True)
    phase_name: Mapped[str] = mapped_column(String(255))
    speaker_name: Mapped[str] = mapped_column(String(255))
    agent_configuration_id: Mapped[str | None] = mapped_column(ForeignKey("agent_configurations.id"), nullable=True, index=True)
    message_type: Mapped[str] = mapped_column(String(50), default="statement")
    content: Mapped[str] = mapped_column(Text)
    sequence: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RunEvent(Base):
    __tablename__ = "run_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("debate_runs.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    payload_json: Mapped[dict] = mapped_column(JSON)
    sequence: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class FinalOutput(Base):
    __tablename__ = "final_outputs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    run_id: Mapped[str] = mapped_column(ForeignKey("debate_runs.id"), unique=True, index=True)
    summary: Mapped[str] = mapped_column(Text)
    verdict: Mapped[str] = mapped_column(Text)
    recommendations_json: Mapped[list] = mapped_column(JSON, default=list)
    raw_output_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    run_id: Mapped[str | None] = mapped_column(ForeignKey("debate_runs.id"), nullable=True, index=True)
    agent_configuration_id: Mapped[str | None] = mapped_column(ForeignKey("agent_configurations.id"), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(100))
    model: Mapped[str] = mapped_column(String(100))
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    cost_estimate_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(50), default="succeeded")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class BillingLedgerEntry(Base):
    __tablename__ = "billing_ledger_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    subscription_id: Mapped[str | None] = mapped_column(ForeignKey("subscriptions.id"), nullable=True, index=True)
    usage_event_id: Mapped[str | None] = mapped_column(ForeignKey("usage_events.id"), nullable=True, index=True)
    entry_type: Mapped[str] = mapped_column(String(50))
    amount_cents: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    description: Mapped[str] = mapped_column(Text)
    period_key: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MonthlyUsageSummary(Base):
    __tablename__ = "monthly_usage_summaries"
    __table_args__ = (UniqueConstraint("workspace_id", "month_key", name="uq_workspace_month_usage"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    month_key: Mapped[str] = mapped_column(String(7), index=True)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_cost_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_runs: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="in_progress")
    collected_context: Mapped[dict] = mapped_column(JSON, default=dict)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("conversation_sessions.id"), index=True)
    role: Mapped[str] = mapped_column(String(10))
    content: Mapped[str] = mapped_column(Text)
    message_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ExpertTemplate(Base):
    __tablename__ = "expert_templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_from_run_id: Mapped[str | None] = mapped_column(ForeignKey("debate_runs.id"), index=True, nullable=True)

    # Agent definition
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(Text)
    instructions: Mapped[str] = mapped_column(Text)
    tone: Mapped[str] = mapped_column(String(100), default="balanced")
    model_provider: Mapped[str] = mapped_column(String(50), default="gemini")
    model_name: Mapped[str] = mapped_column(String(100), default="gemini-1.5-flash")

    # Quality metadata
    decision_domains: Mapped[list] = mapped_column(JSON, default=list)  # ["pricing", "product"]
    performance_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Usage tracking
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0)

    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class TemplateUsage(Base):
    __tablename__ = "template_usages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    template_id: Mapped[str] = mapped_column(ForeignKey("expert_templates.id"), index=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("debate_runs.id"), index=True)
    was_helpful: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


# ---------------------------------------------------------------------------
# MAGDM Decision Engine
# ---------------------------------------------------------------------------

class DecisionSession(Base):
    __tablename__ = "decision_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id"), index=True)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    title: Mapped[str] = mapped_column(String(255))
    problem_statement: Mapped[str] = mapped_column(Text)
    domain: Mapped[str] = mapped_column(String(100), default="general")

    # exploration | structured_decision
    mode: Mapped[str] = mapped_column(String(50), default="exploration")
    # draft | structuring | evaluating | ranked | archived
    status: Mapped[str] = mapped_column(String(50), default="draft")

    # Aggregation configuration (weighted_sum_v1)
    aggregation_method: Mapped[str] = mapped_column(String(50), default="weighted_sum_v1")

    # Cached ranking result JSON (recomputed on demand)
    ranking_result_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class DecisionAlternative(Base):
    __tablename__ = "decision_alternatives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("decision_sessions.id"), index=True)

    label: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    # active | removed
    status: Mapped[str] = mapped_column(String(50), default="active")
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DecisionCriterion(Base):
    __tablename__ = "decision_criteria"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("decision_sessions.id"), index=True)

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    # benefit (higher=better) | cost (lower=better)
    direction: Mapped[str] = mapped_column(String(20), default="benefit")
    # Raw user weight (before normalization)
    weight: Mapped[float] = mapped_column(default=1.0)
    # Normalized weight (sum=1 across all active criteria)
    weight_normalized: Mapped[float] = mapped_column(default=0.0)
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DecisionExpert(Base):
    __tablename__ = "decision_experts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("decision_sessions.id"), index=True)

    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, default="")
    # system | user_saved | human
    expert_type: Mapped[str] = mapped_column(String(50), default="system")
    # V1: equal weights across active experts (1/N), stored normalized
    weight_normalized: Mapped[float] = mapped_column(default=0.0)
    # Full agent config for LLM evaluation calls
    agent_config_json: Mapped[dict] = mapped_column(JSON, default=dict)
    # active | removed
    status: Mapped[str] = mapped_column(String(50), default="active")
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class DecisionEvaluation(Base):
    """One row per (expert × alternative × criterion). Score 1-10."""
    __tablename__ = "decision_evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    session_id: Mapped[str] = mapped_column(ForeignKey("decision_sessions.id"), index=True)
    expert_id: Mapped[str] = mapped_column(ForeignKey("decision_experts.id"), index=True)
    alternative_id: Mapped[str] = mapped_column(ForeignKey("decision_alternatives.id"), index=True)
    criterion_id: Mapped[str] = mapped_column(ForeignKey("decision_criteria.id"), index=True)

    raw_score: Mapped[float] = mapped_column(default=5.0)
    # Normalized 0-1 (computed from raw_score + criterion direction)
    normalized_score: Mapped[float] = mapped_column(default=0.0)
    # low | medium | high
    confidence: Mapped[str] = mapped_column(String(20), default="medium")
    justification: Mapped[str] = mapped_column(Text, default="")
    # ai | human
    source: Mapped[str] = mapped_column(String(20), default="ai")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
