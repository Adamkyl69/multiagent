from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Multi-Agent Debate Backend"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./backend.db"
    allow_insecure_dev_auth: bool = False
    default_dev_user_id: str = "dev-user"
    default_dev_user_email: str = "dev@example.com"
    default_dev_workspace_name: str = "Default Workspace"
    frontend_url: str = "http://localhost:3000"
    supabase_jwt_secret: str | None = None
    supabase_jwt_audience: str | None = None
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_price_id_pro: str | None = None
    llm_provider: str = "gemini"
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    xai_api_key: str | None = None
    llm_project_model: str = "gemini-1.5-pro"
    llm_run_model: str = "gemini-1.5-flash"
    llm_input_cost_per_million_cents: float = 0.0
    llm_output_cost_per_million_cents: float = 0.0
    llm_max_transcript_messages: int = 12

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    def validate_runtime(self) -> None:
        if not self.is_production:
            return

        if self.allow_insecure_dev_auth:
            raise ValueError("allow_insecure_dev_auth must be disabled in production.")
        if not self.supabase_jwt_secret:
            raise ValueError("supabase_jwt_secret is required in production.")
        if self.llm_provider not in {"gemini", "openai", "anthropic", "xai"}:
            raise ValueError("llm_provider must be one of: gemini, openai, anthropic, xai")
        if self.llm_provider == "gemini" and not self.gemini_api_key:
            raise ValueError("gemini_api_key is required when using gemini provider.")
        if self.llm_provider == "openai" and not self.openai_api_key:
            raise ValueError("openai_api_key is required when using openai provider.")
        if self.llm_provider == "anthropic" and not self.anthropic_api_key:
            raise ValueError("anthropic_api_key is required when using anthropic provider.")
        if self.llm_provider == "xai" and not self.xai_api_key:
            raise ValueError("xai_api_key is required when using xai provider.")
        if self.llm_input_cost_per_million_cents <= 0 or self.llm_output_cost_per_million_cents <= 0:
            raise ValueError("LLM token pricing settings are required in production.")


settings = Settings()
