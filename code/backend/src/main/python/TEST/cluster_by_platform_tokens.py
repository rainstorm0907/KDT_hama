# -*- coding: utf-8 -*-
"""플랫폼별 상품명을 공백 토큰 기준으로 클러스터링합니다."""

import argparse
import itertools
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import pandas as pd


RESULT_DIR = Path(__file__).with_name("results")
DEFAULT_INPUT_PATH = RESULT_DIR / "latest_crawling_no_filter.csv"
DEFAULT_OUTPUT_DIR = RESULT_DIR / "clusters"
DEFAULT_THRESHOLD = 0.35
DEFAULT_MIN_SHARED_TOKENS = 1


def normalize_text(value):
    text = str(value).lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize_by_space(value):
    """공백으로만 1차 분리하되, 토큰 양끝의 특수문자는 정리합니다."""
    text = normalize_text(value)
    tokens = []
    for token in text.split(" "):
        token = re.sub(r"^[^\w가-힣]+|[^\w가-힣]+$", "", token)
        if token:
            tokens.append(token)
    return tokens


def jaccard_similarity(left_tokens, right_tokens):
    if not left_tokens and not right_tokens:
        return 0.0

    intersection_count = len(left_tokens & right_tokens)
    union_count = len(left_tokens | right_tokens)
    return intersection_count / union_count if union_count else 0.0


class UnionFind:
    def __init__(self, size):
        self.parent = list(range(size))

    def find(self, value):
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left, right):
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            self.parent[right_root] = left_root
        else:
            self.parent[left_root] = right_root


def safe_name(value):
    return re.sub(r"[^0-9A-Za-z가-힣_-]+", "_", str(value)).strip("_") or "unknown"


def merge_unique(values, limit=None):
    unique_values = [str(value).strip() for value in values if str(value).strip()]
    unique_values = list(dict.fromkeys(unique_values))
    if limit is not None:
        unique_values = unique_values[:limit]
    return " | ".join(unique_values)


def choose_representative(names):
    candidates = [str(name).strip() for name in names if str(name).strip()]
    if not candidates:
        return ""
    return max(candidates, key=lambda name: (len(set(tokenize_by_space(name))), len(name)))


def build_clusters(platform_df, platform, threshold, min_shared_tokens):
    working_df = platform_df.reset_index(drop=True)
    token_sets = [set(tokenize_by_space(name)) for name in working_df["name"].fillna("")]
    token_lists = [tokenize_by_space(name) for name in working_df["name"].fillna("")]
    union_find = UnionFind(len(working_df))

    token_to_rows = defaultdict(list)
    for row_idx, tokens in enumerate(token_sets):
        for token in tokens:
            token_to_rows[token].append(row_idx)

    checked_pairs = set()
    for candidate_rows in token_to_rows.values():
        for left_idx, right_idx in itertools.combinations(candidate_rows, 2):
            pair = (left_idx, right_idx) if left_idx < right_idx else (right_idx, left_idx)
            if pair in checked_pairs:
                continue
            checked_pairs.add(pair)

            shared_count = len(token_sets[left_idx] & token_sets[right_idx])
            if shared_count < min_shared_tokens:
                continue

            similarity = jaccard_similarity(token_sets[left_idx], token_sets[right_idx])
            if similarity >= threshold:
                union_find.union(left_idx, right_idx)

    root_to_rows = defaultdict(list)
    for row_idx in range(len(working_df)):
        root_to_rows[union_find.find(row_idx)].append(row_idx)

    sorted_clusters = sorted(root_to_rows.values(), key=lambda rows: min(rows))
    cluster_id_by_row = {}
    cluster_meta = {}

    for cluster_no, row_indices in enumerate(sorted_clusters, start=1):
        cluster_id = f"{safe_name(platform)}_{cluster_no:03d}"
        cluster_names = working_df.loc[row_indices, "name"].fillna("").tolist()
        token_counter = Counter()
        for row_idx in row_indices:
            token_counter.update(token_lists[row_idx])

        cluster_tokens = " ".join(token for token, _ in token_counter.most_common())
        representative_name = choose_representative(cluster_names)
        cluster_size = len(row_indices)

        for row_idx in row_indices:
            cluster_id_by_row[row_idx] = cluster_id

        cluster_meta[cluster_id] = {
            "platform": platform,
            "cluster_id": cluster_id,
            "cluster_size": cluster_size,
            "representative_name": representative_name,
            "cluster_tokens": cluster_tokens,
            "matched_keywords": merge_unique(working_df.loc[row_indices, "keyword"].fillna("")),
            "sample_names": merge_unique(cluster_names, limit=5),
        }

    item_rows = []
    for row_idx, row in working_df.iterrows():
        cluster_id = cluster_id_by_row[row_idx]
        meta = cluster_meta[cluster_id]
        item = row.to_dict()
        item.update(
            {
                "token_text": " ".join(token_lists[row_idx]),
                "token_count": len(token_lists[row_idx]),
                "cluster_id": cluster_id,
                "cluster_size": meta["cluster_size"],
                "representative_name": meta["representative_name"],
                "cluster_tokens": meta["cluster_tokens"],
            }
        )
        item_rows.append(item)

    return item_rows, list(cluster_meta.values())


def resolve_input_path(input_path):
    if input_path.exists():
        return input_path

    candidates = sorted(RESULT_DIR.glob("통합조회_전체_no_filter_*.csv"), key=lambda path: path.stat().st_mtime)
    if candidates:
        return candidates[-1]

    raise FileNotFoundError(
        f"입력 파일을 찾을 수 없습니다. 먼저 크롤링을 실행하거나 --input으로 CSV 경로를 지정하세요: {input_path}"
    )


def parse_args():
    parser = argparse.ArgumentParser(description="크롤링 결과를 플랫폼별 공백 토큰 기준으로 클러스터링합니다.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT_PATH, help="크롤링 결과 CSV 경로")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="클러스터링 결과 저장 폴더")
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD, help="Jaccard 유사도 임계값")
    parser.add_argument(
        "--min-shared-tokens",
        type=int,
        default=DEFAULT_MIN_SHARED_TOKENS,
        help="같은 클러스터로 묶기 위한 최소 공통 토큰 수",
    )
    return parser.parse_args()


def run_clustering(
    input_path=DEFAULT_INPUT_PATH,
    output_dir=DEFAULT_OUTPUT_DIR,
    threshold=DEFAULT_THRESHOLD,
    min_shared_tokens=DEFAULT_MIN_SHARED_TOKENS,
):
    input_path = resolve_input_path(Path(input_path))
    output_dir = Path(output_dir)
    df = pd.read_csv(input_path, encoding="utf-8-sig")

    required_columns = {"platform", "name"}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        raise ValueError(f"입력 CSV에 필수 컬럼이 없습니다: {', '.join(sorted(missing_columns))}")

    if "keyword" not in df.columns:
        df["keyword"] = ""

    item_rows = []
    summary_rows = []
    for platform, platform_df in df.groupby("platform", dropna=False):
        platform_item_rows, platform_summary_rows = build_clusters(
            platform_df=platform_df,
            platform=platform,
            threshold=threshold,
            min_shared_tokens=min_shared_tokens,
        )
        item_rows.extend(platform_item_rows)
        summary_rows.extend(platform_summary_rows)

    now = datetime.now().strftime("%Y%m%d_%H%M")
    output_dir.mkdir(parents=True, exist_ok=True)

    item_df = pd.DataFrame(item_rows)
    summary_df = pd.DataFrame(summary_rows)
    if not summary_df.empty:
        summary_df = summary_df.sort_values(["platform", "cluster_size"], ascending=[True, False])

    item_output_path = output_dir / f"token_cluster_items_{now}.csv"
    summary_output_path = output_dir / f"token_cluster_summary_{now}.csv"
    latest_item_path = output_dir / "latest_token_cluster_items.csv"
    latest_summary_path = output_dir / "latest_token_cluster_summary.csv"

    item_df.to_csv(item_output_path, index=False, encoding="utf-8-sig")
    summary_df.to_csv(summary_output_path, index=False, encoding="utf-8-sig")
    item_df.to_csv(latest_item_path, index=False, encoding="utf-8-sig")
    summary_df.to_csv(latest_summary_path, index=False, encoding="utf-8-sig")

    print(f"입력 파일: {input_path}")
    print(f"상품별 클러스터 결과: {item_output_path}")
    print(f"클러스터 요약 결과: {summary_output_path}")
    print("\n플랫폼별 클러스터 수")
    if summary_df.empty:
        print("클러스터링할 데이터가 없습니다.")
    else:
        print(summary_df.groupby("platform")["cluster_id"].count())

    return {
        "input_path": input_path,
        "item_output_path": item_output_path,
        "summary_output_path": summary_output_path,
        "latest_item_path": latest_item_path,
        "latest_summary_path": latest_summary_path,
    }


def main():
    args = parse_args()
    run_clustering(
        input_path=args.input,
        output_dir=args.output_dir,
        threshold=args.threshold,
        min_shared_tokens=args.min_shared_tokens,
    )


if __name__ == "__main__":
    main()
