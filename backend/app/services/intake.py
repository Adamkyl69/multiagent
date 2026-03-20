from app.schemas import ClarificationQuestionItem, PromptIntakeAssessment


class IntakeService:
    high_risk_keywords = {
        "medical",
        "health",
        "diagnosis",
        "treatment",
        "legal",
        "compliance",
        "financial",
        "investment",
        "pricing",
        "drug",
        "avocado",
    }

    blocked_keywords = {"hack", "malware", "self-harm", "bomb"}

    def assess(self, prompt: str, clarification_answers: dict[str, str] | None = None) -> PromptIntakeAssessment:
        normalized_prompt = prompt.strip()
        answers = clarification_answers or {}
        lowered = normalized_prompt.lower()

        if not normalized_prompt:
            return PromptIntakeAssessment(
                status="blocked",
                domain="unknown",
                prompt_quality_score=0,
                is_high_risk=False,
                warnings=["Prompt is empty."],
            )

        if any(keyword in lowered for keyword in self.blocked_keywords):
            return PromptIntakeAssessment(
                status="blocked",
                domain=self._detect_domain(lowered),
                prompt_quality_score=5,
                is_high_risk=True,
                warnings=["Prompt requests a blocked domain."],
            )

        domain = self._detect_domain(lowered)
        is_high_risk = any(keyword in lowered for keyword in self.high_risk_keywords)
        word_count = len([part for part in normalized_prompt.split() if part])
        score = min(100, 20 + word_count * 4)
        assumptions: list[str] = []
        warnings: list[str] = []
        questions = self._clarification_questions(domain)

        if word_count < 3:
            score = min(score, 20)
            return PromptIntakeAssessment(
                status="blocked",
                domain=domain,
                prompt_quality_score=score,
                is_high_risk=is_high_risk,
                clarification_questions=questions,
                warnings=["Prompt is too short to generate a project."],
            )

        if word_count < 8 and not answers:
            score = min(score, 45)
            return PromptIntakeAssessment(
                status="needs_clarification",
                domain=domain,
                prompt_quality_score=score,
                is_high_risk=is_high_risk,
                clarification_questions=questions,
                warnings=["Prompt needs more scope before project generation."],
            )

        if is_high_risk and not answers:
            assumptions = self._default_assumptions(domain)
            warnings.append("Sensitive domain detected. Review assumptions before launching.")
            return PromptIntakeAssessment(
                status="generate_with_assumptions",
                domain=domain,
                prompt_quality_score=max(score, 60),
                is_high_risk=is_high_risk,
                clarification_questions=questions,
                assumptions=assumptions,
                warnings=warnings,
            )

        if any(not value.strip() for value in answers.values()):
            warnings.append("Some clarification answers are incomplete.")

        return PromptIntakeAssessment(
            status="ready_to_generate",
            domain=domain,
            prompt_quality_score=max(score, 70),
            is_high_risk=is_high_risk,
            clarification_questions=questions if not answers else [],
            assumptions=self._default_assumptions(domain) if is_high_risk and answers else [],
            warnings=warnings,
        )

    def _detect_domain(self, prompt: str) -> str:
        if any(keyword in prompt for keyword in ["price", "pricing", "cfo", "revenue", "margin"]):
            return "pricing"
        if any(keyword in prompt for keyword in ["uae", "market", "expansion", "launch", "country"]):
            return "market_expansion"
        if any(keyword in prompt for keyword in ["health", "medical", "avocado", "nutrition", "patient"]):
            return "health"
        return "general_strategy"

    def _clarification_questions(self, domain: str) -> list[ClarificationQuestionItem]:
        if domain == "pricing":
            return [
                ClarificationQuestionItem(key="business_model", question="What product or service is being priced?", rationale="Pricing structure depends on the unit economics."),
                ClarificationQuestionItem(key="target_segment", question="Who is the primary customer segment?", rationale="Different segments tolerate different pricing and packaging."),
                ClarificationQuestionItem(key="decision_goal", question="Is the goal growth, margin, retention, or positioning?", rationale="The debate should optimize for a clear commercial objective."),
            ]
        if domain == "market_expansion":
            return [
                ClarificationQuestionItem(key="expansion_goal", question="Is the debate about launch timing, market fit, or operating model?", rationale="Expansion debates need a defined decision objective."),
                ClarificationQuestionItem(key="customer_profile", question="Who is the target customer in the new market?", rationale="Agent recommendations depend on the intended buyer and go-to-market path."),
                ClarificationQuestionItem(key="risk_tolerance", question="What is the acceptable risk level for this expansion?", rationale="This determines how conservative the generated panel should be."),
            ]
        if domain == "health":
            return [
                ClarificationQuestionItem(key="audience", question="Who is the target audience for the recommendation?", rationale="Health guidance changes based on who the output is for."),
                ClarificationQuestionItem(key="conditions", question="Are there specific health conditions or comorbidities to include?", rationale="Clinical context affects both agent selection and safety assumptions."),
                ClarificationQuestionItem(key="output_format", question="Should the output be educational, advisory, or decision-oriented?", rationale="The final synthesis should match the intended use case."),
            ]
        return [
            ClarificationQuestionItem(key="goal", question="What decision should the debate help make?", rationale="A strong objective improves the generated debate structure."),
            ClarificationQuestionItem(key="audience", question="Who will use the final output?", rationale="Audience affects tone, expertise, and synthesis format."),
            ClarificationQuestionItem(key="constraints", question="What constraints or trade-offs matter most?", rationale="Constraints drive the right set of agents and debate phases."),
        ]

    def _default_assumptions(self, domain: str) -> list[str]:
        if domain == "pricing":
            return [
                "Assuming the product is a SaaS offer with recurring revenue.",
                "Assuming the debate should balance growth and margin instead of optimizing for only one.",
            ]
        if domain == "market_expansion":
            return [
                "Assuming expansion is being evaluated for commercial viability within the next 12 months.",
                "Assuming the user wants a decision-oriented outcome rather than an exploratory research memo.",
            ]
        if domain == "health":
            return [
                "Assuming the output is educational and not individualized medical advice.",
                "Assuming common age-related conditions should be considered at a high level rather than diagnosed.",
            ]
        return [
            "Assuming the user wants a decision-focused debate instead of an open-ended discussion.",
        ]
