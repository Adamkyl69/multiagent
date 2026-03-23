"""Pydantic schemas for the MAGDM Decision Engine."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

class CreateDecisionSessionRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    problem_statement: str = Field(min_length=10, max_length=3000)
    domain: str = Field(default="general", max_length=100)


class UpdateDecisionSessionRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    problem_statement: str | None = Field(default=None, max_length=3000)
    domain: str | None = Field(default=None, max_length=100)
    mode: str | None = Field(default=None)   # exploration | structured_decision
    status: str | None = Field(default=None)


class DecisionSessionResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    problem_statement: str
    domain: str
    mode: str
    status: str
    aggregation_method: str
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Alternatives
# ---------------------------------------------------------------------------

class AlternativeIn(BaseModel):
    label: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=1000)


class UpdateAlternativesRequest(BaseModel):
    alternatives: list[AlternativeIn] = Field(min_length=2, max_length=8)


class AlternativeResponse(BaseModel):
    id: str
    session_id: str
    label: str
    description: str
    status: str
    position: int


# ---------------------------------------------------------------------------
# Criteria
# ---------------------------------------------------------------------------

class CriterionIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=500)
    direction: str = Field(default="benefit")   # benefit | cost
    weight: float = Field(default=1.0, gt=0)


class UpdateCriteriaRequest(BaseModel):
    criteria: list[CriterionIn] = Field(min_length=2, max_length=10)


class CriterionResponse(BaseModel):
    id: str
    session_id: str
    name: str
    description: str
    direction: str
    weight: float
    weight_normalized: float
    position: int


# ---------------------------------------------------------------------------
# Experts
# ---------------------------------------------------------------------------

class ExpertIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    role: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=1000)
    expert_type: str = Field(default="system")
    agent_config: dict[str, Any] = Field(default_factory=dict)


class UpdateExpertsRequest(BaseModel):
    experts: list[ExpertIn] = Field(min_length=1, max_length=6)


class ExpertResponse(BaseModel):
    id: str
    session_id: str
    name: str
    role: str
    description: str
    expert_type: str
    weight_normalized: float
    status: str
    position: int


# ---------------------------------------------------------------------------
# AI Suggestion Requests
# ---------------------------------------------------------------------------

class SuggestAlternativesRequest(BaseModel):
    problem_statement: str = Field(min_length=10)
    domain: str = Field(default="general")
    existing_alternatives: list[str] = Field(default_factory=list)


class SuggestCriteriaRequest(BaseModel):
    problem_statement: str = Field(min_length=10)
    domain: str = Field(default="general")
    alternatives: list[str] = Field(default_factory=list)
    existing_criteria: list[str] = Field(default_factory=list)


class SuggestExpertsRequest(BaseModel):
    problem_statement: str = Field(min_length=10)
    domain: str = Field(default="general")
    criteria: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

class EvaluationCell(BaseModel):
    expert_id: str
    alternative_id: str
    criterion_id: str
    raw_score: float = Field(ge=1, le=10)
    confidence: str = Field(default="medium")
    justification: str = Field(default="", max_length=500)
    source: str = Field(default="ai")


class EvaluationResponse(BaseModel):
    id: str
    session_id: str
    expert_id: str
    alternative_id: str
    criterion_id: str
    raw_score: float
    normalized_score: float
    confidence: str
    justification: str
    source: str


# ---------------------------------------------------------------------------
# Ranking Result
# ---------------------------------------------------------------------------

class AlternativeScoreDetail(BaseModel):
    alternative_id: str
    alternative_label: str
    group_score: float            # 0-1
    rank: int
    expert_scores: dict[str, float]   # expert_id -> subtotal (0-1)
    criterion_contributions: dict[str, float]  # criterion_id -> weighted contribution
    is_provisional: bool = False


class CriterionDisagreement(BaseModel):
    criterion_id: str
    criterion_name: str
    stddev: float
    contested: bool          # True if stddev above threshold


class AlternativeDisagreement(BaseModel):
    alternative_id: str
    alternative_label: str
    mean_disagreement: float
    contested_criteria: list[str]


class SensitivityItem(BaseModel):
    criterion_id: str
    criterion_name: str
    weight_normalized: float
    impact_rank: int         # 1 = most influential


class RankingResult(BaseModel):
    session_id: str
    is_complete: bool
    completion_errors: list[str]   # why it can't be ranked (if incomplete)
    ranked_alternatives: list[AlternativeScoreDetail]
    criterion_disagreements: list[CriterionDisagreement]
    alternative_disagreements: list[AlternativeDisagreement]
    sensitivity: list[SensitivityItem]
    is_provisional: bool
    provisional_reasons: list[str]
    explanation: str        # AI narrative grounded in computed results
    computed_at: datetime


# ---------------------------------------------------------------------------
# Full session snapshot (for frontend wizard)
# ---------------------------------------------------------------------------

class DecisionSessionDetail(BaseModel):
    session: DecisionSessionResponse
    alternatives: list[AlternativeResponse]
    criteria: list[CriterionResponse]
    experts: list[ExpertResponse]
    evaluations: list[EvaluationResponse]
    ranking: RankingResult | None
