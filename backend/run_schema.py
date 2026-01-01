import psycopg2
import sys

# Connection
conn_string = "postgresql://postgres:CrewInv2026!Secure@db.pzgpvwzmlssmepvqtgnq.supabase.co:5432/postgres"

try:
    # Read SQL file
    with open('../supabase-schema.sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    print("Connecting to Supabase...")
    conn = psycopg2.connect(conn_string)
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
