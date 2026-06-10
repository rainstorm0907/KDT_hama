"""keyword_final.ipynb 배치 파이프라인을 CLI에서 실행합니다."""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

from lib._paths import PYTHON_DIR
from lib.item_rating import enrich_dataframe_with_rating
from lib.keyword_preprocessing import (
    DROP_REASON_INVALID_PRICE,
    DROP_REASON_MISSING_REQUIRED,
    DROP_REASON_NAME_BLACKLIST,
    DROP_STAGE_KEYWORD_PRICE_OUTLIER,
    DROP_STAGE_PRODUCT_NAME_PRICE_OUTLIER,
    append_pipeline_drops,
    build_keyword_token_stage_clusters,
    build_pipeline_dropped_df,
    filter_dataframe_price_outliers,
    format_dropped_export_df,
    matched_drop_keywords,
    reset_pipeline_drops,
)

DEFAULT_CRAWLING_RESULTS_DIR = PYTHON_DIR / "crawling" / "results"
DEFAULT_HANDOFF_DIR = PYTHON_DIR / "analysis" / "handoff"
DEFAULT_DB_INPUT_CSV = DEFAULT_HANDOFF_DIR / "keyword_db_input_df.csv"
DEFAULT_DROPPED_CSV = DEFAULT_HANDOFF_DIR / "keyword_dropped_df.csv"


def resolve_input_csv(input_path: Path | None, results_dir: Path) -> Path:
    if input_path is not None:
        if not input_path.exists():
            raise FileNotFoundError(f"입력 CSV를 찾을 수 없습니다: {input_path}")
        return input_path

    candidates = sorted(
        results_dir.glob("통합조회_전체*.csv"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(f"크롤링 결과 CSV가 없습니다: {results_dir}")
    return candidates[0]


def _filter_required_and_blacklist(source_df: pd.DataFrame) -> pd.DataFrame:
    missing_required_mask = (
        source_df["keyword"].isna() | source_df["name"].isna() | source_df["price_numeric"].isna()
    )
    append_pipeline_drops(
        source_df[missing_required_mask],
        DROP_REASON_MISSING_REQUIRED,
        "input_validation",
        "keyword/name/price 누락",
    )

    valid_required_df = source_df[~missing_required_mask].copy()
    invalid_price_mask = valid_required_df["price_numeric"] <= 0
    append_pipeline_drops(
        valid_required_df[invalid_price_mask],
        DROP_REASON_INVALID_PRICE,
        "input_validation",
        "price <= 0 또는 숫자 변환 실패",
    )

    working_df = valid_required_df[~invalid_price_mask].copy()
    working_df["price_numeric"] = working_df["price_numeric"].astype(int)
    working_df["matched_drop_keywords"] = working_df["name"].apply(matched_drop_keywords)
    working_df["name_blacklist_drop"] = working_df["matched_drop_keywords"].apply(bool)
    working_df["matched_drop_keywords_text"] = working_df["matched_drop_keywords"].apply(
        lambda values: " | ".join(values)
    )

    blacklist_drop_df = working_df[working_df["name_blacklist_drop"]].copy()
    append_pipeline_drops(
        blacklist_drop_df,
        DROP_REASON_NAME_BLACKLIST,
        "name_blacklist",
        blacklist_drop_df["matched_drop_keywords_text"],
    )
    return working_df[~working_df["name_blacklist_drop"]].copy()


def run_refine_pipeline(
    input_csv: Path,
    *,
    db_input_csv: Path = DEFAULT_DB_INPUT_CSV,
    dropped_csv: Path = DEFAULT_DROPPED_CSV,
) -> tuple[Path, Path, dict[str, int]]:
    reset_pipeline_drops()

    source_df = pd.read_csv(input_csv, encoding="utf-8-sig")
    source_df["price_numeric"] = pd.to_numeric(source_df["price"], errors="coerce")

    filtered_df = _filter_required_and_blacklist(source_df)
    keyword_clean_df = filter_dataframe_price_outliers(
        filtered_df,
        group_column="keyword",
        drop_stage=DROP_STAGE_KEYWORD_PRICE_OUTLIER,
    )
    clustered_df, _, _ = build_keyword_token_stage_clusters(keyword_clean_df)
    token_stage_cluster_item_df = filter_dataframe_price_outliers(
        clustered_df,
        group_column="cluster_product_name",
        drop_stage=DROP_STAGE_PRODUCT_NAME_PRICE_OUTLIER,
    )

    cluster_token_columns = [
        column
        for column in token_stage_cluster_item_df.columns
        if re.fullmatch(r"c\d+", column)
    ]
    base_db_columns = [
        "keyword",
        "platform",
        "pid",
        "name",
        "cluster_product_name",
        "cluster_route",
        "price_numeric",
        "status",
        "link",
        "date",
        "cluster_name_text",
        "tokenized_cluster_name_text",
    ]
    db_save_columns = [
        column
        for column in [*base_db_columns, *cluster_token_columns]
        if column in token_stage_cluster_item_df.columns
    ]
    db_save_df = token_stage_cluster_item_df[db_save_columns].copy()
    db_save_df = db_save_df.sort_values(
        ["keyword", "cluster_product_name", "price_numeric", "platform", "pid"],
        ascending=[True, True, True, True, True],
    ).reset_index(drop=True)

    db_save_rating_df = enrich_dataframe_with_rating(
        db_save_df,
        cluster_column="cluster_product_name",
        price_column="price_numeric",
        viewed_at_column="date" if "date" in db_save_df.columns else None,
        cluster_route_column="cluster_route" if "cluster_route" in db_save_df.columns else None,
    )
    rating_columns = [
        "rating",
        "cluster_score",
        "price_score",
        "view_score",
        "recency_score",
        "cluster_confidence",
        "view_count",
    ]
    db_input_columns = [
        column
        for column in [*db_save_columns, *rating_columns]
        if column in db_save_rating_df.columns
    ]
    db_input_df = db_save_rating_df[db_input_columns].copy()
    dropped_export_df = format_dropped_export_df(build_pipeline_dropped_df())

    db_input_csv.parent.mkdir(parents=True, exist_ok=True)
    db_input_df.to_csv(db_input_csv, index=False, encoding="utf-8-sig")
    dropped_export_df.to_csv(dropped_csv, index=False, encoding="utf-8-sig")

    dropped_df = build_pipeline_dropped_df()
    keyword_outlier_drops = 0
    product_name_outlier_drops = 0
    if not dropped_df.empty and "drop_stage" in dropped_df.columns:
        keyword_outlier_drops = int((dropped_df["drop_stage"] == DROP_STAGE_KEYWORD_PRICE_OUTLIER).sum())
        product_name_outlier_drops = int(
            (dropped_df["drop_stage"] == DROP_STAGE_PRODUCT_NAME_PRICE_OUTLIER).sum()
        )

    stats = {
        "source_rows": len(source_df),
        "after_keyword_outlier_rows": len(keyword_clean_df),
        "after_product_name_outlier_rows": len(token_stage_cluster_item_df),
        "db_input_rows": len(db_input_df),
        "dropped_rows": len(dropped_export_df),
        "keyword_outlier_drops": keyword_outlier_drops,
        "product_name_outlier_drops": product_name_outlier_drops,
        "cluster_product_names": int(db_input_df["cluster_product_name"].nunique()),
    }
    return db_input_csv, dropped_csv, stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="크롤링 CSV를 전처리·클러스터링·rating 계산 후 handoff CSV로 저장합니다."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=None,
        help="크롤링 결과 CSV 경로. 비우면 crawling/results의 최신 통합조회_전체*.csv를 사용합니다.",
    )
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=DEFAULT_CRAWLING_RESULTS_DIR,
        help="기본 입력 CSV를 찾을 결과 폴더입니다.",
    )
    parser.add_argument(
        "--db-input-csv",
        type=Path,
        default=DEFAULT_DB_INPUT_CSV,
        help="DB 적재용 handoff CSV 출력 경로입니다.",
    )
    parser.add_argument(
        "--dropped-csv",
        type=Path,
        default=DEFAULT_DROPPED_CSV,
        help="제외된 row handoff CSV 출력 경로입니다.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    input_csv = resolve_input_csv(args.input, args.results_dir)
    db_input_csv, dropped_csv, stats = run_refine_pipeline(
        input_csv,
        db_input_csv=args.db_input_csv,
        dropped_csv=args.dropped_csv,
    )

    print(f"입력 CSV: {input_csv}")
    print(f"원본 row 수: {stats['source_rows']:,}")
    print(f"키워드 이상치 제거 후: {stats['after_keyword_outlier_rows']:,}")
    print(f"상품명 매칭 후 상품명별 이상치 제거: {stats['after_product_name_outlier_rows']:,}")
    print(f"DB input row 수: {stats['db_input_rows']:,}")
    print(f"매칭 상품명 후보 수: {stats['cluster_product_names']:,}")
    print(f"드랍 row 수: {stats['dropped_rows']:,}")
    print(
        "  - 키워드 이상치: "
        f"{stats['keyword_outlier_drops']:,}, "
        f"상품명 이상치: {stats['product_name_outlier_drops']:,}"
    )
    print(f"CSV 저장: {db_input_csv}")
    print(f"CSV 저장: {dropped_csv}")
    print()
    print("다음 단계:")
    print("  python run_upload.py")


if __name__ == "__main__":
    main()
