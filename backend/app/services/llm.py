import asyncio
import json
import logging
import re
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
        try:
            response = await self._generate_json(model=model, system_instruction=system_instruction, payload=payload, provider=provider)
        except HTTPException as exc:
            if (provider or self.provider).lower() == "gemini" and exc.status_code == status.HTTP_502_BAD_GATEWAY and exc.detail == "LLM returned invalid JSON.":
                logger.warning(
                    "Gemini returned invalid JSON for debate turn. Retrying with text fallback. agent=%s phase=%s",
                    agent.name,
                    phase.name,
                )
                return await self._generate_debate_turn_text(
                    snapshot=snapshot,
                    phase=phase,
                    agent=agent,
                    transcript_context=transcript_context,
                    provider=provider,
                    model=model,
                )
            raise
        message_type = str(response.get("message_type") or "statement").strip().lower()
        if message_type not in {"statement", "challenge", "answer", "synthesis"}:
            message_type = "statement"
        
        # Handle multiple response formats from LLM
        content = ""
        
        # Try various possible response structures
        if "content" in response:
            content = str(response.get("content") or "").strip()
        elif "message" in response and isinstance(response["message"], dict):
            content = str(response["message"].get("content") or "").strip()
        elif "text" in response:
            content = str(response.get("text") or "").strip()
        elif "response" in response:
            content = str(response.get("response") or "").strip()
        elif "output" in response:
            content = str(response.get("output") or "").strip()
        
        # Gemini sometimes echoes the payload and fills in required_output with actual content
        if not content and "required_output" in response and isinstance(response["required_output"], dict):
            content = str(response["required_output"].get("content") or "").strip()
            if content:
                message_type = str(response["required_output"].get("message_type") or message_type).strip().lower()
                if message_type not in {"statement", "challenge", "answer", "synthesis"}:
                    message_type = "statement"
                logger.warning("Extracted content from echoed required_output structure.")
        
        # Check any nested dict for a 'content' field
        if not content:
            for key, value in response.items():
                if isinstance(value, dict) and "content" in value:
                    candidate = str(value.get("content") or "").strip()
                    if len(candidate) > 10:
                        content = candidate
                        logger.warning(f"Extracted content from nested dict '{key}.content'.")
                        break
        
        # Handle cases where Gemini returns structured analysis/research data instead of simple content
        # (e.g., {'agent': {...}, 'analysis': {large nested structure}})
        if not content:
            for key, value in response.items():
                if isinstance(value, dict) and key not in {"agent", "recent_transcript"} and len(str(value)) > 100:
                    # Serialize the nested structure as formatted content
                    import json
                    try:
                        content = json.dumps(value, indent=2, ensure_ascii=False)
                        logger.warning(f"Extracted content from large nested structure '{key}' - Gemini returned analysis instead of debate turn.")
                        break
                    except (TypeError, ValueError):
                        content = str(value)
                        logger.warning(f"Extracted content from non-serializable structure '{key}'.")
                        break
        
        # Last resort: try to extract from any string value in the response
        if not content:
            for key, value in response.items():
                if isinstance(value, str) and len(value.strip()) > 10 and key not in {"message_type", "type", "role"}:
                    content = value.strip()
                    logger.warning(f"Extracted content from unexpected field '{key}': {content[:100]}...")
                    break
        
        if not content:
            logger.error(f"LLM returned empty debate turn content. Full response: {response}")
            logger.error(f"Response keys: {list(response.keys())}")
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned an empty debate turn.")
        return DebateTurnResult(content=content, message_type=message_type, usage=self._usage_from_response(model, self._last_response, provider))

    async def _generate_debate_turn_text(
        self,
        *,
        snapshot: ProjectVersionSnapshot,
        phase: FlowStepDraft,
        agent: AgentDraft,
        transcript_context: list[dict[str, Any]],
        provider: str,
        model: str,
    ) -> DebateTurnResult:
        payload = {
            "project": snapshot.model_dump(mode="json"),
            "phase": phase.model_dump(mode="json"),
            "agent": agent.model_dump(mode="json"),
            "recent_transcript": transcript_context,
        }
        system_instruction = (
            "You are playing one agent in a structured multi-agent debate. "
            "Produce substantive, professional reasoning with the same depth and quality you would normally provide. "
            "Do not use JSON. Return exactly this format:\n"
            "MESSAGE_TYPE: statement|challenge|answer|synthesis\n"
            "CONTENT:\n"
            "<full response>"
        )
        text = await self._generate_text(model=model, system_instruction=system_instruction, payload=payload, provider=provider)
        message_type, content = self._parse_debate_turn_text_response(text)
        if not content:
            logger.error("LLM returned empty debate turn content after text fallback. Raw response: %s", text[:1000])
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

    async def _generate_text(self, *, model: str, system_instruction: str, payload: dict[str, Any], provider: str | None = None) -> str:
        provider = (provider or self.provider).lower()

        if provider == "gemini":
            return await self._generate_text_gemini(model=model, system_instruction=system_instruction, payload=payload)

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Text fallback is not supported for provider: {provider}")

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
                        max_output_tokens=8192,
                    ),
                )

            max_retries = 3
            for attempt in range(max_retries):
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
                    
                    # Retry on transient errors (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED)
                    is_retryable = any(code in error_text for code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "high demand"])
                    
                    if is_retryable and attempt < max_retries - 1:
                        wait_time = (2 ** attempt) * 1.0  # 1s, 2s, 4s
                        logger.warning(f"Gemini {candidate_model} transient error (attempt {attempt + 1}/{max_retries}): {error_text}. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    if "NOT_FOUND" not in error_text and "not found" not in error_text.lower():
                        raise HTTPException(
                            status_code=status.HTTP_502_BAD_GATEWAY,
                            detail=f"Gemini request failed: {error_text}",
                        ) from exc
                    
                    # Model not found, try next candidate
                    break
            
            if response is not None:
                break

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
        
        parsed = self._parse_json_response_text(text)
        if parsed is not None:
            return parsed

        coerced = self._coerce_required_output_from_text(text, payload.get("required_output"))
        if coerced is not None:
            logger.warning("Gemini returned malformed JSON, but the response was salvaged for a simple structured output.")
            return coerced
        
        # All parsing attempts failed
        logger.error(f"Gemini returned invalid JSON. Raw response (first 1000 chars): {text[:1000]}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM returned invalid JSON.")

    async def _generate_text_gemini(self, *, model: str, system_instruction: str, payload: dict[str, Any]) -> str:
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
                        temperature=0.35,
                        max_output_tokens=8192,
                    ),
                )

            max_retries = 3
            for attempt in range(max_retries):
                try:
                    response = await asyncio.to_thread(_call)
                    resolved_model = candidate_model
                    break
                except Exception as exc:
                    last_error = exc
                    error_text = str(exc)
                    
                    # Retry on transient errors (503 UNAVAILABLE, 429 RESOURCE_EXHAUSTED)
                    is_retryable = any(code in error_text for code in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "high demand"])
                    
                    if is_retryable and attempt < max_retries - 1:
                        wait_time = (2 ** attempt) * 1.0  # 1s, 2s, 4s
                        logger.warning(f"Gemini {candidate_model} transient error (attempt {attempt + 1}/{max_retries}): {error_text}. Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                        continue
                    
                    # Model not found or non-retryable error, try next candidate
                    break
            
            if response is not None:
                break

        if response is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini model unavailable. Tried: {', '.join(self._gemini_model_candidates(model))}. Last error: {last_error}",
            )

        self._last_response = response
        setattr(self._last_response, "_resolved_model", resolved_model)

        text = getattr(response, "text", None)
        if not text:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="LLM did not return content.")
        return text.strip()

    def _parse_json_response_text(self, text: str) -> dict[str, Any] | None:
        candidates: list[str] = []
        stripped = text.strip()
        if stripped:
            candidates.append(stripped)

        json_match = re.search(r"```json\s*\n(.*?)\n```", text, re.DOTALL | re.IGNORECASE)
        if json_match:
            candidates.append(json_match.group(1).strip())

        code_match = re.search(r"```\s*\n(.*?)\n```", text, re.DOTALL)
        if code_match:
            candidates.append(code_match.group(1).strip())

        balanced = self._extract_balanced_json_block(stripped)
        if balanced:
            candidates.append(balanced)

        seen: set[str] = set()
        for candidate in candidates:
            if not candidate or candidate in seen:
                continue
            seen.add(candidate)
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed

        return None

    def _extract_balanced_json_block(self, text: str) -> str | None:
        start_positions = [pos for pos in (text.find("{"), text.find("[")) if pos >= 0]
        if not start_positions:
            return None

        start = min(start_positions)
        opening = text[start]
        closing = "}" if opening == "{" else "]"
        depth = 0
        in_string = False
        escaped = False

        for index in range(start, len(text)):
            char = text[index]
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == '"':
                    in_string = False
                continue

            if char == '"':
                in_string = True
                continue

            if char == opening:
                depth += 1
            elif char == closing:
                depth -= 1
                if depth == 0:
                    return text[start:index + 1]

        return None

    def _extract_json_string_field(self, text: str, field_name: str) -> str | None:
        marker = f'"{field_name}"'
        marker_index = text.find(marker)
        if marker_index < 0:
            return None

        colon_index = text.find(":", marker_index + len(marker))
        if colon_index < 0:
            return None

        value_start = text.find('"', colon_index + 1)
        if value_start < 0:
            return None

        try:
            value, _ = json.JSONDecoder().raw_decode(text[value_start:])
        except json.JSONDecodeError:
            return None

        return value if isinstance(value, str) else None

    def _coerce_required_output_from_text(self, text: str, required_output: Any) -> dict[str, Any] | None:
        if not isinstance(required_output, dict):
            return None

        if set(required_output.keys()) != {"message_type", "content"}:
            return None

        message_type = (self._extract_json_string_field(text, "message_type") or "statement").strip().lower()
        if message_type not in {"statement", "challenge", "answer", "synthesis"}:
            message_type = "statement"

        content = self._extract_json_string_field(text, "content")
        if content and content.strip():
            return {"message_type": message_type, "content": content.strip()}

        cleaned = text.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        content_marker = cleaned.find('"content"')
        if content_marker >= 0:
            colon_index = cleaned.find(":", content_marker)
            if colon_index >= 0:
                cleaned = cleaned[colon_index + 1 :].strip()
        cleaned = cleaned.strip().strip(",}")
        if cleaned.startswith('"') and cleaned.endswith('"'):
            try:
                cleaned = json.loads(cleaned)
            except json.JSONDecodeError:
                cleaned = cleaned[1:-1]
        cleaned = cleaned.replace("\\n", "\n").replace("\\t", "\t").replace('\\"', '"').strip()
        if not cleaned:
            return None

        return {"message_type": message_type, "content": cleaned}

    def _parse_debate_turn_text_response(self, text: str) -> tuple[str, str]:
        stripped = text.strip()
        message_type_match = re.search(r"MESSAGE_TYPE\s*:\s*(statement|challenge|answer|synthesis)", stripped, re.IGNORECASE)
        message_type = message_type_match.group(1).lower() if message_type_match else "statement"

        content_match = re.search(r"CONTENT\s*:\s*(.*)$", stripped, re.DOTALL | re.IGNORECASE)
        content = content_match.group(1).strip() if content_match else stripped

        return message_type, content

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
