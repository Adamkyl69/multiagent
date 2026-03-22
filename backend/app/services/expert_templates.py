"""
Expert Templates Service

Manages reusable expert agent templates with quality guardrails.
Templates can only be saved from completed debates and are capped at 15 per workspace.
"""

import logging
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DebateRun, ExpertTemplate, ProjectVersion, TemplateUsage
from app.schemas import (
    CreateExpertAgentRequest,
    ExpertTemplateListResponse,
    ExpertTemplateResponse,
    RateTemplateRequest,
    SaveAgentAsTemplateRequest,
    UpdateExpertTemplateRequest,
    VALID_DECISION_DOMAINS,
)

logger = logging.getLogger(__name__)

MAX_TEMPLATES_PER_WORKSPACE = 15


class ExpertTemplateService:
    """Service for managing expert agent templates with quality guardrails."""

    # --- Helpers ---

    @staticmethod
    def _to_response(template: ExpertTemplate) -> ExpertTemplateResponse:
        helpful_rate = template.helpful_count / max(template.total_ratings, 1)
        return ExpertTemplateResponse(
            id=template.id,
            workspace_id=template.workspace_id,
            created_from_run_id=template.created_from_run_id,
            name=template.name,
            role=template.role,
            purpose=template.purpose,
            instructions=template.instructions,
            tone=template.tone,
            model_provider=template.model_provider,
            model_name=template.model_name,
            decision_domains=template.decision_domains or [],
            performance_note=template.performance_note,
            times_used=template.times_used,
            helpful_count=template.helpful_count,
            total_ratings=template.total_ratings,
            helpful_rate=round(helpful_rate, 2),
            created_at=template.created_at,
            updated_at=template.updated_at,
        )

    @staticmethod
    def _validate_domains(domains: list[str]) -> None:
        invalid = [d for d in domains if d not in VALID_DECISION_DOMAINS]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid decision domains: {invalid}. Valid: {VALID_DECISION_DOMAINS}",
            )

    @staticmethod
    def _validate_instruction_quality(instructions: str, purpose: str, role: str) -> None:
        """Reject vague or generic agent definitions."""
        if len(instructions.strip()) < 30:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Instructions must be at least 30 characters. Be specific about what this agent should do.",
            )
        if len(purpose.strip()) < 15:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Purpose must be at least 15 characters. Explain the decision-making value.",
            )
        if len(role.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Role must be at least 5 characters.",
            )
        # Reject overly generic instructions
        generic_phrases = [
            "think critically",
            "be helpful",
            "analyze the problem",
            "provide good advice",
            "be an expert",
        ]
        lower_instructions = instructions.lower()
        for phrase in generic_phrases:
            if lower_instructions.strip() == phrase or (
                len(lower_instructions) < 60 and phrase in lower_instructions
            ):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Instructions too generic ('{phrase}'). Describe specific reasoning approach, focus areas, and decision criteria.",
                )

    # --- Core Operations ---

    async def save_agent_as_template(
        self,
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        run_id: str,
        request: SaveAgentAsTemplateRequest,
    ) -> ExpertTemplateResponse:
        """Save an agent from a completed debate run as an expert template."""

        # 1. Validate run exists and is completed
        run = await session.scalar(
            select(DebateRun).where(
                DebateRun.id == run_id,
                DebateRun.workspace_id == workspace_id,
            )
        )
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate run not found.")
        if run.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only save agents from completed debates. This run is still in progress.",
            )

        # 2. Validate workspace template limit
        current_count = await session.scalar(
            select(func.count(ExpertTemplate.id)).where(
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
            )
        )
        if (current_count or 0) >= MAX_TEMPLATES_PER_WORKSPACE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Workspace has reached the limit of {MAX_TEMPLATES_PER_WORKSPACE} expert templates. Remove an existing template to add a new one.",
            )

        # 3. Validate decision domains
        self._validate_domains(request.decision_domains)

        # 4. Extract agent from the run's project version snapshot
        version = await session.scalar(
            select(ProjectVersion).where(ProjectVersion.id == run.project_version_id)
        )
        if not version:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project version not found.")

        snapshot = version.snapshot_json or {}
        agents = snapshot.get("agents", [])
        if request.agent_index >= len(agents):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Agent index {request.agent_index} out of range. Run had {len(agents)} agents.",
            )

        agent = agents[request.agent_index]

        # 5. Validate instruction quality
        self._validate_instruction_quality(
            instructions=agent.get("instructions", ""),
            purpose=agent.get("purpose", ""),
            role=agent.get("role", ""),
        )

        # 6. Create template
        template = ExpertTemplate(
            workspace_id=workspace_id,
            created_by_user_id=user_id,
            created_from_run_id=run_id,
            name=agent.get("name", "Unnamed Agent"),
            role=agent.get("role", ""),
            purpose=agent.get("purpose", ""),
            instructions=agent.get("instructions", ""),
            tone=agent.get("tone", "balanced"),
            model_provider=agent.get("model_provider", "gemini"),
            model_name=agent.get("model_name", "gemini-1.5-flash"),
            decision_domains=request.decision_domains,
            performance_note=request.performance_note,
        )
        session.add(template)
        await session.commit()
        await session.refresh(template)

        logger.info(
            "Expert template created: id=%s name=%s workspace=%s from_run=%s",
            template.id, template.name, workspace_id, run_id,
        )
        return self._to_response(template)

    async def create_manual_agent(
        self,
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        request: CreateExpertAgentRequest,
    ) -> ExpertTemplateResponse:
        """Create an expert agent manually (not from a debate)."""

        # 1. Validate workspace template limit
        current_count = await session.scalar(
            select(func.count(ExpertTemplate.id)).where(
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
            )
        )
        if (current_count or 0) >= MAX_TEMPLATES_PER_WORKSPACE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Workspace has reached the limit of {MAX_TEMPLATES_PER_WORKSPACE} expert agents. Remove an existing agent to add a new one.",
            )

        # 2. Validate decision domains
        self._validate_domains(request.decision_domains)

        # 3. Validate instruction quality
        self._validate_instruction_quality(
            instructions=request.instructions,
            purpose=request.purpose,
            role=request.role,
        )

        # 4. Create template
        template = ExpertTemplate(
            workspace_id=workspace_id,
            created_by_user_id=user_id,
            created_from_run_id=None,  # Manually created
            name=request.name,
            role=request.role,
            purpose=request.purpose,
            instructions=request.instructions,
            tone=request.tone,
            model_provider=request.model_provider,
            model_name=request.model_name,
            decision_domains=request.decision_domains,
            performance_note=request.performance_note,
        )
        session.add(template)
        await session.commit()
        await session.refresh(template)

        logger.info(
            "Manual expert agent created: id=%s name=%s workspace=%s",
            template.id, template.name, workspace_id,
        )
        return self._to_response(template)

    async def list_templates(
        self,
        session: AsyncSession,
        workspace_id: str,
        domain: str | None = None,
    ) -> ExpertTemplateListResponse:
        """List workspace templates, optionally filtered by decision domain."""

        query = select(ExpertTemplate).where(
            ExpertTemplate.workspace_id == workspace_id,
            ExpertTemplate.is_deleted == False,  # noqa: E712
        )

        if domain:
            if domain not in VALID_DECISION_DOMAINS:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid domain '{domain}'. Valid: {VALID_DECISION_DOMAINS}",
                )
            # Filter templates that include this domain in their decision_domains JSON array
            query = query.where(
                ExpertTemplate.decision_domains.contains([domain])
            )

        query = query.order_by(ExpertTemplate.times_used.desc(), ExpertTemplate.created_at.desc())
        results = await session.scalars(query)
        templates = list(results.all())

        return ExpertTemplateListResponse(
            templates=[self._to_response(t) for t in templates],
            count=len(templates),
            limit=MAX_TEMPLATES_PER_WORKSPACE,
        )

    async def get_template(
        self,
        session: AsyncSession,
        workspace_id: str,
        template_id: str,
    ) -> ExpertTemplateResponse:
        """Get a single expert template."""

        template = await session.scalar(
            select(ExpertTemplate).where(
                ExpertTemplate.id == template_id,
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
            )
        )
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert template not found.")
        return self._to_response(template)

    async def update_template(
        self,
        session: AsyncSession,
        workspace_id: str,
        template_id: str,
        request: UpdateExpertTemplateRequest,
    ) -> ExpertTemplateResponse:
        """Update an expert template based on new learnings."""

        template = await session.scalar(
            select(ExpertTemplate).where(
                ExpertTemplate.id == template_id,
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
            )
        )
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert template not found.")

        # Apply updates
        if request.name is not None:
            template.name = request.name
        if request.role is not None:
            template.role = request.role
        if request.purpose is not None:
            template.purpose = request.purpose
        if request.instructions is not None:
            template.instructions = request.instructions
        if request.tone is not None:
            template.tone = request.tone
        if request.model_provider is not None:
            template.model_provider = request.model_provider
        if request.model_name is not None:
            template.model_name = request.model_name
        if request.decision_domains is not None:
            self._validate_domains(request.decision_domains)
            template.decision_domains = request.decision_domains
        if request.performance_note is not None:
            template.performance_note = request.performance_note

        # Re-validate quality after updates
        self._validate_instruction_quality(template.instructions, template.purpose, template.role)

        await session.commit()
        await session.refresh(template)

        logger.info("Expert template updated: id=%s name=%s", template.id, template.name)
        return self._to_response(template)

    async def delete_template(
        self,
        session: AsyncSession,
        workspace_id: str,
        template_id: str,
    ) -> dict[str, Any]:
        """Soft-delete an expert template."""

        template = await session.scalar(
            select(ExpertTemplate).where(
                ExpertTemplate.id == template_id,
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
            )
        )
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert template not found.")

        template.is_deleted = True
        await session.commit()

        logger.info("Expert template deleted: id=%s name=%s (used %dx)", template.id, template.name, template.times_used)
        return {"status": "deleted", "template_id": template_id}

    async def rate_template(
        self,
        session: AsyncSession,
        workspace_id: str,
        template_id: str,
        run_id: str,
        request: RateTemplateRequest,
    ) -> ExpertTemplateResponse:
        """Rate a template's performance after a debate."""

        template = await session.scalar(
            select(ExpertTemplate).where(
                ExpertTemplate.id == template_id,
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
            )
        )
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert template not found.")

        # Check that the run is completed
        run = await session.scalar(
            select(DebateRun).where(
                DebateRun.id == run_id,
                DebateRun.workspace_id == workspace_id,
            )
        )
        if not run:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debate run not found.")
        if run.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only rate templates from completed debates.",
            )

        # Check for duplicate rating
        existing = await session.scalar(
            select(TemplateUsage).where(
                TemplateUsage.template_id == template_id,
                TemplateUsage.run_id == run_id,
            )
        )
        if existing and existing.was_helpful is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Template already rated for this debate run.",
            )

        # Record or update usage rating
        if existing:
            existing.was_helpful = request.was_helpful
            existing.feedback_note = request.feedback_note
        else:
            usage = TemplateUsage(
                template_id=template_id,
                run_id=run_id,
                was_helpful=request.was_helpful,
                feedback_note=request.feedback_note,
            )
            session.add(usage)

        # Update aggregate stats
        template.total_ratings += 1
        if request.was_helpful:
            template.helpful_count += 1

        await session.commit()
        await session.refresh(template)

        logger.info(
            "Template rated: id=%s helpful=%s rate=%.0f%%",
            template.id, request.was_helpful,
            template.helpful_count / max(template.total_ratings, 1) * 100,
        )
        return self._to_response(template)

    async def record_template_usage(
        self,
        session: AsyncSession,
        template_id: str,
        run_id: str,
    ) -> None:
        """Record that a template was used in a debate (called when run starts)."""

        template = await session.scalar(
            select(ExpertTemplate).where(ExpertTemplate.id == template_id)
        )
        if not template:
            return

        template.times_used += 1
        usage = TemplateUsage(template_id=template_id, run_id=run_id)
        session.add(usage)
        await session.flush()

    async def get_suggested_templates(
        self,
        session: AsyncSession,
        workspace_id: str,
        decision_domain: str,
        limit: int = 3,
    ) -> list[ExpertTemplateResponse]:
        """Get top-rated templates for a decision domain, for suggestion during project generation."""

        if decision_domain not in VALID_DECISION_DOMAINS:
            return []

        query = (
            select(ExpertTemplate)
            .where(
                ExpertTemplate.workspace_id == workspace_id,
                ExpertTemplate.is_deleted == False,  # noqa: E712
                ExpertTemplate.decision_domains.contains([decision_domain]),
            )
            .order_by(
                # Sort by helpful rate (descending), then by usage count
                (ExpertTemplate.helpful_count * 1.0 / func.greatest(ExpertTemplate.total_ratings, 1)).desc(),
                ExpertTemplate.times_used.desc(),
            )
            .limit(limit)
        )

        results = await session.scalars(query)
        templates = list(results.all())
        return [self._to_response(t) for t in templates]
