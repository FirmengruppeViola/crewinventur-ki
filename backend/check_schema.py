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

        # Check public tables
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """
        )

        tables = cur.fetchall()
        print(f"Existing public tables ({len(tables)}):")
        for table in tables:
            print(f"  - {table[0]}")

        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
