"""Supabase/PostgreSQL 스키마를 최초 1회 적용합니다."""
from __future__ import annotations

from lib.supabase_schema import apply_schema


def main() -> None:
    apply_schema()
    print()
    print("다음 단계:")
    print("  python run_crawling.py")


if __name__ == "__main__":
    main()
