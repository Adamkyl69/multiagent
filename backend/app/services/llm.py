import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status

from app.config import settings
from app.schemas import AgentDraft, FlowStepDraft, ProjectVersionSnapshot, PromptIntakeAssessment

logger = logging.getLogger(__name__)


@dataclass
class LLMUsage:
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_estimate_cents: int


@dataclass
class ProjectGenerationResult:
    snapshot: ProjectVersionSnapshot
    usage: LLMUsage


@dataclass
class DebateTurnResult:
    content: str
    message_type: str
    usage: LLMUsage


@dataclass
class FinalSynthesisResult:
    summary: str
    verdict: str
    recommendations: list[str]
    raw_output: dict[str, Any]
    usage: LLMUsage


class LLMService:
    def __init__(self) -> None:
        self.provider = settings.llm_provider.lower()
        if self.provider not in {"gemini", "openai", "anthropic", "xai"}:
            raise ValueError("Provider must be one of: gemini, openai, anthropic, xai")
        self._gemini_client: Any | None = None
        self._openai_client: Any | None = None
        self._anthropic_client: Any | None = None
        self._xai_client: Any | None = None
        self._last_response: Any | None = None

    def _gemini_model_candidates(self, model: str) -> list[str]:
        candidates: list[str] = []

        def add(candidate: str) -> None:
            if candidate and candidate not in candidates:
                candidates.append(candidate)

        add(model)
        alias_map = {
            "gemini-2.0-flash-exp": "gemini-2.5-flash-lite",
            "gemini-2.0-flash": "gemini-2.5-flash-lite",
            "gemini-2.0-pro-exp": "gemini-2.5-flash-lite",
            "gemini-1.5-pro-latest": "gemini-2.5-flash-lite",
            "gemini-1.5-flash-latest": "gemini-2.5-flash-lite",
            "gemini-1.5-pro": "gemini-2.5-flash-lite",
            "gemini-1.5-flash": "gemini-2.5-flash-lite",
        }
        add(alias_map.get(model, ""))
        if model.endswith("-exp") or model.endswith("-preview"):
            base = model.removesuffix("-exp").removesuffix("-preview")
            add(base)
        add("gemini-2.5-flash-lite")
        return candidates

    async def generate_project_snapshot(
        self,
        *,
        prompt: str,
        assessment: PromptIntakeAssessment,
        clarification_answers: dict[str, str],
    ) -> ProjectGenerationResult:
        payload = {
            "prompt": prompt,
            "assessment": assessment.model_dump(mode="json"),
            "clarification_answers": clarification_answers,
            "required_output": {
                "title": "string",
                "objective": "string",
                "prompt": prompt,
                "domain": assessment.domain,
                "assumptions": ["string"],
                "warnings": ["string"],
                "agents": [
                    {
                        "name": "string",
                        "role": "string",
                        "purpose": "string",
                        "instructions": "string",
                        "tone": "string",
                        "tools": ["string"],
                        "capabilities": {
                            "ask": True,
                            "challenge": True,
                            "cite": True,
                            "score": True,
                            "recommend": False,
                        },
                    }
                ],
                "flow": [
                    {
                        "name": "string",
                        "description": "string",
                        "rules": {},
                    }
                ],
            },
        }
        system_instruction = (
            "You are generating a production-ready debate project for a paid SaaS platform. "
            "Return only valid JSON. Create a reusable project configuration with expert agents, "
            "clear instructions, and a rigorous decision-oriented flow. Ensure exactly one moderator-like "
            "agent has recommend=true. Do not use placeholders. High-risk domains must be cautious, balanced, "
            "and explicit about uncertainty."
        )
        response = await self._generate_json(model=settings.llm_project_model, system_instruction=system_instruction, payload=payload)
        response.setdefault("prompt", prompt)
        response.setdefault("domain", assessment.domain)
        response.setdefault("assumptions", assessment.assumptions)
        response.setdefault("warnings", assessment.warnings)
        snapshot = ProjectVersionSnapshot.model_validate(response)
        if not snapshot.prompt:
            snapshot.prompt = prompt
        snapshot.domain = assessment.domain
        snapshot.assumptions = self._merge_unique(assessment.assumptions, snapshot.assumptions)
        snapshot.warnings = self._merge_unique(assessment.warnings, snapshot.warnings)
        self._validate_project_snapshot(snapshot)
        return ProjectGenerationResult(snapshot=snapshot, usage=self._usage_from_response(settings.llm_project_model, self._last_response))

    async def generate_debate_turn(
        self,
        *,
        snapshot: ProjectVersionSnapshot,
        phase: FlowStepDraft,
        agent: AgentDraft,
        transcript_context: list[dict[str, Any]],
        model_provider: str | None = None,
        model_name: str | None = None,
    ) -> DebateTurnResult:
        payload = {
            "project": snapshot.model_dump(mode="json"),
            "phase": phase.model_dump(mode="json"),
            "agent": agent.model_dump(mode="json"),
            "recent_transcript": transcript_context,
            "required_output": {
                "message_type": "statement",
                "content": "string",
            },
        }
        system_instruction = (
            "You are playing one agent in a structured multi-agent debate. Return only valid JSON. "
            "Produce substantive, professional reasoning. The content must be specific, decision-oriented, "
            "and consistent with the agent role and current phase. Do not narrate system behavior."
        )
        provider = model_provider or agent.model_provider
        model = model_name or agent.model_name
        response = await self._generate_json(model=model, system_instruction=system_instruction, payload=payload, provider=provider)
        message_type = str(response.get("message_type") or "statement").strip().lower()
        if message_type not in {"statement", "challenge", "answer", "synthesis"}:
            message_type = "statement"
        content = str(response.get("content") or "").strip()
        if not content:
            logger.error(f"LLM returned empty debate turn content. Full response: {response}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned an empty debate turn.")
        return DebateTurnResult(content=content, message_type=message_type, usage=self._usage_from_response(model, self._last_response, provider))

    async def generate_final_synthesis(
        self,
        *,
        snapshot: ProjectVersionSnapshot,
        transcript_context: list[dict[str, Any]],
    ) -> FinalSynthesisResult:
        payload = {
            "project": snapshot.model_dump(mode="json"),
            "full_transcript": transcript_context,
            "required_output": {
                "summary": "string",
                "verdict": "string",
                "recommendations": ["string"],
                "open_questions": ["string"],
                "key_risks": ["string"],
            },
        }
        system_instruction = (
            "You are the final synthesis engine for a paid decision-debate product. Return only valid JSON. "
            "Produce an executive-quality summary, a direct verdict, and actionable recommendations. "
            "Be explicit about uncertainty and unresolved questions."
        )
        response = await self._generate_json(model=settings.llm_run_model, system_instruction=system_instruction, payload=payload)
        summary = str(response.get("summary") or "").strip()
        verdict = str(response.get("verdict") or "").strip()
        recommendations = [str(item).strip() for item in response.get("recommendations", []) if str(item).strip()]
        if not summary or not verdict:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned an incomplete final synthesis.")
        raw_output = {
            "open_questions": response.get("open_questions", []),
            "key_risks": response.get("key_risks", []),
        }
        return FinalSynthesisResult(
            summary=summary,
            verdict=verdict,
            recommendations=recommendations,
            raw_output=raw_output,
            usage=self._usage_from_response(settings.llm_run_model, self._last_response),
        )

    async def _generate_json(self, *, model: str, system_instruction: str, payload: dict[str, Any], provider: str | None = None) -> dict[str, Any]:
        provider = (provider or self.provider).lower()
        
        if provider == "gemini":
            return await self._generate_json_gemini(model=model, system_instruction=system_instruction, payload=payload)
        elif provider == "openai":
            return await self._generate_json_openai(model=model, system_instruction=system_instruction, payload=payload)
        elif provider == "anthropic":
            return await self._generate_json_anthropic(model=model, system_instruction=system_instruction, payload=payload)
        elif provider == "xai":
            return await self._generate_json_xai(model=model, system_instruction=system_instruction, payload=payload)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported provider: {provider}")

    async def _generate_json_gemini(self, *, model: str, system_instruction: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = self._get_gemini_client()
        from google.genai import types as genai_types

        last_error: Exception | None = None
        response: Any | None = None
        resolved_model = model

        for candidate_model in self._gemini_model_candidates(model):
            def _call() -> Any:
                return client.models.generate_content(
                    model=candidate_model,
                    contents=json.dumps(payload, ensure_ascii=False),
                    config=genai_types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        temperature=0.35,
                    ),
                )

            try:
                response = await asyncio.to_thread(_call)
                resolved_model = candidate_model
                break
            except Exception as exc:
                last_error = exc
                error_text = str(exc)
                if "PERMISSION_DENIED" in error_text or "API key" in error_text or "leaked" in error_text.lower():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Gemini API key is invalid, restricted, or has been disabled. Update GEMINI_API_KEY in backend/.env.",
                    ) from exc
                if "NOT_FOUND" not in str(exc) and "not found" not in str(exc).lower():
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Gemini request failed: {error_text}",
                    ) from exc

        if response is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini model unavailable. Tried: {', '.join(self._gemini_model_candidates(model))}. Last error: {last_error}",
            )

        self._last_response = response
        setattr(self._last_response, "_resolved_model", resolved_model)
        
        # Check for safety blocks or other issues
        text = getattr(response, "text", None)
        if not text:
            # Try to get more diagnostic information
            candidates = getattr(response, "candidates", [])
            if candidates:
                candidate = candidates[0]
                finish_reason = getattr(candidate, "finish_reason", None)
                safety_ratings = getattr(candidate, "safety_ratings", [])
                
                if finish_reason and finish_reason != "STOP":
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"LLM response blocked. Reason: {finish_reason}. Try rephrasing your request."
                    )
                if safety_ratings:
                    blocked = [r for r in safety_ratings if getattr(r, "blocked", False)]
                    if blocked:
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail="LLM response blocked by safety filters. Try rephrasing your request."
                        )
            
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM did not return content.")
        
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error(f"Gemini returned invalid JSON. Raw response (first 500 chars): {text[:500]}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON.") from exc

    async def _generate_json_openai(self, *, model: str, system_instruction: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = self._get_openai_client()

        def _call() -> Any:
            return client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                response_format={"type": "json_object"},
                temperature=0.35,
            )

        response = await asyncio.to_thread(_call)
        self._last_response = response
        text = response.choices[0].message.content if response.choices else None
        if not text:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM did not return content.")
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error(f"OpenAI returned invalid JSON. Raw response (first 500 chars): {text[:500]}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON.") from exc

    async def _generate_json_anthropic(self, *, model: str, system_instruction: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = self._get_anthropic_client()

        def _call() -> Any:
            return client.messages.create(
                model=model,
                system=system_instruction,
                messages=[
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                max_tokens=4096,
                temperature=0.35,
            )

        response = await asyncio.to_thread(_call)
        self._last_response = response
        text = response.content[0].text if response.content else None
        if not text:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM did not return content.")
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error(f"Anthropic returned invalid JSON. Raw response (first 500 chars): {text[:500]}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON.") from exc

    async def _generate_json_xai(self, *, model: str, system_instruction: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = self._get_xai_client()

        def _call() -> Any:
            return client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
                response_format={"type": "json_object"},
                temperature=0.35,
            )

        response = await asyncio.to_thread(_call)
        self._last_response = response
        text = response.choices[0].message.content if response.choices else None
        if not text:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM did not return content.")
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error(f"xAI returned invalid JSON. Raw response (first 500 chars): {text[:500]}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON.") from exc

    def _get_gemini_client(self) -> Any:
        if not settings.gemini_api_key:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Gemini API key is not configured.")
        if self._gemini_client is None:
            from google import genai

            self._gemini_client = genai.Client(api_key=settings.gemini_api_key)
        return self._gemini_client

    def _get_openai_client(self) -> Any:
        if not settings.openai_api_key:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="OpenAI API key is not configured.")
        if self._openai_client is None:
            from openai import OpenAI

            self._openai_client = OpenAI(api_key=settings.openai_api_key)
        return self._openai_client

    def _get_anthropic_client(self) -> Any:
        if not settings.anthropic_api_key:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Anthropic API key is not configured.")
        if self._anthropic_client is None:
            from anthropic import Anthropic

            self._anthropic_client = Anthropic(api_key=settings.anthropic_api_key)
        return self._anthropic_client

    def _get_xai_client(self) -> Any:
        if not settings.xai_api_key:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="X.AI API key is not configured.")
        if self._xai_client is None:
            from openai import OpenAI

            self._xai_client = OpenAI(
                api_key=settings.xai_api_key,
                base_url="https://api.x.ai/v1",
            )
        return self._xai_client

    def _usage_from_response(self, model: str, response: Any, provider: str | None = None) -> LLMUsage:
        provider = (provider or self.provider).lower()
        usage_metadata = getattr(response, "usage_metadata", None)
        input_tokens = int(
            getattr(usage_metadata, "prompt_token_count", 0)
            or getattr(usage_metadata, "input_token_count", 0)
            or 0
        )
        output_tokens = int(
            getattr(usage_metadata, "candidates_token_count", 0)
            or getattr(usage_metadata, "output_token_count", 0)
            or 0
        )
        total_tokens = int(getattr(usage_metadata, "total_token_count", 0) or (input_tokens + output_tokens))
        input_cost = (input_tokens / 1_000_000) * settings.llm_input_cost_per_million_cents
        output_cost = (output_tokens / 1_000_000) * settings.llm_output_cost_per_million_cents
        cost_estimate_cents = int(round(input_cost + output_cost))
        return LLMUsage(
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cost_estimate_cents=cost_estimate_cents,
        )

    def _validate_project_snapshot(self, snapshot: ProjectVersionSnapshot) -> None:
        if len(snapshot.agents) < 2:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned too few agents.")
        if len(snapshot.flow) < 3:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned too few flow steps.")
        recommenders = [agent for agent in snapshot.agents if agent.capabilities.recommend]
        if len(recommenders) != 1:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM must produce exactly one synthesis agent.")

    def _merge_unique(self, left: list[str], right: list[str]) -> list[str]:
        merged: list[str] = []
        seen: set[str] = set()
        for value in [*left, *right]:
            normalized = value.strip()
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(normalized)
        return merged
