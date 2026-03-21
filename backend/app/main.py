from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_auth_context
from app.config import settings
from app.db import async_session_factory, get_db_session, init_db
from app.schemas import (
    AuthContext,
    AuthMeResponse,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    FinalOutputResponse,
    LaunchRunRequest,
    PlanResponse,
    ProjectGenerationRequest,
    ProjectResponse,
    ProjectUpdateRequest,
    ProjectVersionResponse,
    PromptIntakeAssessment,
    PromptIntakeRequest,
    RunResponse,
    TranscriptMessageResponse,
    UsageEventResponse,
    UsageOverviewResponse,
)
from app.schemas_conversation import (
    ConversationHistoryResponse,
    ConversationResponse,
    SendMessageRequest,
    StartConversationRequest,
)
from app.services.billing import BillingService
from app.services.conversation_v2 import ConversationServiceV2
from app.services.identity import IdentityService
from app.services.intake import IntakeService
from app.services.llm import LLMService
from app.services.projects import ProjectService
from app.services.runs import RunEventBroker, RunService


billing_service = BillingService()
identity_service = IdentityService()
intake_service = IntakeService()
llm_service = LLMService()
project_service = ProjectService(intake_service=intake_service, billing_service=billing_service, llm_service=llm_service)
conversation_service = ConversationServiceV2(llm_service=llm_service, project_service=project_service)
run_broker = RunEventBroker()
run_service = RunService(session_factory=async_session_factory, billing_service=billing_service, broker=run_broker, llm_service=llm_service)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_runtime()
    await init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

# Allow CORS for frontend - in dev mode allow common dev origins
if settings.app_env == "development":
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
    # Also allow browser preview proxy origins (they use random ports)
    allow_origin_regex = r"http://127\.0\.0\.1:\d+"
else:
    allowed_origins = [settings.frontend_url]
    allow_origin_regex = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def require_workspace(
    auth: AuthContext = Depends(get_auth_context),
    session: AsyncSession = Depends(get_db_session),
):
    user, workspace, subscription, _ = await identity_service.ensure_user_workspace(session, auth)
    return {"auth": auth, "user": user, "workspace": workspace, "subscription": subscription}


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok", "environment": settings.app_env}


@app.get(f"{settings.api_v1_prefix}/auth/me", response_model=AuthMeResponse)
async def auth_me(
    context=Depends(require_workspace),
):
    return AuthMeResponse(
        user_id=context["user"].id,
        auth_subject=context["auth"].auth_subject,
        email=context["user"].email,
        workspace_id=context["workspace"].id,
        workspace_name=context["workspace"].name,
        plan_code=context["subscription"].plan_code,
        subscription_status=context["subscription"].status,
    )


@app.post(f"{settings.api_v1_prefix}/intake/evaluate", response_model=PromptIntakeAssessment)
async def evaluate_prompt(
    payload: PromptIntakeRequest,
    _=Depends(require_workspace),
):
    return intake_service.assess(payload.prompt, payload.clarification_answers)


@app.post(f"{settings.api_v1_prefix}/projects/generate", response_model=ProjectResponse)
async def generate_project(
    payload: ProjectGenerationRequest,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await project_service.generate_project(
        session,
        workspace_id=context["workspace"].id,
        user_id=context["user"].id,
        request=payload,
    )


@app.get(f"{settings.api_v1_prefix}/projects/{{project_id}}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await project_service.get_project(session, context["workspace"].id, project_id)


@app.patch(f"{settings.api_v1_prefix}/projects/{{project_id}}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await project_service.update_project(
        session,
        workspace_id=context["workspace"].id,
        project_id=project_id,
        payload=payload,
        user_id=context["user"].id,
    )


@app.post(f"{settings.api_v1_prefix}/projects/{{project_id}}/versions", response_model=ProjectVersionResponse)
async def create_project_version(
    project_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await project_service.create_version(
        session,
        workspace_id=context["workspace"].id,
        project_id=project_id,
        user_id=context["user"].id,
    )


@app.post(f"{settings.api_v1_prefix}/runs", response_model=RunResponse)
async def launch_run(
    payload: LaunchRunRequest,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await run_service.launch_run(
        session,
        workspace_id=context["workspace"].id,
        user_id=context["user"].id,
        project_id=payload.project_id,
        project_version_id=payload.project_version_id,
    )


@app.get(f"{settings.api_v1_prefix}/runs/{{run_id}}", response_model=RunResponse)
async def get_run(
    run_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await run_service.get_run(session, context["workspace"].id, run_id)


@app.post(f"{settings.api_v1_prefix}/runs/{{run_id}}/stop", response_model=RunResponse)
async def stop_run(
    run_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await run_service.stop_run(session, context["workspace"].id, run_id)


@app.get(f"{settings.api_v1_prefix}/runs/{{run_id}}/transcript", response_model=list[TranscriptMessageResponse])
async def get_transcript(
    run_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await run_service.list_transcript(session, context["workspace"].id, run_id)


@app.get(f"{settings.api_v1_prefix}/runs/{{run_id}}/result", response_model=FinalOutputResponse)
async def get_run_result(
    run_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await run_service.get_final_output(session, context["workspace"].id, run_id)


@app.get(f"{settings.api_v1_prefix}/runs/{{run_id}}/events")
async def stream_run_events(
    run_id: str,
    context=Depends(require_workspace),
):
    return StreamingResponse(
        run_service.stream_events(context["workspace"].id, run_id),
        media_type="text/event-stream",
    )


@app.get(f"{settings.api_v1_prefix}/billing/plan", response_model=PlanResponse)
async def get_plan(
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await billing_service.get_plan(session, context["workspace"].id)


@app.get(f"{settings.api_v1_prefix}/billing/usage", response_model=UsageOverviewResponse)
async def get_usage(
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await billing_service.get_usage_overview(session, context["workspace"].id)


@app.get(f"{settings.api_v1_prefix}/billing/usage/history", response_model=list[UsageEventResponse])
async def get_usage_history(
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await billing_service.list_usage_history(session, context["workspace"].id)


@app.post(f"{settings.api_v1_prefix}/conversations/start", response_model=ConversationResponse)
async def start_conversation(
    payload: StartConversationRequest,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await conversation_service.start_conversation(
        session,
        workspace_id=context["workspace"].id,
        user_id=context["user"].id,
        initial_message=payload.initial_message,
        additional_context=payload.context,
    )


@app.post(f"{settings.api_v1_prefix}/conversations/{{session_id}}/message", response_model=ConversationResponse)
async def send_conversation_message(
    session_id: str,
    payload: SendMessageRequest,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await conversation_service.send_message(
        session,
        session_id=session_id,
        user_message=payload.content,
    )


@app.get(f"{settings.api_v1_prefix}/conversations/{{session_id}}", response_model=ConversationHistoryResponse)
async def get_conversation(
    session_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await conversation_service.get_conversation(session, session_id)


@app.post(f"{settings.api_v1_prefix}/conversations/{{session_id}}/generate", response_model=ProjectResponse)
async def generate_project_from_conversation(
    session_id: str,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await conversation_service.generate_project_from_conversation(
        session,
        session_id=session_id,
        workspace_id=context["workspace"].id,
        user_id=context["user"].id,
    )


@app.post(f"{settings.api_v1_prefix}/billing/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    context=Depends(require_workspace),
    session: AsyncSession = Depends(get_db_session),
):
    return await billing_service.create_checkout_session(
        session,
        workspace_id=context["workspace"].id,
        user_email=context["user"].email,
        price_id=payload.price_id,
    )


@app.post(f"{settings.api_v1_prefix}/billing/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    session: AsyncSession = Depends(get_db_session),
):
    payload = await request.body()
    await billing_service.handle_webhook(session, payload, stripe_signature)
    return Response(status_code=204)
