import psycopg2

conn_string = "postgresql://postgres:CrewInv2026!Secure@db.pzgpvwzmlssmepvqtgnq.supabase.co:5432/postgres"

try:
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()

    # Check system categories
    cur.execute("SELECT COUNT(*) FROM categories WHERE is_system = TRUE")
    category_count = cur.fetchone()[0]
    print(f"System categories: {category_count}")

    # Check RLS
    cur.execute("""
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND rowsecurity = true
    """)
    rls_tables = cur.fetchall()
    print(f"\nRLS enabled on {len(rls_tables)} tables:")
    for table in rls_tables:
        print(f"  - {table[0]}")

    conn.close()
    print("\n[OK] Database setup verified!")

except Exception as e:
    print(f"Error: {e}")
