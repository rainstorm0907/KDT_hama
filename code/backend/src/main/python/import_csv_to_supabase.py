"""호환용 래퍼. 새 실행 진입점은 run_upload.py 입니다."""
from __future__ import annotations

import sys

from lib.supabase_import import SupabaseRepositoryError, main


if __name__ == "__main__":
    try:
        main(sys.argv[1:] or None)
    except SupabaseRepositoryError as exc:
        raise SystemExit(str(exc)) from exc
