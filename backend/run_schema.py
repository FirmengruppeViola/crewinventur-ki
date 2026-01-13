import os
import sys
from pathlib import Path

import psycopg2


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    supabase_db_url = os.getenv("SUPABASE_DB_URL")
    if supabase_db_url:
        return supabase_db_url

    print(
        "[ERROR] Missing database connection string. Set DATABASE_URL (preferred) or SUPABASE_DB_URL.",
        file=sys.stderr,
    )
    sys.exit(1)


database_url = get_database_url()

try:
    schema_path = (
        Path(__file__).resolve().parent / ".." / "supabase-schema.sql"
    ).resolve()

    # Read SQL file
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()

    print("Connecting to database...")
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    cur = conn.cursor()

    print("Executing schema...")
    cur.execute(sql)

    print("[OK] Schema executed successfully!")

    # Verify tables
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)

    tables = cur.fetchall()
    print(f"\n[INFO] Created {len(tables)} tables:")
    for table in tables:
        print(f"  - {table[0]}")

    conn.close()
    print("\n[DONE] Setup complete!")

except Exception as e:
    print(f"[ERROR] {e}", file=sys.stderr)
    sys.exit(1)
