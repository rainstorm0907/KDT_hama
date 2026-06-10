from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv
from psycopg import connect

from lib._paths import PYTHON_DIR

REPO_ROOT = PYTHON_DIR.parents[4]
MIGRATIONS_DIR = REPO_ROOT / "code" / "supabase" / "migrations"


def apply_schema() -> int:
    load_dotenv(PYTHON_DIR / ".env")
    database_url = os.environ.get("SUPABASE_DATABASE_URL", "").strip()
    if not database_url:
        raise SystemExit("SUPABASE_DATABASE_URL is required in code/backend/src/main/python/.env")

    migration_paths = sorted(MIGRATIONS_DIR.glob("*.sql"))
    if not migration_paths:
        raise SystemExit(f"No Supabase migration files found in {MIGRATIONS_DIR}")

    parsed_url = urlparse(database_url)
    with connect(
        host=parsed_url.hostname,
        port=parsed_url.port or 5432,
        dbname=parsed_url.path.lstrip("/") or "postgres",
        user=unquote(parsed_url.username or ""),
        password=unquote(parsed_url.password or ""),
        sslmode="require",
    ) as connection:
        with connection.cursor() as cursor:
            for migration_path in migration_paths:
                cursor.execute(migration_path.read_text(encoding="utf-8"))
        connection.commit()

    print(f"Applied {len(migration_paths)} migration file(s) from {MIGRATIONS_DIR}")
    return len(migration_paths)
