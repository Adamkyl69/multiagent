from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Subscription, UsageBalance, User, Workspace, WorkspaceMembership, utc_now
from app.schemas import AuthContext


class IdentityService:
    async def ensure_user_workspace(
        self,
        session: AsyncSession,
        auth: AuthContext,
    ) -> tuple[User, Workspace, Subscription, UsageBalance]:
        user = await session.scalar(select(User).where(User.auth_user_id == auth.auth_subject))
        if user is None:
            # Check if user exists by email (for dev mode where auth_user_id might change)
            email = auth.email or f"{auth.auth_subject}@example.local"
            user = await session.scalar(select(User).where(User.email == email))
            if user is None:
                user = User(auth_user_id=auth.auth_subject, email=email, display_name=auth.display_name)
                session.add(user)
                await session.flush()
            else:
                # Update auth_user_id if user exists with this email
                user.auth_user_id = auth.auth_subject
                await session.flush()

        workspace = await self._load_primary_workspace(session, user.id)
        if workspace is None:
            workspace = Workspace(owner_user_id=user.id, name=settings.default_dev_workspace_name)
            session.add(workspace)
            await session.flush()
            session.add(WorkspaceMembership(workspace_id=workspace.id, user_id=user.id, role="owner"))

        subscription = await session.scalar(select(Subscription).where(Subscription.workspace_id == workspace.id))
        if subscription is None:
            now = utc_now()
            subscription = Subscription(
                workspace_id=workspace.id,
                plan_code="trial",
                status="trialing",
                period_start=now,
                period_end=now + timedelta(days=30),
            )
            session.add(subscription)

        usage_balance = await session.scalar(select(UsageBalance).where(UsageBalance.workspace_id == workspace.id))
        if usage_balance is None:
            now = utc_now()
            usage_balance = UsageBalance(
                workspace_id=workspace.id,
                billing_period_start=now,
                billing_period_end=now + timedelta(days=30),
            )
            session.add(usage_balance)

        await session.commit()
        await session.refresh(user)
        await session.refresh(workspace)
        await session.refresh(subscription)
        await session.refresh(usage_balance)
        return user, workspace, subscription, usage_balance

    async def _load_primary_workspace(self, session: AsyncSession, user_id: str) -> Workspace | None:
        membership = await session.scalar(
            select(WorkspaceMembership).where(WorkspaceMembership.user_id == user_id).limit(1)
        )
        if membership is None:
            return None
        return await session.scalar(select(Workspace).where(Workspace.id == membership.workspace_id))
