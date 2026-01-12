"""
Query Helper Utilities for Safe Pattern Matching.

Provides safe string escaping for SQL LIKE patterns to prevent
unintended wildcard matching and potential injection issues.
"""


def escape_like_pattern(value: str) -> str:
    """
    Escape SQL LIKE wildcards (% and _) in user input to prevent
    unintended pattern matching.

    PostgreSQL LIKE wildcards:
    - % matches any sequence of characters
    - _ matches any single character
    - Escape with backslash: \%, \_

    Also escape backslashes themselves: \\

    Args:
        value: Raw user input value

    Returns:
        Escaped pattern with wildcards escaped, wrapped in % for partial matching
    """
    if not value:
        return ""

    # Escape backslashes first, then wildcards
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def normalize_search_query(q: str | None, max_length: int = 100) -> str | None:
    """
    Normalize and validate search query.

    Args:
        q: Raw search query
        max_length: Maximum allowed length to prevent DoS

    Returns:
        Normalized query or None if empty/invalid
    """
    if not q:
        return None

    # Trim whitespace
    q = q.strip()

    # Enforce max length
    if len(q) > max_length:
        q = q[:max_length]

    # Return None if empty after trimming
    if not q:
        return None

    return q
