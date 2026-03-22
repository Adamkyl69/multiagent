"""
Conversation Service v2 - Improved UX Flow

Stages:
1. Entry - User enters decision/problem (simple, no configuration)
2. Classification - System classifies decision type (automatic, background)
3. Clarification - 3-7 high-leverage questions to reduce ambiguity
4. Frame - Confirm decision frame before debate
5. Agents - Generate 3-5 expert roles that create real tension
6. Ready - Ready to run debate
"""

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConversationMessage, ConversationSession, ExpertTemplate
from app.schemas_conversation import (
    CollectedContext,
    ConversationHistoryResponse,
    ConversationMessageMetadata,
    ConversationMessageResponse,
    ConversationResponse,
    DecisionClassification,
    DecisionFrame,
    LLMConversationResult,
)
from app.services.llm import LLMService
from app.services.projects import ProjectService

logger = logging.getLogger(__name__)


class ConversationServiceV2:
    """Improved conversation service with streamlined UX flow."""
    
    def __init__(self, llm_service: LLMService, project_service: ProjectService):
        self.llm = llm_service
        self.project_service = project_service

    async def start_conversation(
        self,
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        initial_message: str,
        additional_context: str | None = None,
    ) -> ConversationResponse:
        """Start a new conversation with a decision/problem."""
        
        # Create session
        conv_session = ConversationSession(
            workspace_id=workspace_id,
            user_id=user_id,
            status="in_progress",
            collected_context={
                "stage": "entry",
                "completeness": 0,
                "raw_question": initial_message,
                "additional_context": additional_context or "",
            },
        )
        session.add(conv_session)
        await session.flush()

        # Save user message
        user_msg = ConversationMessage(
            session_id=conv_session.id,
            role="user",
            content=initial_message,
        )
        session.add(user_msg)

        # Step 1: Classify the decision (automatic, in background)
        classification = await self._classify_decision(initial_message, additional_context)
        
        # Step 2: Generate clarifying questions based on classification
        clarifying_questions = await self._generate_clarifying_questions(
            initial_message, 
            additional_context,
            classification
        )
        
        # Update context
        updated_context = {
            "stage": "clarification",
            "completeness": 15,
            "raw_question": initial_message,
            "additional_context": additional_context or "",
            "classification": classification,
            "pending_questions": clarifying_questions,
            "clarifications": {},
            "questions_asked": 0,
        }
        conv_session.collected_context = updated_context

        # Build response with first clarifying question
        first_question = clarifying_questions[0] if clarifying_questions else "What's most important to you in making this decision?"
        
        system_msg = ConversationMessage(
            session_id=conv_session.id,
            role="system",
            content=f"I understand you're facing a decision. Let me ask a few questions to make sure I understand the full picture.\n\n{first_question}",
            message_metadata={
                "quick_replies": None,
                "suggestions": None,
            },
        )
        session.add(system_msg)
        await session.commit()

        return ConversationResponse(
            session_id=conv_session.id,
            message=self._to_message_response(system_msg),
            context=CollectedContext(**self._clean_context_for_validation(updated_context)),
            can_generate=False,
        )

    async def send_message(
        self,
        session: AsyncSession,
        session_id: str,
        user_message: str,
    ) -> ConversationResponse:
        """Process user message and advance conversation."""
        
        conv_session = await session.scalar(
            select(ConversationSession).where(ConversationSession.id == session_id)
        )
        if not conv_session:
            raise ValueError("Conversation session not found")

        # Save user message
        user_msg = ConversationMessage(
            session_id=session_id,
            role="user",
            content=user_message,
        )
        session.add(user_msg)

        context = conv_session.collected_context or {}
        current_stage = context.get("stage", "clarification")

        # Process based on current stage
        if current_stage == "clarification":
            result = await self._process_clarification(context, user_message)
        elif current_stage == "frame":
            result = await self._process_frame_confirmation(context, user_message, session, conv_session.workspace_id)
        elif current_stage == "agents":
            result = await self._process_agent_confirmation(context, user_message)
        elif current_stage == "ready":
            result = await self._process_ready_stage(context, user_message)
        else:
            result = await self._process_clarification(context, user_message)

        # Update context
        updated_context = self._merge_context(context, result.extracted_info)
        if result.next_stage:
            updated_context["stage"] = result.next_stage
        updated_context["completeness"] = self._calculate_completeness(updated_context)

        conv_session.collected_context = updated_context

        # Build metadata
        metadata = {
            "quick_replies": result.quick_replies,
            "suggestions": result.suggestions,
        }
        
        # Include decision frame if we're at frame stage
        if result.next_stage == "frame" or updated_context.get("stage") == "frame":
            metadata["decision_frame"] = result.decision_frame or updated_context.get("decision_frame")
            metadata["show_frame_confirmation"] = True

        system_msg = ConversationMessage(
            session_id=session_id,
            role="system",
            content=result.next_question,
            message_metadata=metadata,
        )
        session.add(system_msg)
        await session.commit()

        return ConversationResponse(
            session_id=conv_session.id,
            message=self._to_message_response(system_msg),
            context=CollectedContext(**self._clean_context_for_validation(updated_context)),
            can_generate=updated_context.get("completeness", 0) >= 80,
        )

    async def _classify_decision(
        self, 
        question: str, 
        context: str | None
    ) -> dict[str, Any]:
        """Automatically classify the decision type."""
        
        system_instruction = """You are a decision analysis expert. Classify this decision.

Analyze the decision and return JSON with:
{
  "decision_type": "strategic|emotional|financial|creative|operational|ethical",
  "stakes": "low|medium|high|critical",
  "decision_mode": "comparison|prediction|prioritization|go_no_go",
  "complexity": "simple|moderate|complex",
  "recommended_framework": "pros_cons|swot|decision_matrix|risk_analysis|scenario_planning",
  "domain": "career|business|personal|financial|technical|relationship|health"
}

Be precise. This classification determines how we help the user."""

        payload = {
            "question": question,
            "additional_context": context or "",
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return result
        except Exception as e:
            logger.error(f"Decision classification failed: {e}")
            return {
                "decision_type": "strategic",
                "stakes": "medium",
                "decision_mode": "go_no_go",
                "complexity": "moderate",
                "recommended_framework": "pros_cons",
                "domain": "personal",
            }

    async def _generate_clarifying_questions(
        self,
        question: str,
        context: str | None,
        classification: dict[str, Any],
    ) -> list[str]:
        """Generate 3-7 high-leverage clarifying questions."""
        
        system_instruction = """You are a decision coach. Generate clarifying questions.

Based on the decision and its classification, generate 3-7 HIGH-LEVERAGE questions.

Good questions reduce ambiguity around:
- Objective: What does success look like?
- Constraints: What limits exist (time, money, resources)?
- Alternatives: What options are being considered?
- Timeline: When does this need to be decided?
- Risk tolerance: How much downside is acceptable?
- Non-negotiables: What must be true regardless?
- Missing facts: What information would change the decision?

RULES:
- Questions must be specific to THIS decision
- No generic questions
- Each question should reveal something critical
- Order from most important to least important

Return JSON:
{
  "questions": ["question1", "question2", ...],
  "reasoning": "brief explanation of why these questions matter"
}"""

        payload = {
            "question": question,
            "additional_context": context or "",
            "classification": classification,
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return result.get("questions", [])[:7]  # Max 7 questions
        except Exception as e:
            logger.error(f"Clarifying questions generation failed: {e}")
            return [
                "What would success look like for you?",
                "What constraints are you working with (time, budget, etc.)?",
                "What options are you considering?",
                "What's your biggest concern about this decision?",
            ]

    async def _process_clarification(
        self,
        context: dict[str, Any],
        user_message: str,
    ) -> LLMConversationResult:
        """Process clarification stage - ask questions, collect answers."""
        
        questions_asked = context.get("questions_asked", 0)
        pending_questions = context.get("pending_questions", [])
        clarifications = context.get("clarifications", {})
        
        # Store the answer to the previous question
        if questions_asked > 0 and pending_questions:
            prev_question_idx = questions_asked - 1
            if prev_question_idx < len(context.get("pending_questions", [])):
                original_questions = context.get("pending_questions", [])
                if prev_question_idx < len(original_questions):
                    clarifications[original_questions[prev_question_idx]] = user_message
        
        questions_asked += 1
        
        # Check if we should move to frame stage
        # Move on after 3-7 questions OR if user signals they're done
        done_signals = ["that's all", "nothing else", "let's proceed", "ready", "done", "move on", "next"]
        user_done = any(signal in user_message.lower() for signal in done_signals)
        
        if questions_asked >= len(pending_questions) or questions_asked >= 7 or user_done:
            # Generate decision frame
            frame = await self._generate_decision_frame(context, clarifications)
            
            return LLMConversationResult(
                extracted_info={
                    "clarifications": clarifications,
                    "questions_asked": questions_asked,
                    "decision_frame": frame,
                },
                next_question=self._format_frame_confirmation(frame),
                quick_replies=["Looks good, proceed", "I'd like to adjust something"],
                stage_complete=True,
                next_stage="frame",
                decision_frame=frame,
            )
        
        # Ask next question
        next_question = pending_questions[questions_asked] if questions_asked < len(pending_questions) else "Anything else I should know?"
        
        return LLMConversationResult(
            extracted_info={
                "clarifications": clarifications,
                "questions_asked": questions_asked,
            },
            next_question=next_question,
            quick_replies=None,
            stage_complete=False,
            next_stage=None,
        )

    async def _generate_decision_frame(
        self,
        context: dict[str, Any],
        clarifications: dict[str, str],
    ) -> dict[str, Any]:
        """Generate a clean decision frame from collected information."""
        
        system_instruction = """You are a decision analyst. Create a clear decision frame.

Based on the original question and clarifications, create a structured decision frame.

Return JSON:
{
  "decision_statement": "Clear, specific statement of what's being decided",
  "alternatives": ["Option 1", "Option 2", ...],
  "primary_objective": "What success looks like",
  "constraints": ["Constraint 1", "Constraint 2", ...],
  "evaluation_criteria": ["Criterion 1", "Criterion 2", ...],
  "timeline": "When decision needs to be made"
}

RULES:
- Decision statement must be specific and actionable
- List ALL alternatives being considered (including "do nothing" if applicable)
- Constraints should be real limitations, not preferences
- Evaluation criteria should be measurable where possible"""

        payload = {
            "original_question": context.get("raw_question", ""),
            "additional_context": context.get("additional_context", ""),
            "classification": context.get("classification", {}),
            "clarifications": clarifications,
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return result
        except Exception as e:
            logger.error(f"Decision frame generation failed: {e}")
            return {
                "decision_statement": context.get("raw_question", ""),
                "alternatives": [],
                "primary_objective": "",
                "constraints": [],
                "evaluation_criteria": [],
                "timeline": "",
            }

    def _format_frame_confirmation(self, frame: dict[str, Any]) -> str:
        """Format decision frame for user confirmation."""
        
        parts = ["Here's how I understand your decision:\n"]
        
        if frame.get("decision_statement"):
            parts.append(f"**Decision:** {frame['decision_statement']}")
        
        if frame.get("alternatives"):
            parts.append(f"\n**Alternatives:** {', '.join(frame['alternatives'])}")
        
        if frame.get("primary_objective"):
            parts.append(f"\n**Primary objective:** {frame['primary_objective']}")
        
        if frame.get("constraints"):
            parts.append(f"\n**Constraints:** {', '.join(frame['constraints'])}")
        
        if frame.get("evaluation_criteria"):
            parts.append(f"\n**Evaluation criteria:** {', '.join(frame['evaluation_criteria'])}")
        
        if frame.get("timeline"):
            parts.append(f"\n**Timeline:** {frame['timeline']}")
        
        parts.append("\n\nDoes this capture your decision correctly?")
        
        return "\n".join(parts)

    async def _process_frame_confirmation(
        self,
        context: dict[str, Any],
        user_message: str,
        session: AsyncSession | None = None,
        workspace_id: str | None = None,
    ) -> LLMConversationResult:
        """Process frame confirmation - user confirms or adjusts."""
        
        # Check if user confirms
        confirm_signals = ["yes", "looks good", "correct", "proceed", "that's right", "perfect", "good"]
        user_confirms = any(signal in user_message.lower() for signal in confirm_signals)
        
        if user_confirms:
            # Check for relevant expert templates before generating agents
            suggested_templates = []
            if session and workspace_id:
                suggested_templates = await self._get_matching_templates(
                    session, workspace_id, context
                )

            # Generate agents (mixing templates with auto-generated)
            agents = await self._generate_expert_agents(context)

            # Build suggestion metadata for templates
            suggestions = None
            if suggested_templates:
                suggestions = {
                    "expert_templates": suggested_templates,
                    "message": f"You have {len(suggested_templates)} proven expert(s) for this type of decision.",
                }
            
            return LLMConversationResult(
                extracted_info={
                    "frame_confirmed": True,
                    "agents": agents,
                },
                next_question=self._format_agent_confirmation(agents),
                quick_replies=["Start the debate", "Adjust agents"],
                stage_complete=True,
                next_stage="agents",
                suggestions=suggestions,
            )
        else:
            # User wants to adjust - use LLM to understand what they want to change
            adjustment = await self._process_frame_adjustment(context, user_message)
            return adjustment

    async def _process_frame_adjustment(
        self,
        context: dict[str, Any],
        user_message: str,
    ) -> LLMConversationResult:
        """Process user's adjustment to the decision frame."""
        
        system_instruction = """You are a decision analyst helping refine a decision frame.

The user wants to adjust the decision frame. Understand their feedback and update the frame.

Return JSON:
{
  "updated_frame": {
    "decision_statement": "...",
    "alternatives": [...],
    "primary_objective": "...",
    "constraints": [...],
    "evaluation_criteria": [...],
    "timeline": "..."
  },
  "acknowledgment": "Brief acknowledgment of the change",
  "needs_more_info": false
}"""

        payload = {
            "current_frame": context.get("decision_frame", {}),
            "user_feedback": user_message,
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            
            updated_frame = result.get("updated_frame", context.get("decision_frame", {}))
            acknowledgment = result.get("acknowledgment", "I've updated the frame.")
            
            return LLMConversationResult(
                extracted_info={
                    "decision_frame": updated_frame,
                },
                next_question=f"{acknowledgment}\n\n{self._format_frame_confirmation(updated_frame)}",
                quick_replies=["Looks good, proceed", "I'd like to adjust more"],
                stage_complete=False,
                next_stage=None,
                decision_frame=updated_frame,
            )
        except Exception as e:
            logger.error(f"Frame adjustment failed: {e}")
            return LLMConversationResult(
                extracted_info={},
                next_question="I didn't quite understand. Could you clarify what you'd like to change about the decision frame?",
                quick_replies=None,
                stage_complete=False,
                next_stage=None,
            )

    async def _generate_expert_agents(
        self,
        context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Generate 3-5 expert agents that create real tension."""
        
        system_instruction = """You are designing a multi-agent debate. Create expert agents.

RULES:
1. Create exactly 3-5 agents (minimum for tension, not overwhelming)
2. Each agent represents a REAL decision lens, not a personality
3. Agents should DISAGREE - create productive tension
4. Use role-based names with "Agent" suffix (e.g., "Risk Analyst Agent")
5. NO real names, NO fictional characters, NO titles like "Dr."

Standard roles to consider:
- Optimist/Upside Advocate - sees opportunity
- Skeptic/Risk Critic - sees dangers
- Domain Specialist - has deep expertise
- Pragmatist/Operator - focuses on execution
- Synthesizer/Decider - weighs tradeoffs

Adapt roles to the specific decision domain.

Return JSON:
{
  "agents": [
    {
      "name": "Role Name Agent",
      "role": "Clear description of perspective",
      "stance": "brief|pro|con|neutral",
      "key_focus": "What this agent will emphasize"
    }
  ],
  "reasoning": "Why these agents create productive tension"
}"""

        payload = {
            "decision_frame": context.get("decision_frame", {}),
            "classification": context.get("classification", {}),
            "raw_question": context.get("raw_question", ""),
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            agents = result.get("agents", [])
            # Ensure we have 3-5 agents
            if len(agents) < 3:
                agents = self._get_default_agents()
            elif len(agents) > 5:
                agents = agents[:5]
            return agents
        except Exception as e:
            logger.error(f"Agent generation failed: {e}")
            return self._get_default_agents()

    async def _get_matching_templates(
        self,
        session: AsyncSession,
        workspace_id: str,
        context: dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Find workspace expert templates matching the current decision domain."""
        try:
            classification = context.get("classification", {})
            domain = classification.get("domain", "") or classification.get("decision_type", "")
            if not domain:
                return []

            from app.schemas import VALID_DECISION_DOMAINS
            if domain not in VALID_DECISION_DOMAINS:
                return []

            results = await session.scalars(
                select(ExpertTemplate)
                .where(
                    ExpertTemplate.workspace_id == workspace_id,
                    ExpertTemplate.is_deleted == False,  # noqa: E712
                    ExpertTemplate.decision_domains.contains([domain]),
                )
                .order_by(ExpertTemplate.helpful_count.desc(), ExpertTemplate.times_used.desc())
                .limit(3)
            )
            templates = list(results.all())
            return [
                {
                    "id": t.id,
                    "name": t.name,
                    "role": t.role,
                    "purpose": t.purpose,
                    "times_used": t.times_used,
                    "helpful_rate": round(t.helpful_count / max(t.total_ratings, 1) * 100),
                    "total_ratings": t.total_ratings,
                }
                for t in templates
            ]
        except Exception as e:
            logger.warning("Failed to fetch expert templates: %s", e)
            return []

    def _get_default_agents(self) -> list[dict[str, Any]]:
        """Return default agents if generation fails."""
        return [
            {"name": "Opportunity Advocate Agent", "role": "Focuses on upside potential and opportunities", "stance": "pro", "key_focus": "Benefits and growth potential"},
            {"name": "Risk Analyst Agent", "role": "Identifies risks and potential downsides", "stance": "con", "key_focus": "Risks and mitigation"},
            {"name": "Pragmatist Agent", "role": "Focuses on practical execution", "stance": "neutral", "key_focus": "Feasibility and implementation"},
            {"name": "Decision Synthesizer Agent", "role": "Weighs all perspectives for final recommendation", "stance": "neutral", "key_focus": "Balanced analysis and recommendation"},
        ]

    def _format_agent_confirmation(self, agents: list[dict[str, Any]]) -> str:
        """Format agents for user confirmation."""
        
        parts = ["I've assembled a panel of experts to debate this decision:\n"]
        
        for agent in agents:
            name = agent.get("name", "Unknown Agent")
            role = agent.get("role", "")
            stance = agent.get("stance", "")
            focus = agent.get("key_focus", "")
            
            stance_indicator = ""
            if stance == "pro":
                stance_indicator = " 🟢"
            elif stance == "con":
                stance_indicator = " 🔴"
            else:
                stance_indicator = " ⚖️"
            
            parts.append(f"\n**{name}**{stance_indicator}")
            if role:
                parts.append(f"  {role}")
            if focus:
                parts.append(f"  *Focus: {focus}*")
        
        parts.append("\n\nReady to start the debate?")
        
        return "\n".join(parts)

    async def _process_agent_confirmation(
        self,
        context: dict[str, Any],
        user_message: str,
    ) -> LLMConversationResult:
        """Process agent confirmation - user confirms or adjusts."""
        
        confirm_signals = ["yes", "start", "proceed", "ready", "let's go", "looks good", "perfect"]
        user_confirms = any(signal in user_message.lower() for signal in confirm_signals)
        
        if user_confirms:
            return LLMConversationResult(
                extracted_info={
                    "agents_confirmed": True,
                },
                next_question="Everything is set. Click 'Generate Project' to start the debate and get your recommendation.",
                quick_replies=None,
                stage_complete=True,
                next_stage="ready",
            )
        else:
            # User wants to adjust agents
            return await self._process_agent_adjustment(context, user_message)

    async def _process_agent_adjustment(
        self,
        context: dict[str, Any],
        user_message: str,
    ) -> LLMConversationResult:
        """Process user's adjustment to agents."""
        
        system_instruction = """You are adjusting the debate agents based on user feedback.

The user wants to change the agent panel. Understand their request and update.

RULES:
- Maintain 3-5 agents
- Use role-based names with "Agent" suffix
- Ensure tension remains (not all agreeing)

Return JSON:
{
  "agents": [...updated agent list...],
  "acknowledgment": "Brief acknowledgment of the change"
}"""

        payload = {
            "current_agents": context.get("agents", []),
            "user_feedback": user_message,
            "decision_frame": context.get("decision_frame", {}),
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            
            agents = result.get("agents", context.get("agents", []))
            acknowledgment = result.get("acknowledgment", "I've updated the agents.")
            
            return LLMConversationResult(
                extracted_info={
                    "agents": agents,
                },
                next_question=f"{acknowledgment}\n\n{self._format_agent_confirmation(agents)}",
                quick_replies=["Start the debate", "Adjust more"],
                stage_complete=False,
                next_stage=None,
            )
        except Exception as e:
            logger.error(f"Agent adjustment failed: {e}")
            return LLMConversationResult(
                extracted_info={},
                next_question="I didn't quite understand. Could you clarify how you'd like to change the agents?",
                quick_replies=None,
                stage_complete=False,
                next_stage=None,
            )

    async def _process_ready_stage(
        self,
        context: dict[str, Any],
        user_message: str,
    ) -> LLMConversationResult:
        """Handle messages when ready to generate."""
        
        return LLMConversationResult(
            extracted_info={},
            next_question="Your debate is ready to run. Click 'Generate Project' to start and get your recommendation.",
            quick_replies=None,
            stage_complete=True,
            next_stage="ready",
        )

    async def update_conversation(
        self,
        session: AsyncSession,
        workspace_id: str,
        session_id: str,
        title: str | None = None,
    ) -> dict:
        """Update conversation title."""
        conv_session = await session.scalar(
            select(ConversationSession).where(
                ConversationSession.id == session_id,
                ConversationSession.workspace_id == workspace_id,
            )
        )
        if not conv_session:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        
        if title is not None:
            conv_session.collected_context = conv_session.collected_context or {}
            conv_session.collected_context["title"] = title
        
        await session.commit()
        return {"status": "updated", "session_id": session_id}

    async def delete_conversation(
        self,
        session: AsyncSession,
        workspace_id: str,
        session_id: str,
    ) -> None:
        """Delete a conversation and all its messages."""
        conv_session = await session.scalar(
            select(ConversationSession).where(
                ConversationSession.id == session_id,
                ConversationSession.workspace_id == workspace_id,
            )
        )
        if not conv_session:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
        
        # Delete all messages first
        messages = await session.execute(
            select(ConversationMessage).where(ConversationMessage.session_id == session_id)
        )
        for msg in messages.scalars():
            await session.delete(msg)
        
        # Delete the session
        await session.delete(conv_session)
        await session.commit()

    async def list_in_progress_sessions(
        self,
        session: AsyncSession,
        workspace_id: str,
    ) -> list[dict]:
        """Return all in-progress items: active conversations, projects awaiting run, queued/running runs."""
        from app.models import DebateRun, Project

        results = []

        # 1. Active conversation sessions (user still chatting)
        conv_sessions = await session.scalars(
            select(ConversationSession)
            .where(
                ConversationSession.workspace_id == workspace_id,
                ConversationSession.status == "in_progress",
            )
            .order_by(ConversationSession.updated_at.desc())
        )
        for cs in conv_sessions.all():
            context = cs.collected_context or {}
            raw_q = context.get("raw_question") or ""
            title = raw_q[:80] if raw_q else "Untitled conversation"
            results.append({
                "id": cs.id,
                "type": "conversation",
                "title": title,
                "stage": context.get("stage", "entry"),
                "completeness": context.get("completeness", 0),
                "updated_at": cs.updated_at.isoformat() if cs.updated_at else None,
                "status": "in_progress",
                "project_id": cs.project_id,
            })

        # 2. Projects generated but with no active/completed run (awaiting debate launch)
        runs_subquery = select(DebateRun.project_id).where(
            DebateRun.status.in_(["queued", "running", "completed"])
        )
        projects = await session.scalars(
            select(Project)
            .where(
                Project.workspace_id == workspace_id,
                ~Project.id.in_(runs_subquery),
            )
            .order_by(Project.updated_at.desc())
        )
        for p in projects.all():
            results.append({
                "id": p.id,
                "type": "project",
                "title": p.title,
                "stage": "ready_to_run",
                "completeness": 100,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                "status": "awaiting_run",
                "project_id": p.id,
            })

        # 3. Queued and running debate runs
        runs = await session.execute(
            select(DebateRun, Project)
            .join(Project, DebateRun.project_id == Project.id)
            .where(
                DebateRun.workspace_id == workspace_id,
                DebateRun.status.in_(["queued", "running"]),
            )
            .order_by(DebateRun.created_at.desc())
        )
        for run, project in runs.all():
            results.append({
                "id": run.id,
                "type": "run",
                "title": project.title,
                "stage": run.status,
                "completeness": 60 if run.status == "running" else 20,
                "updated_at": run.updated_at.isoformat() if run.updated_at else None,
                "status": run.status,
                "project_id": run.project_id,
                "run_id": run.id,
            })

        # Sort by updated_at descending, nulls last
        results.sort(key=lambda x: x["updated_at"] or "", reverse=True)
        return results

    async def get_conversation(
        self,
        session: AsyncSession,
        session_id: str,
    ) -> ConversationHistoryResponse:
        """Get conversation history."""
        
        conv_session = await session.scalar(
            select(ConversationSession).where(ConversationSession.id == session_id)
        )
        if not conv_session:
            raise ValueError("Conversation session not found")

        messages = await session.scalars(
            select(ConversationMessage)
            .where(ConversationMessage.session_id == session_id)
            .order_by(ConversationMessage.created_at)
        )

        context = conv_session.collected_context or {}

        return ConversationHistoryResponse(
            session_id=conv_session.id,
            status=conv_session.status,
            messages=[self._to_message_response(msg) for msg in messages],
            context=CollectedContext(**self._clean_context_for_validation(context)),
            can_generate=context.get("completeness", 0) >= 80,
        )

    async def generate_project_from_conversation(
        self,
        session: AsyncSession,
        session_id: str,
        workspace_id: str,
        user_id: str,
    ) -> Any:
        """Generate project from conversation context."""
        from app.schemas import ProjectGenerationRequest
        
        conv_session = await session.scalar(
            select(ConversationSession).where(ConversationSession.id == session_id)
        )
        if not conv_session:
            raise ValueError("Conversation session not found")

        context = conv_session.collected_context or {}
        
        if context.get("completeness", 0) < 80:
            raise ValueError("Conversation not complete enough to generate project")

        prompt = self._build_prompt_from_context(context)
        clarification_answers = self._build_clarification_answers(context)

        request = ProjectGenerationRequest(
            prompt=prompt,
            clarification_answers=clarification_answers,
            force_generate_with_assumptions=True,
        )

        project = await self.project_service.generate_project(
            session=session,
            workspace_id=workspace_id,
            user_id=user_id,
            request=request,
        )

        conv_session.project_id = project.project_id
        conv_session.status = "completed"
        await session.commit()

        return project

    def _build_prompt_from_context(self, context: dict[str, Any]) -> str:
        """Build project prompt from collected context."""
        
        parts = []
        
        # Decision frame
        frame = context.get("decision_frame", {})
        if frame.get("decision_statement"):
            parts.append(f"Decision: {frame['decision_statement']}")
        
        if frame.get("alternatives"):
            parts.append(f"Alternatives: {', '.join(frame['alternatives'])}")
        
        if frame.get("primary_objective"):
            parts.append(f"Objective: {frame['primary_objective']}")
        
        if frame.get("constraints"):
            parts.append(f"Constraints: {', '.join(frame['constraints'])}")
        
        if frame.get("evaluation_criteria"):
            parts.append(f"Criteria: {', '.join(frame['evaluation_criteria'])}")
        
        # Classification
        classification = context.get("classification", {})
        if classification.get("decision_type"):
            parts.append(f"Type: {classification['decision_type']} decision")
        
        return "\n".join(parts) if parts else context.get("raw_question", "")

    def _build_clarification_answers(self, context: dict[str, Any]) -> dict[str, str]:
        """Build clarification answers from context."""
        return context.get("clarifications", {})

    def _merge_context(
        self,
        existing: dict[str, Any],
        new_info: dict[str, Any],
    ) -> dict[str, Any]:
        """Merge new information into existing context."""
        
        merged = existing.copy()
        
        for key, value in new_info.items():
            if value is None:
                continue
            if isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = {**merged.get(key, {}), **value}
            elif isinstance(value, list) and isinstance(merged.get(key), list):
                merged[key] = merged.get(key, []) + [v for v in value if v not in merged.get(key, [])]
            else:
                merged[key] = value
        
        return merged

    def _calculate_completeness(self, context: dict[str, Any]) -> int:
        """Calculate conversation completeness percentage."""
        
        stage = context.get("stage", "entry")
        
        stage_weights = {
            "entry": 10,
            "clarification": 30,
            "frame": 60,
            "agents": 80,
            "ready": 100,
        }
        
        base = stage_weights.get(stage, 0)
        
        # Bonus for confirmed frame
        if context.get("frame_confirmed"):
            base = max(base, 70)
        
        # Bonus for confirmed agents
        if context.get("agents_confirmed"):
            base = max(base, 90)
        
        return min(base, 100)

    def _clean_context_for_validation(self, context: dict[str, Any]) -> dict[str, Any]:
        """Clean context for Pydantic validation."""
        
        cleaned = {}
        
        # Handle simple fields
        cleaned["raw_question"] = str(context.get("raw_question", ""))
        cleaned["additional_context"] = str(context.get("additional_context", ""))
        cleaned["stage"] = str(context.get("stage", "entry"))
        cleaned["completeness"] = int(context.get("completeness", 0))
        cleaned["questions_asked"] = int(context.get("questions_asked", 0))
        cleaned["frame_confirmed"] = bool(context.get("frame_confirmed", False))
        
        # Handle classification
        classification = context.get("classification", {})
        if isinstance(classification, dict):
            cleaned["classification"] = {
                "decision_type": str(classification.get("decision_type", "")),
                "stakes": str(classification.get("stakes", "")),
                "decision_mode": str(classification.get("decision_mode", "")),
                "complexity": str(classification.get("complexity", "")),
                "recommended_framework": str(classification.get("recommended_framework", "")),
            }
        else:
            cleaned["classification"] = {}
        
        # Handle clarifications
        clarifications = context.get("clarifications", {})
        if isinstance(clarifications, dict):
            cleaned["clarifications"] = {str(k): str(v) for k, v in clarifications.items()}
        else:
            cleaned["clarifications"] = {}
        
        # Handle pending questions
        pending = context.get("pending_questions", [])
        if isinstance(pending, list):
            cleaned["pending_questions"] = [str(q) for q in pending]
        else:
            cleaned["pending_questions"] = []
        
        # Handle decision frame
        frame = context.get("decision_frame", {})
        if isinstance(frame, dict):
            cleaned["decision_frame"] = {
                "decision_statement": str(frame.get("decision_statement", "")),
                "alternatives": [str(a) for a in frame.get("alternatives", []) if a],
                "primary_objective": str(frame.get("primary_objective", "")),
                "constraints": [str(c) for c in frame.get("constraints", []) if c],
                "evaluation_criteria": [str(e) for e in frame.get("evaluation_criteria", []) if e],
                "timeline": str(frame.get("timeline", "")),
            }
        else:
            cleaned["decision_frame"] = {}
        
        # Handle agents
        agents = context.get("agents", [])
        if isinstance(agents, list):
            cleaned["agents"] = []
            for agent in agents:
                if isinstance(agent, dict):
                    cleaned["agents"].append({
                        "name": str(agent.get("name", "")),
                        "role": str(agent.get("role", "")),
                        "stance": str(agent.get("stance", "")),
                        "key_focus": str(agent.get("key_focus", "")),
                    })
        else:
            cleaned["agents"] = []
        
        return cleaned

    def _to_message_response(self, msg: ConversationMessage) -> ConversationMessageResponse:
        """Convert message to response."""
        
        metadata = None
        if msg.message_metadata:
            metadata = ConversationMessageMetadata(
                quick_replies=msg.message_metadata.get("quick_replies"),
                suggestions=msg.message_metadata.get("suggestions"),
                decision_frame=msg.message_metadata.get("decision_frame"),
                show_frame_confirmation=msg.message_metadata.get("show_frame_confirmation", False),
            )
        
        return ConversationMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            metadata=metadata,
            created_at=msg.created_at,
        )
