from __future__ import annotations

import argparse
import csv
import itertools
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any


BASE_DIR = Path(__file__).resolve().parent
PYTHON_DIR = BASE_DIR.parent
DEFAULT_RESULTS_DIR = PYTHON_DIR / "crawling" / "results"
DEFAULT_OUTPUT_DIR = BASE_DIR / "results" / "bracket_clusters"
DEFAULT_THRESHOLD = 0.35
DEFAULT_MIN_SHARED_TOKENS = 1
BRACKET_PATTERN = re.compile(r"\[([^\[\]]+)\]")


@dataclass
class BracketContentStats:
    content: str
    normalized_content: str
    tokens: tuple[str, ...]
    count: int = 0
    platform_counts: Counter[str] = field(default_factory=Counter)
    keyword_counts: Counter[str] = field(default_factory=Counter)
    sample_titles: list[str] = field(default_factory=list)


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, value: int) -> int:
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left: int, right: int) -> None:
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            self.parent[right_root] = left_root
        else:
            self.parent[left_root] = right_root


def main() -> None:
    args = parse_args()
    input_path = resolve_input_path(args.input, args.results_dir)
    output_paths = run_bracket_content_clustering(
        input_path=input_path,
        output_dir=args.output_dir,
        threshold=args.threshold,
        min_shared_tokens=args.min_shared_tokens,
        sample_limit=args.sample_limit,
    )

    print(f"입력 CSV: {input_path}")
    print(f"대괄호 상세 결과: {output_paths['detail_output_path']}")
    print(f"대괄호 내용별 결과: {output_paths['item_output_path']}")
    print(f"대괄호 클러스터 요약: {output_paths['summary_output_path']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="노필터 크롤링 결과의 상품명 [] 안 텍스트만 추출해 토큰 기준으로 클러스터링합니다."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help="분석할 노필터 크롤링 CSV 경로입니다. 비우면 crawling/results의 최신 *_no_filter_*.csv를 사용합니다.",
    )
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=DEFAULT_RESULTS_DIR,
        help="기본 입력 CSV를 찾을 결과 폴더입니다.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="대괄호 추출/클러스터링 결과를 저장할 폴더입니다.",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help="같은 클러스터로 묶기 위한 Jaccard 유사도 최소값입니다.",
    )
    parser.add_argument(
        "--min-shared-tokens",
        type=int,
        default=DEFAULT_MIN_SHARED_TOKENS,
        help="같은 클러스터로 묶기 위한 최소 공통 토큰 수입니다.",
    )
    parser.add_argument(
        "--sample-limit",
        type=int,
        default=5,
        help="CSV에 남길 샘플 상품명 개수입니다.",
    )
    return parser.parse_args()


def resolve_input_path(input_path: Path | None, results_dir: Path) -> Path:
    if input_path:
        if not input_path.exists():
            raise FileNotFoundError(f"입력 CSV를 찾을 수 없습니다: {input_path}")
        return input_path

    candidates = sorted(
        results_dir.glob("*_no_filter_*.csv"),
        key=lambda path: path.stat().st_mtime,
    )
    if candidates:
        return candidates[-1]

    raise FileNotFoundError(
        f"노필터 입력 CSV를 찾을 수 없습니다. --input을 지정하거나 결과 폴더를 확인하세요: {results_dir}"
    )


def run_bracket_content_clustering(
    input_path: Path,
    output_dir: Path,
    threshold: float = DEFAULT_THRESHOLD,
    min_shared_tokens: int = DEFAULT_MIN_SHARED_TOKENS,
    sample_limit: int = 5,
) -> dict[str, Path]:
    detail_rows, stats_by_content = extract_bracket_contents(input_path, sample_limit=sample_limit)
    cluster_groups = cluster_content_stats(
        list(stats_by_content.values()),
        threshold=threshold,
        min_shared_tokens=min_shared_tokens,
    )

    content_to_cluster_id: dict[str, str] = {}
    item_rows: list[dict[str, Any]] = []
    summary_rows: list[dict[str, Any]] = []

    for cluster_no, stats_group in enumerate(cluster_groups, start=1):
        cluster_id = f"bracket_{cluster_no:03d}"
        cluster_tokens = ordered_cluster_tokens(stats_group)
        representative = choose_representative_content(stats_group)
        occurrence_count = sum(stats.count for stats in stats_group)

        for stats in stats_group:
            content_to_cluster_id[stats.normalized_content.lower()] = cluster_id
            item_rows.append(
                {
                    "cluster_id": cluster_id,
                    "bracket_content": stats.content,
                    "normalized_content": stats.normalized_content,
                    "count": stats.count,
                    "token_text": " ".join(stats.tokens),
                    "platform_counts": format_counter(stats.platform_counts),
                    "keyword_counts_top8": format_counter(stats.keyword_counts, limit=8),
                    "sample_titles": " | ".join(stats.sample_titles),
                }
            )

        summary_rows.append(
            {
                "cluster_id": cluster_id,
                "unique_content_count": len(stats_group),
                "occurrence_count": occurrence_count,
                "representative_content": representative,
                "cluster_tokens": cluster_tokens,
                "bracket_contents": merge_unique((stats.normalized_content for stats in stats_group), limit=30),
                "platform_counts": format_counter(merge_counters(stats.platform_counts for stats in stats_group)),
                "keyword_counts_top8": format_counter(
                    merge_counters(stats.keyword_counts for stats in stats_group),
                    limit=8,
                ),
                "sample_titles": merge_unique(
                    (title for stats in stats_group for title in stats.sample_titles),
                    limit=sample_limit,
                ),
            }
        )

    for row in detail_rows:
        content_key = row["normalized_content"].lower()
        row["cluster_id"] = content_to_cluster_id.get(content_key, "")

    item_rows.sort(key=lambda row: (row["cluster_id"], -int(row["count"]), row["normalized_content"]))
    summary_rows.sort(key=lambda row: (-int(row["occurrence_count"]), row["cluster_id"]))

    return write_outputs(output_dir, detail_rows, item_rows, summary_rows)


def extract_bracket_contents(
    input_path: Path,
    sample_limit: int,
) -> tuple[list[dict[str, Any]], dict[str, BracketContentStats]]:
    detail_rows: list[dict[str, Any]] = []
    stats_by_content: dict[str, BracketContentStats] = {}

    with input_path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for source_row in reader:
            name = clean_value(source_row.get("name"))
            if not name:
                continue

            for match_index, content in enumerate(BRACKET_PATTERN.findall(name), start=1):
                normalized_content = normalize_bracket_content(content)
                if not normalized_content:
                    continue

                content_key = normalized_content.lower()
                stats = stats_by_content.get(content_key)
                if stats is None:
                    stats = BracketContentStats(
                        content=content.strip(),
                        normalized_content=normalized_content,
                        tokens=tuple(tokenize_bracket_content(normalized_content)),
                    )
                    stats_by_content[content_key] = stats

                platform = clean_value(source_row.get("platform"))
                keyword = clean_value(source_row.get("keyword"))
                stats.count += 1
                stats.platform_counts[platform] += 1
                stats.keyword_counts[keyword] += 1
                if len(stats.sample_titles) < sample_limit and name not in stats.sample_titles:
                    stats.sample_titles.append(name)

                detail_rows.append(
                    {
                        "cluster_id": "",
                        "bracket_content": content.strip(),
                        "normalized_content": normalized_content,
                        "match_index_in_title": match_index,
                        "keyword": keyword,
                        "platform": platform,
                        "pid": clean_value(source_row.get("pid")),
                        "name": name,
                        "price": clean_value(source_row.get("price")),
                        "status": clean_value(source_row.get("status")),
                        "link": clean_value(source_row.get("link")),
                    }
                )

    return detail_rows, stats_by_content


def cluster_content_stats(
    stats_list: list[BracketContentStats],
    threshold: float,
    min_shared_tokens: int,
) -> list[list[BracketContentStats]]:
    if not stats_list:
        return []
    if len(stats_list) == 1:
        return [stats_list]

    token_sets = [set(stats.tokens) for stats in stats_list]
    union_find = UnionFind(len(stats_list))
    token_to_rows: defaultdict[str, list[int]] = defaultdict(list)

    for row_index, tokens in enumerate(token_sets):
        for token in tokens:
            token_to_rows[token].append(row_index)

    checked_pairs: set[tuple[int, int]] = set()
    for candidate_rows in token_to_rows.values():
        for left_index, right_index in itertools.combinations(candidate_rows, 2):
            pair = (left_index, right_index) if left_index < right_index else (right_index, left_index)
            if pair in checked_pairs:
                continue
            checked_pairs.add(pair)

            shared_count = len(token_sets[left_index] & token_sets[right_index])
            if shared_count < min_shared_tokens:
                continue

            if jaccard_similarity(token_sets[left_index], token_sets[right_index]) >= threshold:
                union_find.union(left_index, right_index)

    root_to_rows: defaultdict[int, list[int]] = defaultdict(list)
    for row_index in range(len(stats_list)):
        root_to_rows[union_find.find(row_index)].append(row_index)

    groups = [[stats_list[row_index] for row_index in rows] for rows in root_to_rows.values()]
    return sorted(groups, key=lambda group: (-sum(stats.count for stats in group), group[0].normalized_content))


def normalize_bracket_content(value: str) -> str:
    return re.sub(r"\s+", " ", clean_value(value)).strip()


def tokenize_bracket_content(value: str) -> list[str]:
    text = normalize_text(value)
    tokens = []
    for token in re.split(r"[\s,/|·+]+", text):
        token = re.sub(r"^[^\w가-힣]+|[^\w가-힣]+$", "", token)
        if token:
            tokens.append(token)
    return tokens


def normalize_text(value: str) -> str:
    text = value.lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    return re.sub(r"\s+", " ", text).strip()


def jaccard_similarity(left_tokens: set[str], right_tokens: set[str]) -> float:
    if not left_tokens and not right_tokens:
        return 0.0
    union_count = len(left_tokens | right_tokens)
    return len(left_tokens & right_tokens) / union_count if union_count else 0.0


def choose_representative_content(stats_group: list[BracketContentStats]) -> str:
    return max(
        stats_group,
        key=lambda stats: (stats.count, len(set(stats.tokens)), len(stats.normalized_content)),
    ).normalized_content


def ordered_cluster_tokens(stats_group: list[BracketContentStats]) -> str:
    token_counter: Counter[str] = Counter()
    for stats in stats_group:
        token_counter.update({token: stats.count for token in stats.tokens})
    return " ".join(token for token, _ in token_counter.most_common())


def merge_counters(counters: Any) -> Counter[str]:
    merged: Counter[str] = Counter()
    for counter in counters:
        merged.update(counter)
    return merged


def format_counter(counter: Counter[str], limit: int | None = None) -> str:
    rows = counter.most_common(limit)
    return " | ".join(f"{key}:{count}" for key, count in rows if key)


def merge_unique(values: Any, limit: int | None = None) -> str:
    unique_values = [str(value).strip() for value in values if str(value).strip()]
    unique_values = list(dict.fromkeys(unique_values))
    if limit is not None:
        unique_values = unique_values[:limit]
    return " | ".join(unique_values)


def clean_value(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def write_outputs(
    output_dir: Path,
    detail_rows: list[dict[str, Any]],
    item_rows: list[dict[str, Any]],
    summary_rows: list[dict[str, Any]],
) -> dict[str, Path]:
    now = datetime.now().strftime("%Y%m%d_%H%M")
    output_dir.mkdir(parents=True, exist_ok=True)

    detail_output_path = output_dir / f"bracket_cluster_detail_{now}.csv"
    item_output_path = output_dir / f"bracket_cluster_items_{now}.csv"
    summary_output_path = output_dir / f"bracket_cluster_summary_{now}.csv"
    latest_detail_path = output_dir / "latest_bracket_cluster_detail.csv"
    latest_item_path = output_dir / "latest_bracket_cluster_items.csv"
    latest_summary_path = output_dir / "latest_bracket_cluster_summary.csv"

    write_csv(detail_output_path, detail_rows, detail_fieldnames())
    write_csv(item_output_path, item_rows, item_fieldnames())
    write_csv(summary_output_path, summary_rows, summary_fieldnames())
    write_csv(latest_detail_path, detail_rows, detail_fieldnames())
    write_csv(latest_item_path, item_rows, item_fieldnames())
    write_csv(latest_summary_path, summary_rows, summary_fieldnames())

    return {
        "detail_output_path": detail_output_path,
        "item_output_path": item_output_path,
        "summary_output_path": summary_output_path,
        "latest_detail_path": latest_detail_path,
        "latest_item_path": latest_item_path,
        "latest_summary_path": latest_summary_path,
    }


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def detail_fieldnames() -> list[str]:
    return [
        "cluster_id",
        "bracket_content",
        "normalized_content",
        "match_index_in_title",
        "keyword",
        "platform",
        "pid",
        "name",
        "price",
        "status",
        "link",
    ]


def item_fieldnames() -> list[str]:
    return [
        "cluster_id",
        "bracket_content",
        "normalized_content",
        "count",
        "token_text",
        "platform_counts",
        "keyword_counts_top8",
        "sample_titles",
    ]


def summary_fieldnames() -> list[str]:
    return [
        "cluster_id",
        "unique_content_count",
        "occurrence_count",
        "representative_content",
        "cluster_tokens",
        "bracket_contents",
        "platform_counts",
        "keyword_counts_top8",
        "sample_titles",
    ]


if __name__ == "__main__":
    main()
