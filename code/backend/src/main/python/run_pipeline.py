"""크롤링 → 정제 → 업로드를 한 번에 실행합니다."""
from __future__ import annotations

import argparse

from lib.crawling_pipeline import run_crawling
from lib.keyword_final_pipeline import run_refine_pipeline, resolve_input_csv, DEFAULT_CRAWLING_RESULTS_DIR
from lib.supabase_import import main as upload_main


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="데이터 파이프라인 전체를 순서대로 실행합니다.")
    parser.add_argument(
        "--skip-crawling",
        action="store_true",
        help="이미 크롤링 결과가 있을 때 2~3단계만 실행합니다.",
    )
    parser.add_argument(
        "--skip-upload",
        action="store_true",
        help="Supabase 업로드 없이 크롤링·정제까지만 실행합니다.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.skip_crawling:
        print("=== 1/3 크롤링 ===")
        output_path = run_crawling()
        input_csv = output_path
    else:
        input_csv = resolve_input_csv(None, DEFAULT_CRAWLING_RESULTS_DIR)
        print(f"=== 1/3 크롤링 생략 (입력: {input_csv}) ===")

    print("\n=== 2/3 데이터 정제 ===")
    db_input_csv, dropped_csv, stats = run_refine_pipeline(input_csv)
    print(f"DB input row 수: {stats['db_input_rows']:,}")
    print(f"CSV 저장: {db_input_csv}")
    print(f"CSV 저장: {dropped_csv}")

    if args.skip_upload:
        print("\n업로드 생략")
        return

    print("\n=== 3/3 Supabase 업로드 ===")
    upload_main(["--use-cluster-preview"])
    print()
    print("다음 단계:")
    print("  python api_server.py")


if __name__ == "__main__":
    main()
