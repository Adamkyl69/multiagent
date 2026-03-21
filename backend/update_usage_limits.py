"""
Quick script to update usage limits in the database.
Run this to increase token and cost limits for development.
"""
import asyncio
import sqlite3
from pathlib import Path


async def update_limits():
    db_path = Path(__file__).parent / "backend.db"
    
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Show current limits
    cursor.execute("SELECT id, included_tokens, used_tokens, included_cost_cents, used_cost_cents FROM usage_balances")
    rows = cursor.fetchall()
    
    print("Current usage balances:")
    for row in rows:
        print(f"  ID: {row[0]}")
        print(f"  Tokens: {row[2]:,} / {row[1]:,}")
        print(f"  Cost: ${row[4]/100:.2f} / ${row[3]/100:.2f}")
        print()
    
    # Update limits
    cursor.execute("""
        UPDATE usage_balances 
        SET 
            included_tokens = 10000000,
            included_cost_cents = 500000
    """)
    
    conn.commit()
    
    # Show updated limits
    cursor.execute("SELECT id, included_tokens, used_tokens, included_cost_cents, used_cost_cents FROM usage_balances")
    rows = cursor.fetchall()
    
    print("Updated usage balances:")
    for row in rows:
        print(f"  ID: {row[0]}")
        print(f"  Tokens: {row[2]:,} / {row[1]:,}")
        print(f"  Cost: ${row[4]/100:.2f} / ${row[3]/100:.2f}")
        print()
    
    conn.close()
    print("✅ Usage limits updated successfully!")


if __name__ == "__main__":
    asyncio.run(update_limits())
