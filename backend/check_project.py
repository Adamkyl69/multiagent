"""Check the latest project snapshot structure."""
import json
import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / "backend.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get latest project
cursor.execute("SELECT id, title, status FROM projects ORDER BY created_at DESC LIMIT 1")
project = cursor.fetchone()
print(f"Latest project: {project}")

# Get latest version
cursor.execute("SELECT id, snapshot_json FROM project_versions ORDER BY created_at DESC LIMIT 1")
row = cursor.fetchone()
if row:
    version_id, snapshot_json = row
    print(f"\nVersion ID: {version_id}")
    
    snapshot = json.loads(snapshot_json)
    print(f"\nSnapshot keys: {list(snapshot.keys())}")
    print(f"Agents: {len(snapshot.get('agents', []))}")
    print(f"Flow: {len(snapshot.get('flow', []))}")
    
    if snapshot.get('agents'):
        print(f"\nFirst agent: {snapshot['agents'][0]}")
    
    if snapshot.get('flow'):
        print(f"\nFirst flow step: {snapshot['flow'][0]}")

conn.close()
