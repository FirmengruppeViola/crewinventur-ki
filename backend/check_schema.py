import psycopg2

conn_string = "postgresql://postgres:CrewInv2026!Secure@db.pzgpvwzmlssmepvqtgnq.supabase.co:5432/postgres"

try:
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()

    # Check public tables
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)

    tables = cur.fetchall()
    print(f"Existing public tables ({len(tables)}):")
    for table in tables:
        print(f"  - {table[0]}")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
