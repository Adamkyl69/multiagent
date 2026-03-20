import asyncio
import json
from collections import defaultdict
from collections.abc import AsyncIterator
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models import DebateMessage, DebateRun, FinalOutput, MonthlyUsageSummary, Project, ProjectVersion, RunEvent, utc_now
from app.schemas import FinalOutputResponse, ProjectVersionSnapshot, RunEventResponse, RunResponse, TranscriptMessageResponse
from app.services.billing import BillingService
from app.services.llm import LLMService


class RunEventBroker:
    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue[dict]]] = defaultdict(set)

    def subscribe(self, run_id: str) -> asyncio.Queue[dict]:
        queue: asyncio.Queue[dict] = asyncio.Queue()
        self._subscribers[run_id].add(queue)
        return queue

    def unsubscribe(self, run_id: str, queue: asyncio.Queue[dict]) -> None:
        subscribers = self._subscribers.get(run_id)
        if not subscribers:
            return
        subscribers.discard(queue)
        if not subscribers:
            self._subscribers.pop(run_id, None)

    async def publish(self, run_id: str, event: dict) -> None:
        for queue in list(self._subscribers.get(run_id, set())):
            await queue.put(event)


class RunService:
    terminal_statuses = {"completed", "failed", "canceled"}

    def __init__(self, session_factory: async_sessionmaker[AsyncSession], billing_service: BillingService, broker: RunEventBroker, llm_service: LLMService) -> None:
        self.session_factory = session_factory
        self.billing_service = billing_service
        self.broker = broker
        self.llm_service = llm_service

    async def launch_run(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        user_id: str,
        project_id: str,
        project_version_id: str | None,
    ) -> RunResponse:
        await self.billing_service.ensure_usage_available(session, workspace_id)
        project = await session.scalar(select(Project).where(Project.id == project_id, Project.workspace_id == workspace_id))
        if project is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

        version = await self._resolve_project_version(session, project.id, project_version_id)
        snapshot = ProjectVersionSnapshot.model_validate(version.snapshot_json)
        estimated_cost_cents = max(3, len(snapshot.agents) * len(snapshot.flow))

        run = DebateRun(
            workspace_id=workspace_id,
            project_id=project.id,
            project_version_id=version.id,
            created_by_user_id=user_id,
            status="queued",
            estimated_cost_cents=estimated_cost_cents,
        )
        session.add(run)
        await session.commit()
        await session.refresh(run)
        asyncio.create_task(self.execute_run(run.id))
        return self._run_response(run)

    async def execute_run(self, run_id: str) -> None:
        async with self.session_factory() as session:
            run = await session.scalar(select(DebateRun).where(DebateRun.id == run_id))
            if run is None:
                return

            try:
                version = await session.scalar(select(ProjectVersion).where(ProjectVersion.id == run.project_version_id))
                if version is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project version not found.")

                snapshot = ProjectVersionSnapshot.model_validate(version.snapshot_json)
                run.status = "running"
                run.started_at = utc_now()
                await session.commit()
                await self._append_event(session, run.id, "run.started", {"status": run.status, "project_version_id": version.id})

                message_sequence = 0
                total_cost_cents = 0
                for phase_index, phase in enumerate(snapshot.flow, start=1):
                    if await self._is_canceled(session, run.id):
                        return
                    await self._append_event(
                        session,
                        run.id,
                        "phase.started",
                        {"phase": phase.name, "position": phase_index},
                    )
                    for agent in snapshot.agents:
                        if await self._is_canceled(session, run.id):
                            return
                        if phase.name == "Final Synthesis" and not agent.capabilities.recommend:
                            continue

                        transcript_context = await self._transcript_context(session, run.id)
                        turn_result = await self.llm_service.generate_debate_turn(
                            snapshot=snapshot,
                            phase=phase,
                            agent=agent,
                            transcript_context=transcript_context,
                        )
                        message_sequence += 1
                        message = DebateMessage(
                            run_id=run.id,
                            phase_name=phase.name,
                            speaker_name=agent.name,
                            message_type=turn_result.message_type,
                            content=turn_result.content,
                            sequence=message_sequence,
                        )
                        session.add(message)
                        await session.flush()

                        total_cost_cents += turn_result.usage.cost_estimate_cents
                        await self.billing_service.record_usage(
                            session,
                            user_id=run.created_by_user_id,
                            workspace_id=run.workspace_id,
                            project_id=run.project_id,
                            run_id=run.id,
                            provider=turn_result.usage.provider,
                            model=turn_result.usage.model,
                            input_tokens=turn_result.usage.input_tokens,
                            output_tokens=turn_result.usage.output_tokens,
                            cost_estimate_cents=turn_result.usage.cost_estimate_cents,
                        )
                        await session.commit()
                        await self._append_event(
                            session,
                            run.id,
                            "message.created",
                            {
                                "phase": phase.name,
                                "speaker": agent.name,
                                "role": agent.role,
                                "content": turn_result.content,
                                "sequence": message.sequence,
                                "message_type": turn_result.message_type,
                            },
                        )
                    await self._append_event(session, run.id, "phase.completed", {"phase": phase.name, "position": phase_index})

                synthesis_context = await self._transcript_context(session, run.id, max_messages=200)
                synthesis_result = await self.llm_service.generate_final_synthesis(
                    snapshot=snapshot,
                    transcript_context=synthesis_context,
                )
                total_cost_cents += synthesis_result.usage.cost_estimate_cents
                await self.billing_service.record_usage(
                    session,
                    user_id=run.created_by_user_id,
                    workspace_id=run.workspace_id,
                    project_id=run.project_id,
                    run_id=run.id,
                    provider=synthesis_result.usage.provider,
                    model=synthesis_result.usage.model,
                    input_tokens=synthesis_result.usage.input_tokens,
                    output_tokens=synthesis_result.usage.output_tokens,
                    cost_estimate_cents=synthesis_result.usage.cost_estimate_cents,
                )

                final_output = FinalOutput(
                    run_id=run.id,
                    summary=synthesis_result.summary,
                    verdict=synthesis_result.verdict,
                    recommendations_json=synthesis_result.recommendations,
                    raw_output_json=synthesis_result.raw_output,
                )
                session.add(final_output)
                run.status = "completed"
                run.actual_cost_cents = total_cost_cents
                run.completed_at = utc_now()
                summary_row = await session.scalar(
                    select(MonthlyUsageSummary).where(
                        MonthlyUsageSummary.workspace_id == run.workspace_id,
                        MonthlyUsageSummary.month_key == datetime.utcnow().strftime("%Y-%m"),
                    )
                )
                if summary_row is not None:
                    summary_row.total_runs += 1
                await session.commit()
                await self._append_event(
                    session,
                    run.id,
                    "run.completed",
                    {"status": run.status, "summary": synthesis_result.summary, "verdict": synthesis_result.verdict},
                )
            except Exception as exc:
                run.status = "failed"
                run.completed_at = utc_now()
                await session.commit()
                await self._append_event(
                    session,
                    run.id,
                    "run.failed",
                    {"status": run.status, "error": str(exc)},
                )

    async def stop_run(self, session: AsyncSession, workspace_id: str, run_id: str) -> RunResponse:
        run = await session.scalar(select(DebateRun).where(DebateRun.id == run_id, DebateRun.workspace_id == workspace_id))
        if run is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
        if run.status in self.terminal_statuses:
            return self._run_response(run)
        run.status = "canceled"
        run.completed_at = utc_now()
        await session.commit()
        await self._append_event(session, run.id, "run.canceled", {"status": run.status})
        return self._run_response(run)

    async def get_run(self, session: AsyncSession, workspace_id: str, run_id: str) -> RunResponse:
        run = await session.scalar(select(DebateRun).where(DebateRun.id == run_id, DebateRun.workspace_id == workspace_id))
        if run is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found.")
        return self._run_response(run)

    async def list_transcript(self, session: AsyncSession, workspace_id: str, run_id: str) -> list[TranscriptMessageResponse]:
        await self.get_run(session, workspace_id, run_id)
        messages = await session.scalars(
            select(DebateMessage)
            .where(DebateMessage.run_id == run_id)
            .order_by(DebateMessage.sequence.asc())
        )
        return [
            TranscriptMessageResponse(
                id=item.id,
                phase_name=item.phase_name,
                speaker_name=item.speaker_name,
                message_type=item.message_type,
                content=item.content,
                sequence=item.sequence,
                created_at=item.created_at,
            )
            for item in messages.all()
        ]

    async def list_events(self, session: AsyncSession, workspace_id: str, run_id: str) -> list[RunEventResponse]:
        await self.get_run(session, workspace_id, run_id)
        events = await session.scalars(
            select(RunEvent)
            .where(RunEvent.run_id == run_id)
            .order_by(RunEvent.sequence.asc())
        )
        return [
            RunEventResponse(
                id=item.id,
                event_type=item.event_type,
                payload=item.payload_json,
                sequence=item.sequence,
                created_at=item.created_at,
            )
            for item in events.all()
        ]

    async def get_final_output(self, session: AsyncSession, workspace_id: str, run_id: str) -> FinalOutputResponse:
        await self.get_run(session, workspace_id, run_id)
        final_output = await session.scalar(select(FinalOutput).where(FinalOutput.run_id == run_id))
        if final_output is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Final output not found.")
        return FinalOutputResponse(
            run_id=final_output.run_id,
            summary=final_output.summary,
            verdict=final_output.verdict,
            recommendations=final_output.recommendations_json,
            raw_output=final_output.raw_output_json,
            created_at=final_output.created_at,
        )

    async def stream_events(self, workspace_id: str, run_id: str) -> AsyncIterator[str]:
        async with self.session_factory() as session:
            historical_events = await self.list_events(session, workspace_id, run_id)
        for event in historical_events:
            yield f"data: {json.dumps(event.model_dump(mode='json'))}\n\n"

        if historical_events and historical_events[-1].event_type in {"run.completed", "run.failed", "run.canceled"}:
            return

        queue = self.broker.subscribe(run_id)
        try:
            while True:
                payload = await queue.get()
                yield f"data: {json.dumps(payload)}\n\n"
                if payload.get("event_type") in {"run.completed", "run.failed", "run.canceled"}:
                    break
        finally:
            self.broker.unsubscribe(run_id, queue)

    async def _append_event(self, session: AsyncSession, run_id: str, event_type: str, payload: dict) -> None:
        current_max = await session.scalar(select(func.max(RunEvent.sequence)).where(RunEvent.run_id == run_id))
        next_sequence = (current_max or 0) + 1
        event = RunEvent(run_id=run_id, event_type=event_type, payload_json=payload, sequence=next_sequence)
        session.add(event)
        await session.commit()
        event_payload = {
            "id": event.id,
            "event_type": event.event_type,
            "payload": event.payload_json,
            "sequence": event.sequence,
            "created_at": event.created_at.isoformat(),
        }
        await self.broker.publish(run_id, event_payload)

    async def _resolve_project_version(self, session: AsyncSession, project_id: str, version_id: str | None) -> ProjectVersion:
        if version_id:
            version = await session.scalar(select(ProjectVersion).where(ProjectVersion.id == version_id, ProjectVersion.project_id == project_id))
        else:
            version = await session.scalar(
                select(ProjectVersion)
                .where(ProjectVersion.project_id == project_id)
                .order_by(desc(ProjectVersion.version_number))
                .limit(1)
            )
        if version is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project version not found.")
        return version

    async def _is_canceled(self, session: AsyncSession, run_id: str) -> bool:
        run = await session.scalar(select(DebateRun).where(DebateRun.id == run_id))
        if run is None:
            return True
        return run.status == "canceled"

    async def _transcript_context(self, session: AsyncSession, run_id: str, max_messages: int | None = None) -> list[dict[str, str | int]]:
        limit = max_messages or 12
        messages = await session.scalars(
            select(DebateMessage)
            .where(DebateMessage.run_id == run_id)
            .order_by(DebateMessage.sequence.desc())
            .limit(limit)
        )
        ordered_messages = list(reversed(messages.all()))
        return [
            {
                "sequence": item.sequence,
                "phase_name": item.phase_name,
                "speaker_name": item.speaker_name,
                "message_type": item.message_type,
                "content": item.content,
            }
            for item in ordered_messages
        ]

    def _run_response(self, run: DebateRun) -> RunResponse:
        return RunResponse(
            run_id=run.id,
            project_id=run.project_id,
            project_version_id=run.project_version_id,
            status=run.status,
            estimated_cost_cents=run.estimated_cost_cents,
            actual_cost_cents=run.actual_cost_cents,
            created_at=run.created_at,
            started_at=run.started_at,
            completed_at=run.completed_at,
        )

