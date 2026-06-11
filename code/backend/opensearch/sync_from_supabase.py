from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
PYTHON_DIR = BACKEND_DIR / "src" / "main" / "python"
# opensearch-protobufs(pip)의 최상위 opensearch 패키지가 로컬 opensearch 패키지를
# 가리므로 반드시 sys.path 맨 앞에 둔다 (api_server.py와 동일한 이슈).
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PYTHON_DIR) not in sys.path:
    sys.path.insert(1, str(PYTHON_DIR))

from opensearch.documents import build_search_document_from_item_row
from opensearch.repository import bulk_index_documents, ensure_index
from lib.supabase_repository import load_item_rows_for_opensearch


def main() -> None:
    args = parse_args()
    rows = load_item_rows_for_opensearch(limit=args.limit)
    documents = [
        document
        for row in rows
        if (document := build_search_document_from_item_row(row)) is not None
    ]

    ensure_index(recreate=args.recreate)
    indexed_count = bulk_index_documents(documents)
    print(f"Indexed {indexed_count}/{len(rows)} item(s) into OpenSearch.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Hama Supabase items into OpenSearch.")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of items to sync. Omit this option to sync every item.",
    )
    parser.add_argument("--recreate", action="store_true", help="Recreate the OpenSearch index before sync.")
    return parser.parse_args()


if __name__ == "__main__":
    main()
