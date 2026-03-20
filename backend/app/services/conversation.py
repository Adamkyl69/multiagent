import json
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConversationMessage, ConversationSession, Project
from app.schemas_conversation import (
    CollectedContext,
    ConversationHistoryResponse,
    ConversationMessageMetadata,
    ConversationMessageResponse,
    ConversationResponse,
    LLMConversationResult,
)
from app.services.llm import LLMService
from app.services.projects import ProjectService


class ConversationService:
    def __init__(self, llm_service: LLMService, project_service: ProjectService):
        self.llm = llm_service
        self.project_service = project_service

    async def start_conversation(
        self,
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        initial_message: str,
    ) -> ConversationResponse:
        conv_session = ConversationSession(
            workspace_id=workspace_id,
            user_id=user_id,
            status="in_progress",
            collected_context={
                "stage": "topic",
                "completeness": 0,
            },
        )
        session.add(conv_session)
        await session.flush()

        user_msg = ConversationMessage(
            session_id=conv_session.id,
            role="user",
            content=initial_message,
        )
        session.add(user_msg)

        llm_result = await self._process_stage(
            stage="topic",
            context={},
            user_message=initial_message,
        )

        updated_context = self._merge_context({}, llm_result.extracted_info)
        updated_context["stage"] = llm_result.next_stage or "decision_makers"
        updated_context["completeness"] = self._calculate_completeness(updated_context)

        conv_session.collected_context = updated_context

        system_msg = ConversationMessage(
            session_id=conv_session.id,
            role="system",
            content=llm_result.next_question,
            message_metadata={
                "quick_replies": llm_result.quick_replies,
                "suggestions": llm_result.suggestions,
            },
        )
        session.add(system_msg)
        await session.commit()

        return ConversationResponse(
            session_id=conv_session.id,
            message=self._to_message_response(system_msg),
            context=CollectedContext(**self._clean_context_for_validation(updated_context)),
            can_generate=updated_context.get("completeness", 0) >= 100,
        )

    async def send_message(
        self,
        session: AsyncSession,
        session_id: str,
        user_message: str,
    ) -> ConversationResponse:
        conv_session = await session.scalar(
            select(ConversationSession).where(ConversationSession.id == session_id)
        )
        if not conv_session:
            raise ValueError("Conversation session not found")

        user_msg = ConversationMessage(
            session_id=session_id,
            role="user",
            content=user_message,
        )
        session.add(user_msg)

        context = conv_session.collected_context or {}
        current_stage = context.get("stage", "topic")

        llm_result = await self._process_stage(
            stage=current_stage,
            context=context,
            user_message=user_message,
        )

        updated_context = self._merge_context(context, llm_result.extracted_info)
        
        # Track stage progression
        next_stage = llm_result.next_stage if llm_result.stage_complete else current_stage
        updated_context = self._update_stage_tracking(updated_context, current_stage, next_stage)
        
        if llm_result.stage_complete and llm_result.next_stage:
            updated_context["stage"] = llm_result.next_stage
        
        updated_context["completeness"] = self._calculate_completeness(updated_context)

        conv_session.collected_context = updated_context

        system_msg = ConversationMessage(
            session_id=session_id,
            role="system",
            content=llm_result.next_question,
            message_metadata={
                "quick_replies": llm_result.quick_replies,
                "suggestions": llm_result.suggestions,
            },
        )
        session.add(system_msg)
        await session.commit()

        return ConversationResponse(
            session_id=session_id,
            message=self._to_message_response(system_msg),
            context=CollectedContext(**self._clean_context_for_validation(updated_context)),
            can_generate=updated_context.get("completeness", 0) >= 100,
        )

    async def get_conversation(
        self,
        session: AsyncSession,
        session_id: str,
    ) -> ConversationHistoryResponse:
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
            session_id=session_id,
            status=conv_session.status,
            messages=[self._to_message_response(msg) for msg in messages],
            context=CollectedContext(**self._clean_context_for_validation(context)),
            can_generate=context.get("completeness", 0) >= 100,
        )

    async def generate_project_from_conversation(
        self,
        session: AsyncSession,
        session_id: str,
        workspace_id: str,
        user_id: str,
    ) -> Any:
        conv_session = await session.scalar(
            select(ConversationSession).where(ConversationSession.id == session_id)
        )
        if not conv_session:
            raise ValueError("Conversation session not found")

        context = conv_session.collected_context or {}
        
        if context.get("completeness", 0) < 100:
            raise ValueError("Conversation not complete enough to generate project")

        prompt = self._build_prompt_from_context(context)
        clarification_answers = self._build_clarification_answers(context)

        project = await self.project_service.generate_project(
            session=session,
            workspace_id=workspace_id,
            user_id=user_id,
            prompt=prompt,
            clarification_answers=clarification_answers,
        )

        conv_session.project_id = project.id
        conv_session.status = "completed"
        await session.commit()

        return project

    async def _process_stage(
        self,
        stage: str,
        context: dict[str, Any],
        user_message: str,
    ) -> LLMConversationResult:
        # Track how many messages in current stage to avoid loops
        stage_message_count = context.get("_stage_message_count", 0) + 1
        
        # Detect decline signals
        decline_signals = ["no", "none", "unrelated", "not applicable", "n/a", "skip", "not relevant"]
        user_declined = any(signal in user_message.lower() for signal in decline_signals)
        
        stage_prompts = {
            "topic": self._get_topic_prompt(),
            "decision_makers": self._get_decision_makers_prompt(),
            "constraints": self._get_constraints_prompt(),
            "agents": self._get_agents_prompt(),
            "flow": self._get_flow_prompt(),
            "review": self._get_review_prompt(),
        }

        system_instruction = stage_prompts.get(stage, stage_prompts["topic"])
        
        # Add context about stage progress to help LLM decide
        payload = {
            "stage": stage,
            "collected_context": context,
            "user_message": user_message,
            "stage_message_count": stage_message_count,
            "user_declined_info": user_declined,
        }

        try:
            result = await self.llm._generate_json(
                model="gemini-2.5-flash-lite",
                system_instruction=system_instruction,
                payload=payload,
            )
            return LLMConversationResult(**result)
        except Exception:
            return LLMConversationResult(
                next_question=self._get_fallback_question(stage, context),
                quick_replies=self._get_fallback_quick_replies(stage),
            )

    def _get_topic_prompt(self) -> str:
        return """You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: Topic Identification

Extract the core decision or topic from the user's message. Identify:
- The main decision or question to debate
- The domain (business, technical, personal, etc.)
- Any initial context provided

Then ask: "Who will be making this decision?"

Respond in JSON format:
{
  "extracted_info": {
    "topic": "string describing the decision/topic",
    "domain": "business|technical|personal|other"
  },
  "next_question": "Who will be making this decision?",
  "quick_replies": ["CEO", "Board", "Team", "Individual"],
  "stage_complete": true,
  "next_stage": "decision_makers"
}"""

    def _get_decision_makers_prompt(self) -> str:
        return """You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: Decision Makers

Extract information about who will be making the decision:
- Decision maker roles (CEO, team, individual, board, etc.)
- Organizational context if mentioned

Then ask: "What's driving this decision? Any specific goals or constraints?"

Respond in JSON format:
{
  "extracted_info": {
    "decision_makers": ["role1", "role2"]
  },
  "next_question": "What's driving this decision? Any specific goals or constraints?",
  "quick_replies": null,
  "stage_complete": true,
  "next_stage": "constraints"
}"""

    def _get_constraints_prompt(self) -> str:
        return """You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: Constraints & Goals

IMPORTANT RULES:
1. If user says "no", "none", "unrelated", "not applicable", or similar - ACCEPT IT and move on
2. Don't keep asking for the same information repeatedly
3. Extract whatever the user provides, even if minimal
4. After 2-3 exchanges in this stage, move to agent selection even if you don't have all details

Extract what you can:
- Budget (if mentioned, otherwise skip)
- Timeline (if mentioned, otherwise skip)
- Resources (if mentioned, otherwise skip)
- Success criteria or goals (if mentioned, otherwise skip)
- Key concerns (if mentioned, otherwise skip)

Decision logic:
- If user has provided ANY goals/concerns OR explicitly declined to provide constraints → move to agents
- If user says constraints are "unrelated" or "not applicable" → move to agents
- If this is the 3rd+ message in this stage → move to agents regardless

Respond in JSON format:
{
  "extracted_info": {
    "goals": ["goal1", "goal2"],
    "constraints": {}
  },
  "next_question": "Based on your topic about [topic], I'll suggest some expert agents. Ready to see recommendations?",
  "quick_replies": ["Yes, suggest agents", "I'll specify my own"],
  "stage_complete": true,
  "next_stage": "agents"
}"""

    def _get_agents_prompt(self) -> str:
        return """You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: Agent Selection

IMPORTANT: Look at the collected context (topic, goals, concerns) and suggest 3-5 agents that are SPECIFICALLY relevant to that topic.

For example:
- If topic is about "US foreign policy" → suggest International Relations Expert, Geopolitical Analyst, Trade Policy Specialist, etc.
- If topic is about "UAE market expansion" → suggest Market Research Expert, Financial Analyst, Regulatory Specialist, etc.
- If topic is about "product pricing" → suggest Pricing Strategist, Market Analyst, Financial Analyst, etc.

DO NOT suggest generic agents. Tailor them to the specific topic and domain.

Extract user's response:
- If they accept suggestions → mark agents as confirmed
- If they want to customize → note their preferences
- If they add specific agents → add them to the list

Respond in JSON format:
{
  "extracted_info": {
    "agents": [
      {"name": "Specific Agent Name", "role": "Clear description", "confirmed": true}
    ]
  },
  "next_question": "Great! I've added [X] agents. How many debate rounds should we run?",
  "quick_replies": ["2 rounds", "3 rounds", "4 rounds"],
  "stage_complete": true,
  "next_stage": "flow"
}"""

    def _get_flow_prompt(self) -> str:
        return """You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: Flow Configuration

Extract the number of debate rounds and any flow preferences.

Respond in JSON format:
{
  "extracted_info": {
    "flow": {
      "rounds": 3,
      "phases": ["opening_statements", "cross_examination", "synthesis"]
    }
  },
  "next_question": "Perfect! Here's your debate setup: [summary]. Ready to generate your project?",
  "quick_replies": ["Generate Project", "Refine Setup"],
  "stage_complete": true,
  "next_stage": "review"
}"""

    def _get_review_prompt(self) -> str:
        return """You are a debate project assistant helping users configure multi-agent debates.

CURRENT STAGE: Review

The user is reviewing the setup. If they want to generate, confirm.
If they want to refine, ask what to change.

Respond in JSON format:
{
  "extracted_info": {},
  "next_question": "What would you like to refine?",
  "quick_replies": ["Agents", "Flow", "Constraints", "Generate Now"],
  "stage_complete": false,
  "next_stage": null
}"""

    def _merge_context(self, existing: dict[str, Any], new_info: dict[str, Any]) -> dict[str, Any]:
        merged = existing.copy()
        for key, value in new_info.items():
            if key in merged and isinstance(merged[key], list) and isinstance(value, list):
                merged[key].extend(value)
            elif key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
                merged[key].update(value)
            else:
                merged[key] = value
        return merged
    
    def _update_stage_tracking(self, context: dict[str, Any], current_stage: str, next_stage: str | None) -> dict[str, Any]:
        """Track stage message count and reset when stage changes"""
        updated = context.copy()
        
        # If stage is changing, reset counter
        if next_stage and next_stage != current_stage:
            updated["_stage_message_count"] = 0
        else:
            # Increment counter for current stage
            updated["_stage_message_count"] = context.get("_stage_message_count", 0) + 1
        
        return updated

    def _clean_context_for_validation(self, context: dict[str, Any]) -> dict[str, Any]:
        """Clean context to avoid Pydantic validation errors"""
        cleaned = context.copy()
        
        # Clean constraints dict
        if "constraints" in cleaned and isinstance(cleaned["constraints"], dict):
            cleaned_constraints = {}
            for k, v in cleaned["constraints"].items():
                # Skip None values
                if v is None:
                    continue
                # Convert lists to comma-separated strings
                if isinstance(v, list):
                    cleaned_constraints[k] = ", ".join(str(item) for item in v)
                else:
                    cleaned_constraints[k] = v
            cleaned["constraints"] = cleaned_constraints
        
        # Remove internal tracking fields from validation
        cleaned.pop("_stage_message_count", None)
        
        return cleaned

    def _calculate_completeness(self, context: dict[str, Any]) -> int:
        score = 0
        if context.get("topic"):
            score += 15
        if context.get("decision_makers"):
            score += 15
        if context.get("constraints") or context.get("goals"):
            score += 20
        if context.get("agents") and len(context.get("agents", [])) >= 3:
            score += 30
        if context.get("flow") and context.get("flow", {}).get("rounds"):
            score += 20
        return min(score, 100)

    def _build_prompt_from_context(self, context: dict[str, Any]) -> str:
        topic = context.get("topic", "")
        decision_makers = ", ".join(context.get("decision_makers", []))
        constraints = "; ".join(f"{k}: {v}" for k, v in context.get("constraints", {}).items())
        goals = "; ".join(context.get("goals", []))
        
        prompt = f"Decision topic: {topic}\n"
        if decision_makers:
            prompt += f"Decision makers: {decision_makers}\n"
        if constraints:
            prompt += f"Constraints: {constraints}\n"
        if goals:
            prompt += f"Goals: {goals}\n"
        
        return prompt.strip()

    def _build_clarification_answers(self, context: dict[str, Any]) -> dict[str, str]:
        answers = {}
        if context.get("decision_makers"):
            answers["audience"] = ", ".join(context.get("decision_makers", []))
        if context.get("goals"):
            answers["goal"] = "; ".join(context.get("goals", []))
        if context.get("constraints"):
            constraints_str = "; ".join(f"{k}: {v}" for k, v in context.get("constraints", {}).items())
            answers["constraints"] = constraints_str
        return answers

    def _get_fallback_question(self, stage: str, context: dict[str, Any]) -> str:
        fallbacks = {
            "topic": "What decision or topic would you like to debate?",
            "decision_makers": "Who will be making this decision?",
            "constraints": "What constraints or goals are important for this decision?",
            "agents": "What type of experts should participate in this debate?",
            "flow": "How many debate rounds would you like?",
            "review": "Would you like to generate the project or refine the setup?",
        }
        return fallbacks.get(stage, "Could you provide more details?")

    def _get_fallback_quick_replies(self, stage: str) -> list[str] | None:
        fallbacks = {
            "topic": None,
            "decision_makers": ["CEO", "Board", "Team", "Individual"],
            "constraints": None,
            "agents": ["Suggest agents", "I'll specify"],
            "flow": ["2 rounds", "3 rounds", "4 rounds"],
            "review": ["Generate Project", "Refine Setup"],
        }
        return fallbacks.get(stage)

    def _to_message_response(self, msg: ConversationMessage) -> ConversationMessageResponse:
        metadata = None
        if msg.message_metadata:
            metadata = ConversationMessageMetadata(
                quick_replies=msg.message_metadata.get("quick_replies"),
                suggestions=msg.message_metadata.get("suggestions"),
            )
        
        return ConversationMessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            metadata=metadata,
            created_at=msg.created_at,
        )
