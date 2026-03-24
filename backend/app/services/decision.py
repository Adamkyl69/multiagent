"""
MAGDM Decision Engine Service

Responsibilities:
  - CRUD for DecisionSession, Alternatives, Criteria, Experts, Evaluations
  - Single-pass LLM evaluation per expert (structured JSON matrix)
  - Deterministic aggregation pipeline (weighted sum, absolute normalization)
  - Consensus/disagreement metrics
  - V1-lite sensitivity analysis
  - AI explanation grounded strictly in computed results
"""

import logging
import math
import statistics
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    DecisionAlternative,
    DecisionCriterion,
    DecisionEvaluation,
    DecisionExpert,
    DecisionSession,
)
from app.schemas_decision import (
    AlternativeDisagreement,
    AlternativeResponse,
    AlternativeScoreDetail,
    CreateDecisionSessionRequest,
    CriterionDisagreement,
    CriterionResponse,
    DecisionSessionDetail,
    DecisionSessionResponse,
    EvaluationResponse,
    ExpertIn,
    ExpertResponse,
    RankingResult,
    SensitivityItem,
    UpdateAlternativesRequest,
    UpdateCriteriaRequest,
    UpdateDecisionSessionRequest,
    UpdateExpertsRequest,
)
from app.services.llm import LLMService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCORE_MIN = 1.0
SCORE_MAX = 10.0
PROVISIONAL_SCORE_DELTA = 0.03     # top-2 within this range → provisional
CONTESTED_STDDEV_THRESHOLD = 1.5   # stddev above this → criterion contested
SENSITIVITY_TOP_N = 5               # top-N criteria to include in sensitivity

MAX_ALTERNATIVES = 8
MAX_CRITERIA = 10
MAX_EXPERTS = 6


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalize_score(raw: float, direction: str) -> float:
    """Absolute 1-10 → 0-1 normalization with benefit/cost inversion."""
    base = (raw - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)
    if direction == "cost":
        return 1.0 - base
    return base


def _normalize_weights(raw_weights: list[float]) -> list[float]:
    total = sum(raw_weights)
    if total <= 0:
        n = len(raw_weights)
        return [1.0 / n] * n
    return [w / total for w in raw_weights]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Response builders
# ---------------------------------------------------------------------------

def _session_response(s: DecisionSession) -> DecisionSessionResponse:
    return DecisionSessionResponse(
        id=s.id,
        workspace_id=s.workspace_id,
        title=s.title,
        problem_statement=s.problem_statement,
        domain=s.domain,
        mode=s.mode,
        status=s.status,
        aggregation_method=s.aggregation_method,
        created_at=s.created_at,
        updated_at=s.updated_at,
    )


def _alt_response(a: DecisionAlternative) -> AlternativeResponse:
    return AlternativeResponse(
        id=a.id, session_id=a.session_id, label=a.label,
        description=a.description, status=a.status, position=a.position,
    )


def _crit_response(c: DecisionCriterion) -> CriterionResponse:
    return CriterionResponse(
        id=c.id, session_id=c.session_id, name=c.name, description=c.description,
        direction=c.direction, weight=c.weight, weight_normalized=c.weight_normalized,
        position=c.position,
    )


def _expert_response(e: DecisionExpert) -> ExpertResponse:
    return ExpertResponse(
        id=e.id, session_id=e.session_id, name=e.name, role=e.role,
        description=e.description, expert_type=e.expert_type,
        weight_normalized=e.weight_normalized, status=e.status, position=e.position,
    )


def _eval_response(ev: DecisionEvaluation) -> EvaluationResponse:
    return EvaluationResponse(
        id=ev.id, session_id=ev.session_id, expert_id=ev.expert_id,
        alternative_id=ev.alternative_id, criterion_id=ev.criterion_id,
        raw_score=ev.raw_score, normalized_score=ev.normalized_score,
        confidence=ev.confidence, justification=ev.justification, source=ev.source,
    )


# ---------------------------------------------------------------------------
# Aggregation pipeline (pure math, no LLM)
# ---------------------------------------------------------------------------

def _run_aggregation(
    alternatives: list[DecisionAlternative],
    criteria: list[DecisionCriterion],
    experts: list[DecisionExpert],
    evaluations: list[DecisionEvaluation],
) -> dict[str, Any]:
    """
    Returns:
      {
        "scores":  { alt_id: { expert_id: subtotal, "_group": group_score } },
        "criterion_contributions": { alt_id: { crit_id: weighted_contribution } },
        "ranked": [ (alt_id, group_score) sorted desc ],
      }
    """
    # Index evaluations by (expert_id, alt_id, crit_id)
    eval_index: dict[tuple[str, str, str], DecisionEvaluation] = {}
    for ev in evaluations:
        eval_index[(ev.expert_id, ev.alternative_id, ev.criterion_id)] = ev

    active_alts = [a for a in alternatives if a.status == "active"]
    active_crit = [c for c in criteria]
    active_exp = [e for e in experts if e.status == "active"]

    crit_weights = {c.id: c.weight_normalized for c in active_crit}
    exp_weights = {e.id: e.weight_normalized for e in active_exp}

    scores: dict[str, dict[str, float]] = {}
    criterion_contributions: dict[str, dict[str, float]] = {}

    for alt in active_alts:
        expert_subtotals: dict[str, float] = {}
        crit_contribs: dict[str, float] = {}

        for exp in active_exp:
            subtotal = 0.0
            for crit in active_crit:
                ev = eval_index.get((exp.id, alt.id, crit.id))
                if ev is None:
                    continue
                contribution = crit_weights.get(crit.id, 0.0) * ev.normalized_score
                subtotal += contribution
                crit_contribs[crit.id] = crit_contribs.get(crit.id, 0.0) + (
                    exp_weights.get(exp.id, 0.0) * contribution
                )
            expert_subtotals[exp.id] = subtotal

        # Group score = Σ_e (w_e * expert_subtotal)
        group_score = sum(
            exp_weights.get(exp.id, 0.0) * expert_subtotals.get(exp.id, 0.0)
            for exp in active_exp
        )

        scores[alt.id] = {**expert_subtotals, "_group": group_score}
        criterion_contributions[alt.id] = crit_contribs

    ranked = sorted(
        [(alt_id, data["_group"]) for alt_id, data in scores.items()],
        key=lambda x: x[1],
        reverse=True,
    )

    return {
        "scores": scores,
        "criterion_contributions": criterion_contributions,
        "ranked": ranked,
    }


def _compute_disagreement(
    criteria: list[DecisionCriterion],
    alternatives: list[DecisionAlternative],
    experts: list[DecisionExpert],
    evaluations: list[DecisionEvaluation],
) -> tuple[list[CriterionDisagreement], list[AlternativeDisagreement]]:
    """Compute per-(alt, crit) stddev across experts."""
    active_alts = [a for a in alternatives if a.status == "active"]
    active_exp = [e for e in experts if e.status == "active"]

    eval_index: dict[tuple[str, str, str], float] = {
        (ev.expert_id, ev.alternative_id, ev.criterion_id): ev.normalized_score
        for ev in evaluations
    }

    # Per criterion: average stddev across alternatives
    crit_stddevs: dict[str, list[float]] = {}
    for crit in criteria:
        stddevs = []
        for alt in active_alts:
            scores = [
                eval_index.get((exp.id, alt.id, crit.id), None)
                for exp in active_exp
            ]
            scores = [s for s in scores if s is not None]
            if len(scores) >= 2:
                stddevs.append(statistics.stdev(scores))
        crit_stddevs[crit.id] = stddevs

    crit_disagreements = []
    for crit in criteria:
        vals = crit_stddevs.get(crit.id, [])
        avg_std = statistics.mean(vals) if vals else 0.0
        crit_disagreements.append(CriterionDisagreement(
            criterion_id=crit.id,
            criterion_name=crit.name,
            stddev=round(avg_std, 4),
            contested=avg_std >= CONTESTED_STDDEV_THRESHOLD,
        ))

    # Per alternative: mean stddev across criteria
    alt_disagreements = []
    for alt in active_alts:
        per_crit_stds = []
        contested = []
        for crit in criteria:
            scores = [
                eval_index.get((exp.id, alt.id, crit.id), None)
                for exp in active_exp
            ]
            scores = [s for s in scores if s is not None]
            if len(scores) >= 2:
                std = statistics.stdev(scores)
                per_crit_stds.append(std)
                if std >= CONTESTED_STDDEV_THRESHOLD:
                    contested.append(crit.id)
        mean_d = statistics.mean(per_crit_stds) if per_crit_stds else 0.0
        alt_disagreements.append(AlternativeDisagreement(
            alternative_id=alt.id,
            alternative_label=alt.label,
            mean_disagreement=round(mean_d, 4),
            contested_criteria=contested,
        ))

    return crit_disagreements, alt_disagreements


def _compute_sensitivity(criteria: list[DecisionCriterion]) -> list[SensitivityItem]:
    """V1-lite: rank criteria by weight (most influential = highest weight)."""
    sorted_crit = sorted(criteria, key=lambda c: c.weight_normalized, reverse=True)
    return [
        SensitivityItem(
            criterion_id=c.id,
            criterion_name=c.name,
            weight_normalized=round(c.weight_normalized, 4),
            impact_rank=i + 1,
        )
        for i, c in enumerate(sorted_crit[:SENSITIVITY_TOP_N])
    ]


# ---------------------------------------------------------------------------
# Main service class
# ---------------------------------------------------------------------------

class DecisionService:
    def __init__(self, llm_service: LLMService) -> None:
        self.llm = llm_service

    # ------------------------------------------------------------------
    # Session CRUD
    # ------------------------------------------------------------------

    async def create_session(
        self,
        db: AsyncSession,
        workspace_id: str,
        user_id: str,
        req: CreateDecisionSessionRequest,
    ) -> DecisionSessionResponse:
        session = DecisionSession(
            workspace_id=workspace_id,
            created_by_user_id=user_id,
            title=req.title,
            problem_statement=req.problem_statement,
            domain=req.domain,
            mode="exploration",
            status="draft",
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return _session_response(session)

    async def get_session(self, db: AsyncSession, workspace_id: str, session_id: str) -> DecisionSession:
        s = await db.scalar(
            select(DecisionSession).where(
                DecisionSession.id == session_id,
                DecisionSession.workspace_id == workspace_id,
            )
        )
        if s is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decision session not found.")
        return s

    async def update_session(
        self,
        db: AsyncSession,
        workspace_id: str,
        session_id: str,
        req: UpdateDecisionSessionRequest,
    ) -> DecisionSessionResponse:
        s = await self.get_session(db, workspace_id, session_id)
        if req.title is not None:
            s.title = req.title
        if req.problem_statement is not None:
            s.problem_statement = req.problem_statement
        if req.domain is not None:
            s.domain = req.domain
        if req.mode is not None:
            if req.mode not in ("exploration", "structured_decision"):
                raise HTTPException(status_code=400, detail="mode must be exploration or structured_decision")
            s.mode = req.mode
        if req.status is not None:
            s.status = req.status
        await db.commit()
        await db.refresh(s)
        return _session_response(s)

    async def list_sessions(self, db: AsyncSession, workspace_id: str) -> list[DecisionSessionResponse]:
        rows = await db.scalars(
            select(DecisionSession)
            .where(DecisionSession.workspace_id == workspace_id)
            .order_by(DecisionSession.updated_at.desc())
        )
        return [_session_response(s) for s in rows.all()]

    async def delete_session(self, db: AsyncSession, workspace_id: str, session_id: str) -> None:
        s = await self.get_session(db, workspace_id, session_id)
        # Cascade: delete evaluations, experts, criteria, alternatives
        for model in (DecisionEvaluation, DecisionExpert, DecisionCriterion, DecisionAlternative):
            rows = await db.scalars(select(model).where(model.session_id == session_id))
            for row in rows.all():
                await db.delete(row)
        await db.delete(s)
        await db.commit()

    # ------------------------------------------------------------------
    # Alternatives
    # ------------------------------------------------------------------

    async def update_alternatives(
        self,
        db: AsyncSession,
        workspace_id: str,
        session_id: str,
        req: UpdateAlternativesRequest,
    ) -> list[AlternativeResponse]:
        await self.get_session(db, workspace_id, session_id)
        existing = await db.scalars(
            select(DecisionAlternative).where(DecisionAlternative.session_id == session_id)
        )
        for row in existing.all():
            await db.delete(row)
        await db.flush()
        results = []
        for i, alt_in in enumerate(req.alternatives):
            alt = DecisionAlternative(
                session_id=session_id,
                label=alt_in.label,
                description=alt_in.description,
                status="active",
                position=i,
            )
            db.add(alt)
            results.append(alt)
        await db.commit()
        for a in results:
            await db.refresh(a)
        return [_alt_response(a) for a in results]

    async def list_alternatives(self, db: AsyncSession, session_id: str) -> list[AlternativeResponse]:
        rows = await db.scalars(
            select(DecisionAlternative)
            .where(DecisionAlternative.session_id == session_id, DecisionAlternative.status == "active")
            .order_by(DecisionAlternative.position)
        )
        return [_alt_response(r) for r in rows.all()]

    # ------------------------------------------------------------------
    # Criteria
    # ------------------------------------------------------------------

    async def update_criteria(
        self,
        db: AsyncSession,
        workspace_id: str,
        session_id: str,
        req: UpdateCriteriaRequest,
    ) -> list[CriterionResponse]:
        await self.get_session(db, workspace_id, session_id)
        existing = await db.scalars(
            select(DecisionCriterion).where(DecisionCriterion.session_id == session_id)
        )
        for row in existing.all():
            await db.delete(row)
        await db.flush()

        raw_weights = [c.weight for c in req.criteria]
        normalized = _normalize_weights(raw_weights)

        results = []
        for i, (crit_in, w_norm) in enumerate(zip(req.criteria, normalized)):
            if crit_in.direction not in ("benefit", "cost"):
                raise HTTPException(status_code=400, detail=f"Invalid direction '{crit_in.direction}' for criterion '{crit_in.name}'")
            crit = DecisionCriterion(
                session_id=session_id,
                name=crit_in.name,
                description=crit_in.description,
                direction=crit_in.direction,
                weight=crit_in.weight,
                weight_normalized=round(w_norm, 6),
                position=i,
            )
            db.add(crit)
            results.append(crit)
        await db.commit()
        for c in results:
            await db.refresh(c)
        return [_crit_response(c) for c in results]

    async def list_criteria(self, db: AsyncSession, session_id: str) -> list[CriterionResponse]:
        rows = await db.scalars(
            select(DecisionCriterion)
            .where(DecisionCriterion.session_id == session_id)
            .order_by(DecisionCriterion.position)
        )
        return [_crit_response(r) for r in rows.all()]

    # ------------------------------------------------------------------
    # Experts
    # ------------------------------------------------------------------

    async def update_experts(
        self,
        db: AsyncSession,
        workspace_id: str,
        session_id: str,
        req: UpdateExpertsRequest,
    ) -> list[ExpertResponse]:
        await self.get_session(db, workspace_id, session_id)
        existing = await db.scalars(
            select(DecisionExpert).where(DecisionExpert.session_id == session_id)
        )
        for row in existing.all():
            await db.delete(row)
        await db.flush()

        raw_weights = [e.weight for e in req.experts]
        normalized_weights = _normalize_weights(raw_weights)

        results = []
        for i, (exp_in, w_norm) in enumerate(zip(req.experts, normalized_weights)):
            exp = DecisionExpert(
                session_id=session_id,
                name=exp_in.name,
                role=exp_in.role,
                description=exp_in.description,
                expert_type=exp_in.expert_type,
                weight_normalized=round(w_norm, 6),
                agent_config_json=exp_in.agent_config,
                status="active",
                position=i,
            )
            db.add(exp)
            results.append(exp)
        await db.commit()
        for e in results:
            await db.refresh(e)
        return [_expert_response(e) for e in results]

    async def list_experts(self, db: AsyncSession, session_id: str) -> list[ExpertResponse]:
        rows = await db.scalars(
            select(DecisionExpert)
            .where(DecisionExpert.session_id == session_id, DecisionExpert.status == "active")
            .order_by(DecisionExpert.position)
        )
        return [_expert_response(r) for r in rows.all()]

    # ------------------------------------------------------------------
    # AI Suggestions
    # ------------------------------------------------------------------

    async def suggest_alternatives(
        self, problem_statement: str, domain: str, existing: list[str]
    ) -> list[dict[str, str]]:
        system_instruction = (
            "You are a decision analyst. Given a decision problem, propose a concise finite set of "
            "alternatives (options to choose between). Return only valid JSON.\n"
            "Rules:\n"
            "- Propose 3-6 distinct, mutually exclusive alternatives\n"
            "- Each alternative must be concrete and actionable\n"
            "- Do not repeat existing alternatives provided\n"
            "- Format: { \"alternatives\": [{\"label\": \"...\", \"description\": \"...\"}, ...] }"
        )
        payload = {
            "problem_statement": problem_statement,
            "domain": domain,
            "existing_alternatives": existing,
        }
        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            alts = result.get("alternatives", [])
            return [{"label": a.get("label", ""), "description": a.get("description", "")} for a in alts if a.get("label")]
        except Exception as exc:
            logger.error("suggest_alternatives failed: %s", exc)
            return []

    async def suggest_criteria(
        self, problem_statement: str, domain: str, alternatives: list[str], existing: list[str]
    ) -> list[dict[str, Any]]:
        system_instruction = (
            "You are a decision analyst. Propose evaluation criteria for a multi-attribute decision. "
            "Return only valid JSON.\n"
            "Rules:\n"
            "- Propose 5-8 criteria that cover key trade-off dimensions\n"
            "- Each criterion has direction: 'benefit' (higher=better) or 'cost' (lower=better)\n"
            "- Assign initial weights (1-10) reflecting relative importance\n"
            "- Do not repeat existing criteria provided\n"
            "- Format: { \"criteria\": [{\"name\": \"...\", \"description\": \"...\", "
            "\"direction\": \"benefit|cost\", \"weight\": 5}, ...] }"
        )
        payload = {
            "problem_statement": problem_statement,
            "domain": domain,
            "alternatives": alternatives,
            "existing_criteria": existing,
        }
        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return result.get("criteria", [])
        except Exception as exc:
            logger.error("suggest_criteria failed: %s", exc)
            return []

    async def suggest_experts(
        self, problem_statement: str, domain: str, criteria: list[str]
    ) -> list[dict[str, str]]:
        system_instruction = (
            "You are a decision architect. Propose 3-5 expert evaluator personas for a multi-attribute "
            "group decision. Each expert represents a distinct decision lens. Return only valid JSON.\n"
            "Rules:\n"
            "- Different perspectives that create productive tension\n"
            "- Each expert must have a clear role tied to the decision domain\n"
            "- Format: { \"experts\": [{\"name\": \"...\", \"role\": \"...\", \"description\": \"...\"}, ...] }"
        )
        payload = {
            "problem_statement": problem_statement,
            "domain": domain,
            "criteria": criteria,
        }
        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return result.get("experts", [])
        except Exception as exc:
            logger.error("suggest_experts failed: %s", exc)
            return []

    # ------------------------------------------------------------------
    # Evaluation Engine (single-pass per expert)
    # ------------------------------------------------------------------

    async def run_evaluation(
        self,
        db: AsyncSession,
        workspace_id: str,
        session_id: str,
    ) -> RankingResult:
        """
        Single-pass evaluation:
        1. Validate completeness
        2. For each active expert: call LLM to produce full score matrix (JSON)
        3. Persist evaluations
        4. Run aggregation pipeline
        5. Generate explanation
        """
        session = await self.get_session(db, workspace_id, session_id)

        alts = await db.scalars(
            select(DecisionAlternative)
            .where(DecisionAlternative.session_id == session_id, DecisionAlternative.status == "active")
            .order_by(DecisionAlternative.position)
        )
        alts_list = list(alts.all())

        crit_rows = await db.scalars(
            select(DecisionCriterion)
            .where(DecisionCriterion.session_id == session_id)
            .order_by(DecisionCriterion.position)
        )
        crit_list = list(crit_rows.all())

        exp_rows = await db.scalars(
            select(DecisionExpert)
            .where(DecisionExpert.session_id == session_id, DecisionExpert.status == "active")
            .order_by(DecisionExpert.position)
        )
        exp_list = list(exp_rows.all())

        # --- Validate completeness ---
        errors = self._validate_completeness(alts_list, crit_list, exp_list)
        if errors:
            return RankingResult(
                session_id=session_id,
                is_complete=False,
                completion_errors=errors,
                ranked_alternatives=[],
                criterion_disagreements=[],
                alternative_disagreements=[],
                sensitivity=[],
                is_provisional=False,
                provisional_reasons=[],
                explanation="",
                computed_at=_utc_now(),
            )

        # --- Delete old evaluations for this session ---
        old_evals = await db.scalars(
            select(DecisionEvaluation).where(DecisionEvaluation.session_id == session_id)
        )
        for ev in old_evals.all():
            await db.delete(ev)
        await db.flush()

        # --- Generate evaluation matrix per expert ---
        all_evaluations: list[DecisionEvaluation] = []
        for expert in exp_list:
            try:
                raw_matrix = await self._llm_evaluate_expert(
                    session=session,
                    expert=expert,
                    alternatives=alts_list,
                    criteria=crit_list,
                )
            except Exception as exc:
                logger.error("Expert %s evaluation failed: %s", expert.name, exc)
                raw_matrix = self._fallback_matrix(alts_list, crit_list)

            for alt in alts_list:
                for crit in crit_list:
                    cell = raw_matrix.get(alt.id, {}).get(crit.id, {})
                    raw_score = float(cell.get("score", 5.0))
                    raw_score = max(SCORE_MIN, min(SCORE_MAX, raw_score))
                    norm = _normalize_score(raw_score, crit.direction)
                    ev = DecisionEvaluation(
                        session_id=session_id,
                        expert_id=expert.id,
                        alternative_id=alt.id,
                        criterion_id=crit.id,
                        raw_score=round(raw_score, 2),
                        normalized_score=round(norm, 6),
                        confidence=cell.get("confidence", "medium"),
                        justification=str(cell.get("justification", ""))[:500],
                        source="ai",
                    )
                    db.add(ev)
                    all_evaluations.append(ev)

        await db.commit()
        for ev in all_evaluations:
            await db.refresh(ev)

        # --- Aggregation ---
        agg = _run_aggregation(alts_list, crit_list, exp_list, all_evaluations)
        crit_disagreements, alt_disagreements = _compute_disagreement(
            crit_list, alts_list, exp_list, all_evaluations
        )
        sensitivity = _compute_sensitivity(crit_list)

        # --- Build ranked alternatives ---
        alt_map = {a.id: a for a in alts_list}
        ranked_alts: list[AlternativeScoreDetail] = []
        for rank, (alt_id, group_score) in enumerate(agg["ranked"], start=1):
            alt = alt_map[alt_id]
            expert_scores = {
                exp_id: round(score, 4)
                for exp_id, score in agg["scores"][alt_id].items()
                if exp_id != "_group"
            }
            crit_contribs = {
                crit_id: round(contrib, 4)
                for crit_id, contrib in agg["criterion_contributions"].get(alt_id, {}).items()
            }
            ranked_alts.append(AlternativeScoreDetail(
                alternative_id=alt_id,
                alternative_label=alt.label,
                group_score=round(group_score, 4),
                rank=rank,
                expert_scores=expert_scores,
                criterion_contributions=crit_contribs,
                is_provisional=False,
            ))

        # --- Provisional check ---
        provisional_reasons = self._check_provisional(ranked_alts, crit_disagreements)
        is_provisional = len(provisional_reasons) > 0
        if is_provisional and ranked_alts:
            ranked_alts[0].is_provisional = True

        # --- AI Explanation (grounded in computed results) ---
        explanation = await self._generate_explanation(
            session=session,
            alternatives=alts_list,
            criteria=crit_list,
            ranked=ranked_alts,
            crit_disagreements=crit_disagreements,
            alt_disagreements=alt_disagreements,
            sensitivity=sensitivity,
            is_provisional=is_provisional,
            provisional_reasons=provisional_reasons,
        )

        # --- Cache result on session ---
        ranking_cache = {
            "is_provisional": is_provisional,
            "provisional_reasons": provisional_reasons,
            "ranked": [(r.alternative_id, r.group_score) for r in ranked_alts],
            "explanation": explanation,
        }
        session.ranking_result_json = ranking_cache
        session.status = "ranked"
        await db.commit()

        return RankingResult(
            session_id=session_id,
            is_complete=True,
            completion_errors=[],
            ranked_alternatives=ranked_alts,
            criterion_disagreements=crit_disagreements,
            alternative_disagreements=alt_disagreements,
            sensitivity=sensitivity,
            is_provisional=is_provisional,
            provisional_reasons=provisional_reasons,
            explanation=explanation,
            computed_at=_utc_now(),
        )

    # ------------------------------------------------------------------
    # LLM Evaluation prompt
    # ------------------------------------------------------------------

    async def _llm_evaluate_expert(
        self,
        session: DecisionSession,
        expert: DecisionExpert,
        alternatives: list[DecisionAlternative],
        criteria: list[DecisionCriterion],
    ) -> dict[str, dict[str, dict]]:
        """
        Returns { alt_id: { crit_id: { score, confidence, justification } } }
        """
        alt_labels = [{"id": a.id, "label": a.label, "description": a.description} for a in alternatives]
        crit_labels = [
            {"id": c.id, "name": c.name, "description": c.description, "direction": c.direction}
            for c in criteria
        ]
        agent_cfg = expert.agent_config_json or {}

        system_instruction = (
            f"You are {expert.name}, a {expert.role}.\n"
            f"{expert.description}\n\n"
            "You are evaluating alternatives for a structured decision. "
            "Score each alternative on each criterion using a 1-10 scale.\n\n"
            "Scale anchors: 1-2=very weak, 3-4=weak, 5-6=moderate, 7-8=strong, 9-10=excellent\n"
            "For 'cost' criteria: 1-2=very high cost (bad), 9-10=very low cost (good).\n\n"
            "Return ONLY valid JSON in this exact format:\n"
            "{\n"
            '  "evaluations": {\n'
            '    "<alternative_id>": {\n'
            '      "<criterion_id>": {\n'
            '        "score": <int 1-10>,\n'
            '        "confidence": "<low|medium|high>",\n'
            '        "justification": "<one sentence max>"\n'
            "      }\n"
            "    }\n"
            "  }\n"
            "}\n\n"
            "Evaluate ALL alternative × criterion combinations. Be systematic and consistent with your role perspective."
        )
        if agent_cfg.get("instructions"):
            system_instruction += f"\n\nAdditional role guidance: {agent_cfg['instructions']}"

        payload = {
            "decision": {
                "title": session.title,
                "problem_statement": session.problem_statement,
                "domain": session.domain,
            },
            "alternatives": alt_labels,
            "criteria": crit_labels,
        }

        provider = agent_cfg.get("model_provider", "gemini")
        model = agent_cfg.get("model_name", "gemini-2.5-flash-lite")

        result = await self.llm._generate_json(
            model=model,
            system_instruction=system_instruction,
            payload=payload,
            provider=provider,
        )

        raw_evals = result.get("evaluations", {})
        # Build output keyed by (alt.id, crit.id)
        matrix: dict[str, dict[str, dict]] = {}
        for alt in alternatives:
            matrix[alt.id] = {}
            alt_data = raw_evals.get(alt.id, {})
            if not alt_data:
                # LLM may have used label instead of id — try matching by label
                for key, val in raw_evals.items():
                    if key.lower() == alt.label.lower() or key == alt.id:
                        alt_data = val
                        break
            for crit in criteria:
                cell = alt_data.get(crit.id, alt_data.get(crit.name, {}))
                if isinstance(cell, (int, float)):
                    cell = {"score": cell, "confidence": "medium", "justification": ""}
                matrix[alt.id][crit.id] = cell if isinstance(cell, dict) else {}
        return matrix

    def _fallback_matrix(
        self,
        alternatives: list[DecisionAlternative],
        criteria: list[DecisionCriterion],
    ) -> dict[str, dict[str, dict]]:
        """Return neutral 5/10 scores when LLM evaluation fails."""
        return {
            alt.id: {
                crit.id: {"score": 5, "confidence": "low", "justification": "Fallback score (evaluation failed)"}
                for crit in criteria
            }
            for alt in alternatives
        }

    # ------------------------------------------------------------------
    # Explanation (grounded in computed results)
    # ------------------------------------------------------------------

    async def _generate_explanation(
        self,
        session: DecisionSession,
        alternatives: list[DecisionAlternative],
        criteria: list[DecisionCriterion],
        ranked: list[AlternativeScoreDetail],
        crit_disagreements: list[CriterionDisagreement],
        alt_disagreements: list[AlternativeDisagreement],
        sensitivity: list[SensitivityItem],
        is_provisional: bool,
        provisional_reasons: list[str],
    ) -> str:
        """AI explains the computed ranking. Cannot override or contradict it."""
        crit_map = {c.id: c.name for c in criteria}

        ranking_summary = [
            {
                "rank": r.rank,
                "alternative": r.alternative_label,
                "score": r.group_score,
                "top_criteria_contributions": {
                    crit_map.get(cid, cid): round(v, 3)
                    for cid, v in sorted(r.criterion_contributions.items(), key=lambda x: x[1], reverse=True)[:3]
                },
            }
            for r in ranked
        ]
        contested = [d.criterion_name for d in crit_disagreements if d.contested]
        top_criteria = [s.criterion_name for s in sensitivity[:3]]

        system_instruction = (
            "You are a decision analysis explainer. You MUST base your explanation strictly on the computed "
            "ranking and metrics provided. Do not introduce new reasoning not present in the data. "
            "Do not override the ranking. Be concise and executive-quality.\n\n"
            "Write 3-5 sentences covering:\n"
            "1. Why the top-ranked option leads (cite its strongest criteria contributions)\n"
            "2. Key trade-offs or risks of the top choice\n"
            "3. Where expert disagreement was highest and what it means\n"
            f"{'4. WHY THE RESULT IS PROVISIONAL and what info would resolve it' if is_provisional else ''}\n\n"
            "Do NOT introduce reasons outside the scoring data. Do NOT recommend a different option than rank 1 "
            "unless the result is flagged provisional, in which case label it clearly as an exception."
        )
        payload = {
            "decision_title": session.title,
            "problem_statement": session.problem_statement,
            "ranking": ranking_summary,
            "is_provisional": is_provisional,
            "provisional_reasons": provisional_reasons,
            "contested_criteria": contested,
            "most_influential_criteria": top_criteria,
        }

        try:
            raw = await self.llm._generate_text(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return raw.strip()
        except Exception as exc:
            logger.error("Explanation generation failed: %s", exc)
            if ranked:
                top = ranked[0]
                return (
                    f"Based on the weighted evaluation, **{top.alternative_label}** ranks first "
                    f"with a group score of {top.group_score:.3f}. "
                    + (f"Note: {'; '.join(provisional_reasons)}" if provisional_reasons else "")
                )
            return "Ranking complete. See score breakdown above."

    # ------------------------------------------------------------------
    # Full session detail
    # ------------------------------------------------------------------

    async def get_session_detail(
        self,
        db: AsyncSession,
        workspace_id: str,
        session_id: str,
    ) -> DecisionSessionDetail:
        s = await self.get_session(db, workspace_id, session_id)

        alts = await db.scalars(
            select(DecisionAlternative)
            .where(DecisionAlternative.session_id == session_id)
            .order_by(DecisionAlternative.position)
        )
        crits = await db.scalars(
            select(DecisionCriterion)
            .where(DecisionCriterion.session_id == session_id)
            .order_by(DecisionCriterion.position)
        )
        exps = await db.scalars(
            select(DecisionExpert)
            .where(DecisionExpert.session_id == session_id)
            .order_by(DecisionExpert.position)
        )
        evals = await db.scalars(
            select(DecisionEvaluation)
            .where(DecisionEvaluation.session_id == session_id)
        )

        return DecisionSessionDetail(
            session=_session_response(s),
            alternatives=[_alt_response(a) for a in alts.all()],
            criteria=[_crit_response(c) for c in crits.all()],
            experts=[_expert_response(e) for e in exps.all()],
            evaluations=[_eval_response(ev) for ev in evals.all()],
            ranking=None,  # loaded from cache separately if needed
        )

    # ------------------------------------------------------------------
    # Completeness validation
    # ------------------------------------------------------------------

    def _validate_completeness(
        self,
        alts: list[DecisionAlternative],
        criteria: list[DecisionCriterion],
        experts: list[DecisionExpert],
    ) -> list[str]:
        errors = []
        if len(alts) < 2:
            errors.append(f"At least 2 active alternatives required (have {len(alts)})")
        if len(alts) > MAX_ALTERNATIVES:
            errors.append(f"Maximum {MAX_ALTERNATIVES} alternatives allowed (have {len(alts)})")
        if len(criteria) < 2:
            errors.append(f"At least 2 criteria required (have {len(criteria)})")
        if len(criteria) > MAX_CRITERIA:
            errors.append(f"Maximum {MAX_CRITERIA} criteria allowed (have {len(criteria)})")
        if len(experts) < 1:
            errors.append("At least 1 expert evaluator required")
        if len(experts) > MAX_EXPERTS:
            errors.append(f"Maximum {MAX_EXPERTS} experts allowed (have {len(experts)})")
        total_weight = sum(c.weight_normalized for c in criteria)
        if criteria and abs(total_weight - 1.0) > 0.05:
            errors.append(f"Criterion weights must sum to 1.0 (currently {total_weight:.3f})")
        return errors

    # ------------------------------------------------------------------
    # Provisional check
    # ------------------------------------------------------------------

    def _check_provisional(
        self,
        ranked: list[AlternativeScoreDetail],
        crit_disagreements: list[CriterionDisagreement],
    ) -> list[str]:
        reasons = []
        if len(ranked) >= 2:
            delta = ranked[0].group_score - ranked[1].group_score
            if delta <= PROVISIONAL_SCORE_DELTA:
                reasons.append(
                    f"Top two alternatives are within {delta:.3f} score points — decision is borderline"
                )
        contested = [d.criterion_name for d in crit_disagreements if d.contested]
        if contested:
            reasons.append(
                f"High disagreement among experts on: {', '.join(contested[:3])}"
            )
        return reasons
