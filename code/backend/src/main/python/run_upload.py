"""3단계: handoff CSV를 Supabase items / price_history에 적재합니다."""
from __future__ import annotations

import sys

from lib.supabase_import import SupabaseRepositoryError, main


def run() -> None:
    argv = sys.argv[1:]
    if not argv:
        argv = ["--use-cluster-preview"]
    main(argv)
    print()
    print("다음 단계:")
    print("  python api_server.py")


if __name__ == "__main__":
    try:
        run()
    except SupabaseRepositoryError as exc:
        raise SystemExit(str(exc)) from exc
