"""
Database initialization script for creating all tables.
Works with both SQLite (local dev) and PostgreSQL (Supabase).

Usage:
    python -m app.db_init
"""
import asyncio

from app.db import Base, engine
from app.models import (
    AgentConfiguration,
    BillingLedgerEntry,
    ClarificationQuestion,
    ClarificationSession,
    DebateMessage,
    DebateRun,
    FinalOutput,
    FlowConfiguration,
    MonthlyUsageSummary,
    Project,
    ProjectVersion,
    RunEvent,
    Subscription,
    UsageBalance,
    UsageEvent,
    User,
    Workspace,
    WorkspaceMembership,
)


async def create_tables():
    """Create all database tables from SQLAlchemy models."""
    print("Creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ All tables created successfully!")
    print(f"Database: {engine.url}")


async def drop_tables():
    """Drop all database tables. USE WITH CAUTION!"""
    print("⚠️  Dropping all database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("✅ All tables dropped!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--drop":
        confirm = input("⚠️  This will DELETE all tables and data. Type 'yes' to confirm: ")
        if confirm.lower() == "yes":
            asyncio.run(drop_tables())
        else:
            print("Aborted.")
    else:
        asyncio.run(create_tables())
