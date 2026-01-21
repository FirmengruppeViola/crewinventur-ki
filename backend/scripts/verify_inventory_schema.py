import os
import sys

import psycopg2


def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL environment variable is not set.")
        sys.exit(1)
    return database_url


def _fetch_one(cur, query: str, params: tuple | None = None):
    cur.execute(query, params or ())
    row = cur.fetchone()
    if row is None:
        raise RuntimeError("Expected a row, got none")
    return row


def main() -> None:
    database_url = _get_database_url()

    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()

        # Check inventory_session_differences exists
        row = _fetch_one(
            cur,
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'inventory_session_differences'
            """,
        )
        if row[0] != 1:
            raise RuntimeError("inventory_session_differences table missing")

        # Check inventory_audit_logs exists
        row = _fetch_one(
            cur,
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'inventory_audit_logs'
            """,
        )
        if row[0] != 1:
            raise RuntimeError("inventory_audit_logs table missing")

        # Check total_price is generated (ALWAYS)
        row = _fetch_one(
            cur,
            """
            SELECT is_generated
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'inventory_items'
            AND column_name = 'total_price'
            """,
        )
        if row[0] != "ALWAYS":
            raise RuntimeError("inventory_items.total_price should be generated")

        print("[OK] Inventory schema verified.")
        conn.close()
    except Exception as exc:
        print(f"Error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
