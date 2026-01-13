import os
import sys

import psycopg2


def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable is not set.")
        print(
            "Set it to a PostgreSQL connection string, e.g. postgresql://USER:PASSWORD@HOST:5432/DB"
        )
        sys.exit(1)
    return database_url


def main() -> None:
    database_url = _get_database_url()

    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()

        # Check system categories
        cur.execute("SELECT COUNT(*) FROM categories WHERE is_system = TRUE")
        result = cur.fetchone()
        if result is None:
            raise RuntimeError("Expected COUNT(*) result, got no rows")
        category_count = result[0]
        print(f"System categories: {category_count}")

        # Check RLS
        cur.execute(
            """
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND rowsecurity = true
        """
        )
        rls_tables = cur.fetchall()
        print(f"\nRLS enabled on {len(rls_tables)} tables:")
        for table in rls_tables:
            print(f"  - {table[0]}")

        conn.close()
        print("\n[OK] Database setup verified!")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
