import asyncio
import logging
from datetime import datetime, timezone

import stripe
from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import BillingLedgerEntry, MonthlyUsageSummary, Subscription, UsageBalance, UsageEvent
from app.schemas import CheckoutSessionResponse, PlanResponse, UsageEventResponse, UsageOverviewResponse

logger = logging.getLogger(__name__)


class BillingService:
    async def get_billing_state(self, session: AsyncSession, workspace_id: str) -> tuple[Subscription, UsageBalance]:
        subscription = await session.scalar(select(Subscription).where(Subscription.workspace_id == workspace_id))
        usage_balance = await session.scalar(select(UsageBalance).where(UsageBalance.workspace_id == workspace_id))

        if subscription is None or usage_balance is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Workspace billing is not initialized.")

        return subscription, usage_balance

    async def ensure_usage_available(self, session: AsyncSession, workspace_id: str) -> tuple[Subscription, UsageBalance]:
        subscription, usage_balance = await self.get_billing_state(session, workspace_id)

        if subscription.status in {"canceled", "incomplete_expired", "unpaid"}:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Subscription is not active.")

        # Log usage for debugging
        logger.info(
            f"Usage check - Tokens: {usage_balance.used_tokens}/{usage_balance.included_tokens}, "
            f"Cost: ${usage_balance.used_cost_cents/100:.2f}/${usage_balance.included_cost_cents/100:.2f}"
        )

        if usage_balance.used_tokens >= usage_balance.included_tokens or usage_balance.used_cost_cents >= usage_balance.included_cost_cents:
            logger.warning(
                f"Usage limit exceeded - Tokens: {usage_balance.used_tokens}/{usage_balance.included_tokens}, "
                f"Cost: ${usage_balance.used_cost_cents/100:.2f}/${usage_balance.included_cost_cents/100:.2f}"
            )
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Usage limit reached for the current billing period.")

        return subscription, usage_balance

    async def record_usage(
        self,
        session: AsyncSession,
        *,
        user_id: str,
        workspace_id: str,
        provider: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost_estimate_cents: int,
        project_id: str | None = None,
        run_id: str | None = None,
        agent_configuration_id: str | None = None,
        status_text: str = "succeeded",
    ) -> UsageEvent:
        total_tokens = input_tokens + output_tokens
        event = UsageEvent(
            user_id=user_id,
            workspace_id=workspace_id,
            project_id=project_id,
            run_id=run_id,
            agent_configuration_id=agent_configuration_id,
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cost_estimate_cents=cost_estimate_cents,
            status=status_text,
        )
        session.add(event)
        await session.flush()

        usage_balance = await session.scalar(select(UsageBalance).where(UsageBalance.workspace_id == workspace_id))
        if usage_balance is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Usage balance is not initialized.")

        usage_balance.used_tokens += total_tokens
        usage_balance.used_cost_cents += cost_estimate_cents

        month_key = datetime.utcnow().strftime("%Y-%m")
        summary = await session.scalar(
            select(MonthlyUsageSummary).where(
                MonthlyUsageSummary.workspace_id == workspace_id,
                MonthlyUsageSummary.month_key == month_key,
            )
        )
        if summary is None:
            summary = MonthlyUsageSummary(
                workspace_id=workspace_id,
                month_key=month_key,
                total_tokens=0,
                total_cost_cents=0,
                total_runs=0,
            )
            session.add(summary)
            await session.flush()

        summary.total_tokens += total_tokens
        summary.total_cost_cents += cost_estimate_cents

        subscription = await session.scalar(select(Subscription).where(Subscription.workspace_id == workspace_id))
        ledger_entry = BillingLedgerEntry(
            workspace_id=workspace_id,
            user_id=user_id,
            subscription_id=subscription.id if subscription else None,
            usage_event_id=event.id,
            entry_type="usage",
            amount_cents=cost_estimate_cents,
            description=f"{provider}/{model} usage",
            period_key=month_key,
        )
        session.add(ledger_entry)
        return event

    async def get_usage_overview(self, session: AsyncSession, workspace_id: str) -> UsageOverviewResponse:
        subscription, usage_balance = await self.get_billing_state(session, workspace_id)
        return UsageOverviewResponse(
            workspace_id=workspace_id,
            subscription_status=subscription.status,
            plan_code=subscription.plan_code,
            included_tokens=usage_balance.included_tokens,
            used_tokens=usage_balance.used_tokens,
            remaining_tokens=max(usage_balance.included_tokens - usage_balance.used_tokens, 0),
            included_cost_cents=usage_balance.included_cost_cents,
            used_cost_cents=usage_balance.used_cost_cents,
            remaining_cost_cents=max(usage_balance.included_cost_cents - usage_balance.used_cost_cents, 0),
            current_period_start=usage_balance.billing_period_start,
            current_period_end=usage_balance.billing_period_end,
        )

    async def get_plan(self, session: AsyncSession, workspace_id: str) -> PlanResponse:
        subscription, _ = await self.get_billing_state(session, workspace_id)
        return PlanResponse(
            workspace_id=workspace_id,
            plan_code=subscription.plan_code,
            subscription_status=subscription.status,
            stripe_customer_id=subscription.stripe_customer_id,
            stripe_subscription_id=subscription.stripe_subscription_id,
            period_start=subscription.period_start,
            period_end=subscription.period_end,
        )

    async def list_usage_history(self, session: AsyncSession, workspace_id: str, limit: int = 100) -> list[UsageEventResponse]:
        result = await session.scalars(
            select(UsageEvent)
            .where(UsageEvent.workspace_id == workspace_id)
            .order_by(desc(UsageEvent.occurred_at))
            .limit(limit)
        )
        return [
            UsageEventResponse(
                id=item.id,
                provider=item.provider,
                model=item.model,
                input_tokens=item.input_tokens,
                output_tokens=item.output_tokens,
                total_tokens=item.total_tokens,
                cost_estimate_cents=item.cost_estimate_cents,
                status=item.status,
                occurred_at=item.occurred_at,
                project_id=item.project_id,
                run_id=item.run_id,
            )
            for item in result.all()
        ]

    async def create_checkout_session(
        self,
        session: AsyncSession,
        *,
        workspace_id: str,
        user_email: str | None,
        price_id: str | None,
    ) -> CheckoutSessionResponse:
        subscription = await session.scalar(select(Subscription).where(Subscription.workspace_id == workspace_id))
        if subscription is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found.")

        if not settings.stripe_secret_key:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe is not configured.")

        selected_price_id = price_id or settings.stripe_price_id_pro
        if not selected_price_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No Stripe price is configured.")

        stripe.api_key = settings.stripe_secret_key

        customer_id = subscription.stripe_customer_id
        if not customer_id:
            customer = await asyncio.to_thread(
                stripe.Customer.create,
                email=user_email,
                metadata={"workspace_id": workspace_id},
            )
            customer_id = customer.id
            subscription.stripe_customer_id = customer_id
            await session.commit()

        checkout_session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="subscription",
            customer=customer_id,
            line_items=[{"price": selected_price_id, "quantity": 1}],
            success_url=f"{settings.frontend_url}/billing?status=success",
            cancel_url=f"{settings.frontend_url}/billing?status=cancel",
            metadata={"workspace_id": workspace_id},
        )
        return CheckoutSessionResponse(checkout_url=checkout_session.url, session_id=checkout_session.id)

    async def handle_webhook(self, session: AsyncSession, payload: bytes, signature: str | None) -> None:
        if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe webhook is not configured.")
        if not signature:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe signature.")

        stripe.api_key = settings.stripe_secret_key
        try:
            event = stripe.Webhook.construct_event(payload=payload, sig_header=signature, secret=settings.stripe_webhook_secret)
        except stripe.error.SignatureVerificationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature.") from exc

        event_type = event["type"]
        object_data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            customer_id = object_data.get("customer")
            subscription_id = object_data.get("subscription")
            subscription = await session.scalar(select(Subscription).where(Subscription.stripe_customer_id == customer_id))
            if subscription is not None:
                subscription.stripe_subscription_id = subscription_id
                subscription.status = "active"
                subscription.plan_code = "pro"
                await session.commit()
            return

        if event_type in {"customer.subscription.updated", "customer.subscription.deleted"}:
            stripe_subscription_id = object_data.get("id")
            subscription = await session.scalar(select(Subscription).where(Subscription.stripe_subscription_id == stripe_subscription_id))
            if subscription is not None:
                subscription.status = object_data.get("status", subscription.status)
                subscription.period_start = datetime.fromtimestamp(object_data.get("current_period_start"), tz=timezone.utc) if object_data.get("current_period_start") else subscription.period_start
                subscription.period_end = datetime.fromtimestamp(object_data.get("current_period_end"), tz=timezone.utc) if object_data.get("current_period_end") else subscription.period_end
                if event_type == "customer.subscription.deleted":
                    subscription.status = "canceled"
                await session.commit()
