"""
Database seeding script for local development.
Creates a dev user, workspace, and subscription for testing.

Usage:
    python -m app.db_seed
"""
import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.db import async_session_factory
from app.models import Subscription, UsageBalance, User, Workspace, WorkspaceMembership


async def seed_dev_data():
    """Seed database with development test data."""
    async with async_session_factory() as session:
        # Check if dev user already exists
        existing_user = await session.scalar(
            select(User).where(User.email == "dev@example.com")
        )
        
        if existing_user:
            print("✅ Dev data already exists. Skipping seed.")
            return

        print("Creating dev user and workspace...")
        
        # Create dev user
        user = User(
            auth_user_id="dev-user-auth-id",
            email="dev@example.com",
            display_name="Dev User",
        )
        session.add(user)
        await session.flush()

        # Create dev workspace
        workspace = Workspace(
            owner_user_id=user.id,
            name="Dev Workspace",
        )
        session.add(workspace)
        await session.flush()

        # Create workspace membership
        membership = WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=user.id,
            role="owner",
        )
        session.add(membership)

        # Create trial subscription
        now = datetime.now(timezone.utc)
        subscription = Subscription(
            workspace_id=workspace.id,
            plan_code="trial",
            status="trialing",
            period_start=now,
            period_end=now + timedelta(days=30),
        )
        session.add(subscription)
        await session.flush()

        # Create usage balance
        usage_balance = UsageBalance(
            workspace_id=workspace.id,
            billing_period_start=now,
            billing_period_end=now + timedelta(days=30),
            included_tokens=250000,
            used_tokens=0,
            included_cost_cents=5000,
            used_cost_cents=0,
        )
        session.add(usage_balance)

        await session.commit()
        
        print("✅ Dev data seeded successfully!")
        print(f"   User: {user.email}")
        print(f"   Workspace: {workspace.name}")
        print(f"   Subscription: {subscription.plan_code} ({subscription.status})")


if __name__ == "__main__":
    asyncio.run(seed_dev_data())
