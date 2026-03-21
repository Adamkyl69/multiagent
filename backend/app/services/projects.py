from collections.abc import Sequence

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    AgentConfiguration,
    ClarificationQuestion,
    ClarificationSession,
    FlowConfiguration,
    Project,
    ProjectVersion,
)
from app.schemas import (
    AgentCapabilities,
    AgentDraft,
    FlowStepDraft,
    ProjectGenerationRequest,
    ProjectResponse,
    ProjectUpdateRequest,
    ProjectVersionResponse,
    ProjectVersionSnapshot,
)
from app.services.billing import BillingService
from app.services.intake import IntakeService
from app.services.llm import LLMService

class ProjectService:
    def __init__(self, intake_service: IntakeService, billing_service: BillingService, llm_service: LLMService) -> None:
        self.intake_service = intake_service
        self.billing_service = billing_service
        self.llm_service = llm_service

    async def generate_project(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        user_id: str,
        request: ProjectGenerationRequest,
    ) -> ProjectResponse:
        await self.billing_service.ensure_usage_available(session, workspace_id)
        assessment = self.intake_service.assess(request.prompt, request.clarification_answers)

        if assessment.status == "blocked":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"assessment": assessment.model_dump()})

        if assessment.status == "needs_clarification" and not request.clarification_answers and not request.force_generate_with_assumptions:
            session_payload = await self._persist_clarification_session(
                session=session,
                workspace_id=workspace_id,
                prompt=request.prompt,
                project_id=None,
                clarification_answers=request.clarification_answers,
                assessment_questions=assessment.clarification_questions,
            )
            await session.commit()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Clarification is required before project generation.",
                    "clarification_session_id": session_payload.id,
                    "assessment": assessment.model_dump(),
                },
            )

        generation_result = await self.llm_service.generate_project_snapshot(
            prompt=request.prompt,
            assessment=assessment,
            clarification_answers=request.clarification_answers,
        )
        snapshot = generation_result.snapshot
        title = snapshot.title
        objective = snapshot.objective

        project = Project(
            workspace_id=workspace_id,
            created_by_user_id=user_id,
            title=title,
            objective=objective,
            prompt=request.prompt,
            intake_status=assessment.status,
            prompt_quality_score=assessment.prompt_quality_score,
            generated_with_assumptions=assessment.status == "generate_with_assumptions" or bool(assessment.assumptions),
            status="draft",
        )
        session.add(project)
        await session.flush()

        if request.clarification_answers or assessment.clarification_questions:
            await self._persist_clarification_session(
                session=session,
                workspace_id=workspace_id,
                prompt=request.prompt,
                project_id=project.id,
                clarification_answers=request.clarification_answers,
                assessment_questions=assessment.clarification_questions,
            )

        version = await self._create_project_version(session, project.id, user_id, snapshot)

        await self.billing_service.record_usage(
            session,
            user_id=user_id,
            workspace_id=workspace_id,
            project_id=project.id,
            provider=generation_result.usage.provider,
            model=generation_result.usage.model,
            input_tokens=generation_result.usage.input_tokens,
            output_tokens=generation_result.usage.output_tokens,
            cost_estimate_cents=generation_result.usage.cost_estimate_cents,
        )
        await session.commit()
        await session.refresh(project)
        return self._project_response(project, version, snapshot)

    async def get_project(self, session: AsyncSession, workspace_id: str, project_id: str) -> ProjectResponse:
        project = await self._get_project_or_404(session, workspace_id, project_id)
        version = await self._latest_project_version(session, project_id)
        if version is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project version not found.")
        snapshot = ProjectVersionSnapshot.model_validate(version.snapshot_json)
        return self._project_response(project, version, snapshot)

    async def update_project(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        project_id: str,
        payload: ProjectUpdateRequest,
        user_id: str,
    ) -> ProjectResponse:
        project = await self._get_project_or_404(session, workspace_id, project_id)
        version = await self._latest_project_version(session, project_id)
        if version is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project version not found.")

        snapshot = ProjectVersionSnapshot.model_validate(version.snapshot_json)

        if payload.title is not None:
            project.title = payload.title
            snapshot.title = payload.title
        if payload.objective is not None:
            project.objective = payload.objective
            snapshot.objective = payload.objective
        if payload.status is not None:
            project.status = payload.status
        if payload.agents is not None:
            snapshot.agents = payload.agents
        if payload.flow is not None:
            snapshot.flow = payload.flow

        version.snapshot_json = snapshot.model_dump(mode="json")
        await self._replace_version_configuration(session, version.id, snapshot)
        await session.commit()
        await session.refresh(project)
        return self._project_response(project, version, snapshot)

    async def delete_project(
        self,
        session: AsyncSession,
        workspace_id: str,
        project_id: str,
    ) -> None:
        """Delete a project and all its versions, configurations, and runs."""
        project = await self._get_project_or_404(session, workspace_id, project_id)
        
        # Delete all related data (cascade should handle most, but being explicit)
        from app.models import ProjectVersion, AgentConfiguration, FlowConfiguration, DebateRun
        
        # Delete runs
        runs = await session.execute(
            select(DebateRun).where(DebateRun.project_id == project_id)
        )
        for run in runs.scalars():
            await session.delete(run)
        
        # Delete versions and their configurations
        versions = await session.execute(
            select(ProjectVersion).where(ProjectVersion.project_id == project_id)
        )
        for version in versions.scalars():
            # Delete agent configurations
            agents = await session.execute(
                select(AgentConfiguration).where(AgentConfiguration.project_version_id == version.id)
            )
            for agent in agents.scalars():
                await session.delete(agent)
            
            # Delete flow configurations
            flows = await session.execute(
                select(FlowConfiguration).where(FlowConfiguration.project_version_id == version.id)
            )
            for flow in flows.scalars():
                await session.delete(flow)
            
            await session.delete(version)
        
        # Delete the project
        await session.delete(project)
        await session.commit()

    async def create_version(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        project_id: str,
        user_id: str,
    ) -> ProjectVersionResponse:
        project = await self._get_project_or_404(session, workspace_id, project_id)
        latest_version = await self._latest_project_version(session, project_id)
        if latest_version is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project version not found.")

        snapshot = ProjectVersionSnapshot.model_validate(latest_version.snapshot_json)
        new_version = await self._create_project_version(session, project.id, user_id, snapshot)
        await session.commit()
        return ProjectVersionResponse(
            project_id=project.id,
            version_id=new_version.id,
            version_number=new_version.version_number,
            created_at=new_version.created_at,
        )

    async def _create_project_version(
        self,
        session: AsyncSession,
        project_id: str,
        user_id: str,
        snapshot: ProjectVersionSnapshot,
    ) -> ProjectVersion:
        latest_version = await self._latest_project_version(session, project_id)
        version_number = 1 if latest_version is None else latest_version.version_number + 1
        version = ProjectVersion(
            project_id=project_id,
            version_number=version_number,
            snapshot_json=snapshot.model_dump(mode="json"),
            created_by_user_id=user_id,
        )
        session.add(version)
        await session.flush()
        await self._replace_version_configuration(session, version.id, snapshot)
        return version

    async def _replace_version_configuration(
        self,
        session: AsyncSession,
        version_id: str,
        snapshot: ProjectVersionSnapshot,
    ) -> None:
        existing_agents = await session.scalars(select(AgentConfiguration).where(AgentConfiguration.project_version_id == version_id))
        for item in existing_agents.all():
            await session.delete(item)
        existing_flow = await session.scalars(select(FlowConfiguration).where(FlowConfiguration.project_version_id == version_id))
        for item in existing_flow.all():
            await session.delete(item)
        await session.flush()

        for position, agent in enumerate(snapshot.agents, start=1):
            session.add(
                AgentConfiguration(
                    project_version_id=version_id,
                    name=agent.name,
                    role_title=agent.role,
                    purpose=agent.purpose,
                    instructions=agent.instructions,
                    tone=agent.tone,
                    tools_json=agent.tools,
                    capabilities_json=agent.capabilities.model_dump(mode="json"),
                    model_provider=agent.model_provider,
                    model_name=agent.model_name,
                    position=position,
                )
            )

        for position, phase in enumerate(snapshot.flow, start=1):
            session.add(
                FlowConfiguration(
                    project_version_id=version_id,
                    name=phase.name,
                    description=phase.description,
                    rules_json=phase.rules,
                    position=position,
                )
            )
        await session.flush()

    async def _persist_clarification_session(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        prompt: str,
        project_id: str | None,
        clarification_answers: dict[str, str],
        assessment_questions: Sequence,
    ) -> ClarificationSession:
        clarification_session = ClarificationSession(
            workspace_id=workspace_id,
            project_id=project_id,
            prompt=prompt,
            status="completed" if clarification_answers else "open",
        )
        session.add(clarification_session)
        await session.flush()

        for position, question in enumerate(assessment_questions, start=1):
            session.add(
                ClarificationQuestion(
                    session_id=clarification_session.id,
                    question_key=question.key,
                    question_text=question.question,
                    answer_text=clarification_answers.get(question.key),
                    position=position,
                )
            )

        existing_question_keys = {question.key for question in assessment_questions}
        for offset, key in enumerate(clarification_answers.keys(), start=len(existing_question_keys) + 1):
            if key in existing_question_keys:
                continue
            session.add(
                ClarificationQuestion(
                    session_id=clarification_session.id,
                    question_key=key,
                    question_text=key.replace("_", " ").strip().capitalize(),
                    answer_text=clarification_answers[key],
                    position=offset,
                )
            )
        await session.flush()
        return clarification_session

    async def _get_project_or_404(self, session: AsyncSession, workspace_id: str, project_id: str) -> Project:
        project = await session.scalar(
            select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id)
        )
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
        return project

    async def _latest_project_version(self, session: AsyncSession, project_id: str) -> ProjectVersion | None:
        return await session.scalar(
            select(ProjectVersion)
            .where(ProjectVersion.project_id == project_id)
            .order_by(desc(ProjectVersion.version_number))
            .limit(1)
        )

    def _project_response(
        self,
        project: Project,
        version: ProjectVersion,
        snapshot: ProjectVersionSnapshot,
    ) -> ProjectResponse:
        return ProjectResponse(
            project_id=project.id,
            workspace_id=project.workspace_id,
            title=project.title,
            objective=project.objective,
            prompt=project.prompt,
            intake_status=project.intake_status,
            prompt_quality_score=project.prompt_quality_score,
            generated_with_assumptions=project.generated_with_assumptions,
            status=project.status,
            latest_version_id=version.id,
            latest_version_number=version.version_number,
            assumptions=snapshot.assumptions,
            warnings=snapshot.warnings,
            agents=snapshot.agents,
            flow=snapshot.flow,
            created_at=project.created_at,
            updated_at=project.updated_at,
        )

    def _generate_title(self, prompt: str, domain: str) -> str:
        lowered = prompt.strip().rstrip("?.!")
        if domain == "pricing":
            return "Pricing Strategy Debate"
        if domain == "market_expansion":
            return "Market Expansion Decision Debate"
        if domain == "health":
            return lowered[:80].title() or "Health Decision Debate"
        return lowered[:80].title() or "Strategic Debate Project"

    def _generate_objective(self, prompt: str, domain: str) -> str:
        if domain == "pricing":
            return "Evaluate pricing options across financial, growth, positioning, and retention trade-offs."
        if domain == "market_expansion":
            return "Assess whether expansion is strategically and operationally justified, with explicit risks, dependencies, and recommendations."
        if domain == "health":
            return "Evaluate benefits, risks, evidence strength, and practical recommendations for the prompt topic."
        return f"Generate a structured decision debate based on the prompt: {prompt.strip()}"

    def _generate_agents(self, domain: str) -> list[AgentDraft]:
        if domain == "pricing":
            return [
                AgentDraft(name="CFO", role="Finance Lead", purpose="Evaluate unit economics and downside risk.", instructions="Prioritize margin structure, payback period, and revenue quality.", tone="analytical", tools=["pricing-model"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Marketer", role="Growth Strategist", purpose="Assess willingness to pay and market positioning.", instructions="Focus on buyer psychology, acquisition efficiency, and packaging.", tone="commercial", tools=["market-research"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Product Strategist", role="Value Architect", purpose="Argue from product differentiation and roadmap fit.", instructions="Tie pricing to product value, segmentation, and expansion levers.", tone="balanced", tools=["roadmap-context"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Moderator", role="Synthesis Lead", purpose="Drive convergence to a decision.", instructions="Summarize trade-offs and produce a clear recommendation.", tone="neutral", tools=["synthesis-engine"], capabilities=AgentCapabilities(ask=True, challenge=False, cite=True, score=False, recommend=True)),
            ]
        if domain == "market_expansion":
            return [
                AgentDraft(name="Market Analyst", role="Market Entry Strategist", purpose="Assess demand, competition, and fit.", instructions="Focus on customer demand, positioning, and adoption barriers.", tone="strategic", tools=["market-data"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Compliance Counsel", role="Regulatory Lead", purpose="Surface legal and compliance constraints.", instructions="Focus on regulatory exposure, contracting, and operational obligations.", tone="cautious", tools=["regulatory-db"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Finance Lead", role="Capital Allocator", purpose="Test commercial viability and resource efficiency.", instructions="Evaluate return profile, investment sizing, and downside scenarios.", tone="analytical", tools=["financial-model"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Moderator", role="Decision Facilitator", purpose="Synthesize debate into an action plan.", instructions="Convert debate outcomes into a recommendation with risks and next steps.", tone="neutral", tools=["synthesis-engine"], capabilities=AgentCapabilities(ask=True, challenge=False, cite=True, score=False, recommend=True)),
            ]
        if domain == "health":
            return [
                AgentDraft(name="Dietician", role="Nutrition Specialist", purpose="Provide evidence-based nutrition guidance.", instructions="Discuss nutritional profile, practical diet context, and evidence quality.", tone="clinical", tools=["nutrition-db", "study-search"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Physician", role="General Medical Reviewer", purpose="Assess broad health relevance and risk factors.", instructions="Consider age-related conditions, contraindications, and uncertainty.", tone="cautious", tools=["clinical-guidelines"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
                AgentDraft(name="Research Skeptic", role="Evidence Critic", purpose="Challenge weak assumptions and overclaiming.", instructions="Focus on study quality, confounders, and generalization limits.", tone="critical", tools=["bias-review"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=False, recommend=False)),
                AgentDraft(name="Moderator", role="Synthesis Lead", purpose="Produce a balanced synthesis.", instructions="Summarize evidence, uncertainty, and practical takeaways without overstating certainty.", tone="neutral", tools=["synthesis-engine"], capabilities=AgentCapabilities(ask=True, challenge=False, cite=True, score=False, recommend=True)),
            ]
        return [
            AgentDraft(name="Domain Expert", role="Primary Specialist", purpose="Make the strongest case for the leading path.", instructions="Argue from expertise and concrete decision criteria.", tone="strategic", tools=["research"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
            AgentDraft(name="Operator", role="Execution Lead", purpose="Evaluate feasibility and implementation constraints.", instructions="Focus on dependencies, sequencing, and operational complexity.", tone="practical", tools=["ops-model"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=True, recommend=False)),
            AgentDraft(name="Skeptic", role="Counterpoint Reviewer", purpose="Stress-test the core thesis.", instructions="Identify hidden risks, assumptions, and failure modes.", tone="critical", tools=["risk-map"], capabilities=AgentCapabilities(ask=True, challenge=True, cite=True, score=False, recommend=False)),
            AgentDraft(name="Moderator", role="Decision Synthesizer", purpose="Create the final recommendation.", instructions="Resolve disagreement into a clear synthesis with open issues.", tone="neutral", tools=["synthesis-engine"], capabilities=AgentCapabilities(ask=True, challenge=False, cite=True, score=False, recommend=True)),
        ]

    def _generate_flow(self, domain: str) -> list[FlowStepDraft]:
        return [
            FlowStepDraft(name="Scope and Framing", description="Clarify the decision question, success criteria, and constraints.", rules={"objective": "framing"}),
            FlowStepDraft(name="Opening Positions", description="Each agent presents an initial position from their role perspective.", rules={"objective": "initial_positions"}),
            FlowStepDraft(name="Evidence and Analysis", description="Agents introduce evidence, assumptions, and key trade-offs.", rules={"objective": "evidence"}),
            FlowStepDraft(name="Challenges and Rebuttals", description="Agents test each other's claims and expose weak reasoning.", rules={"objective": "cross_examination"}),
            FlowStepDraft(name="Final Synthesis", description="The moderator consolidates the debate into a recommendation and rationale.", rules={"objective": "synthesis", "domain": domain}),
        ]
