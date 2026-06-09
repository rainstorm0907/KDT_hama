from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from statistics import median
from typing import Any

from check_title_keyword_accuracy import keyword_matches_title
from _paths import ANALYSIS_DIR, DEFAULT_RESULTS_DIR, PYTHON_DIR

DEFAULT_OUTPUT_DIR = ANALYSIS_DIR / "results" / "platform_comparison"
PRICE_PATTERN = re.compile(r"\d+")


def main() -> None:
    args = parse_args()
    input_path = resolve_input_path(args.input, args.results_dir)
    output_paths = compare_platform_data(input_path=input_path, output_dir=args.output_dir)

    print(f"입력 CSV: {input_path}")
    print(f"플랫폼 요약: {output_paths['platform_summary_path']}")
    print(f"키워드별 플랫폼 비교: {output_paths['keyword_platform_summary_path']}")
    print(f"플랫폼별 실패 토큰: {output_paths['missing_token_summary_path']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="크롤링 CSV에서 번개장터와 중고나라 데이터 차이를 비교합니다."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help="비교할 크롤링 CSV 경로입니다. 비우면 crawling/results의 최신 통합조회_전체*.csv를 사용합니다.",
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
        help="플랫폼 비교 결과 CSV를 저장할 폴더입니다.",
    )
    return parser.parse_args()


def resolve_input_path(input_path: Path | None, results_dir: Path) -> Path:
    if input_path:
        if not input_path.exists():
            raise FileNotFoundError(f"입력 CSV를 찾을 수 없습니다: {input_path}")
        return input_path

    candidates = sorted(
        results_dir.glob("통합조회_전체*.csv"),
        key=lambda path: path.stat().st_mtime,
    )
    if candidates:
        return candidates[-1]

    raise FileNotFoundError(f"입력 CSV를 찾을 수 없습니다: {results_dir}")


def compare_platform_data(input_path: Path, output_dir: Path) -> dict[str, Path]:
    rows = [enrich_row(row) for row in read_rows(input_path)]
    platform_summary_rows = build_platform_summary_rows(rows)
    keyword_platform_summary_rows = build_keyword_platform_summary_rows(rows)
    missing_token_summary_rows = build_missing_token_summary_rows(rows)

    return write_outputs(
        output_dir=output_dir,
        platform_summary_rows=platform_summary_rows,
        keyword_platform_summary_rows=keyword_platform_summary_rows,
        missing_token_summary_rows=missing_token_summary_rows,
    )


def enrich_row(row: dict[str, str]) -> dict[str, Any]:
    keyword = clean_value(row.get("keyword") or row.get("canonical_name"))
    name = clean_value(row.get("name") or row.get("title"))
    is_pass, missing_tokens = keyword_matches_title(keyword, name)

    enriched = dict(row)
    enriched["_keyword"] = keyword
    enriched["_name"] = name
    enriched["_platform"] = clean_value(row.get("platform"))
    enriched["_price"] = parse_price(row.get("price"))
    enriched["_title_length"] = len(name)
    enriched["_has_bracket"] = int("[" in name and "]" in name)
    enriched["_accuracy_pass"] = int(is_pass)
    enriched["_missing_tokens"] = missing_tokens
    return enriched


def build_platform_summary_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped_rows = group_by(rows, "_platform")
    output_rows = []

    for platform, platform_rows in sorted(grouped_rows.items()):
        prices = [row["_price"] for row in platform_rows if row["_price"] is not None]
        pass_count = sum(row["_accuracy_pass"] for row in platform_rows)
        fail_count = len(platform_rows) - pass_count
        title_lengths = [row["_title_length"] for row in platform_rows]
        bracket_count = sum(row["_has_bracket"] for row in platform_rows)

        output_rows.append(
            {
                "platform": platform,
                "row_count": len(platform_rows),
                "unique_pid_count": unique_count(platform_rows, "pid"),
                "unique_keyword_count": unique_count(platform_rows, "_keyword"),
                "accuracy_pass_count": pass_count,
                "accuracy_fail_count": fail_count,
                "accuracy_pass_rate": safe_rate(pass_count, len(platform_rows)),
                "bracket_title_count": bracket_count,
                "bracket_title_rate": safe_rate(bracket_count, len(platform_rows)),
                "avg_title_length": safe_average(title_lengths),
                "avg_price": safe_average(prices),
                "median_price": safe_median(prices),
                "status_counts": format_counter(Counter(clean_value(row.get("status")) for row in platform_rows)),
                "top_keywords": format_counter(Counter(row["_keyword"] for row in platform_rows), limit=15),
            }
        )

    return output_rows


def build_keyword_platform_summary_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped_rows: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped_rows[(row["_keyword"], row["_platform"])].append(row)

    output_rows = []
    for (keyword, platform), platform_rows in sorted(grouped_rows.items()):
        prices = [row["_price"] for row in platform_rows if row["_price"] is not None]
        pass_count = sum(row["_accuracy_pass"] for row in platform_rows)
        output_rows.append(
            {
                "keyword": keyword,
                "platform": platform,
                "row_count": len(platform_rows),
                "accuracy_pass_count": pass_count,
                "accuracy_fail_count": len(platform_rows) - pass_count,
                "accuracy_pass_rate": safe_rate(pass_count, len(platform_rows)),
                "avg_price": safe_average(prices),
                "median_price": safe_median(prices),
                "status_counts": format_counter(Counter(clean_value(row.get("status")) for row in platform_rows)),
                "sample_titles": " | ".join(unique_values((row["_name"] for row in platform_rows), limit=3)),
            }
        )

    return sorted(output_rows, key=lambda row: (row["keyword"], row["platform"]))


def build_missing_token_summary_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped_rows = group_by(rows, "_platform")
    output_rows = []

    for platform, platform_rows in sorted(grouped_rows.items()):
        token_counter: Counter[str] = Counter()
        keyword_counter: Counter[str] = Counter()
        samples: dict[str, list[str]] = defaultdict(list)

        for row in platform_rows:
            if row["_accuracy_pass"] == 1:
                continue
            keyword_counter[row["_keyword"]] += 1
            for token in row["_missing_tokens"]:
                token_counter[token] += 1
                if len(samples[token]) < 3:
                    samples[token].append(row["_name"])

        for token, count in token_counter.most_common():
            output_rows.append(
                {
                    "platform": platform,
                    "missing_token": token,
                    "fail_count": count,
                    "top_fail_keywords": format_counter(keyword_counter, limit=10),
                    "sample_titles": " | ".join(samples[token]),
                }
            )

    return output_rows


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def write_outputs(
    output_dir: Path,
    platform_summary_rows: list[dict[str, Any]],
    keyword_platform_summary_rows: list[dict[str, Any]],
    missing_token_summary_rows: list[dict[str, Any]],
) -> dict[str, Path]:
    now = datetime.now().strftime("%Y%m%d_%H%M")
    output_dir.mkdir(parents=True, exist_ok=True)

    platform_summary_path = output_dir / f"platform_summary_{now}.csv"
    keyword_platform_summary_path = output_dir / f"keyword_platform_summary_{now}.csv"
    missing_token_summary_path = output_dir / f"missing_token_summary_{now}.csv"
    latest_platform_summary_path = output_dir / "latest_platform_summary.csv"
    latest_keyword_platform_summary_path = output_dir / "latest_keyword_platform_summary.csv"
    latest_missing_token_summary_path = output_dir / "latest_missing_token_summary.csv"

    write_csv(platform_summary_path, platform_summary_rows, platform_summary_fieldnames())
    write_csv(keyword_platform_summary_path, keyword_platform_summary_rows, keyword_platform_summary_fieldnames())
    write_csv(missing_token_summary_path, missing_token_summary_rows, missing_token_summary_fieldnames())
    write_csv(latest_platform_summary_path, platform_summary_rows, platform_summary_fieldnames())
    write_csv(latest_keyword_platform_summary_path, keyword_platform_summary_rows, keyword_platform_summary_fieldnames())
    write_csv(latest_missing_token_summary_path, missing_token_summary_rows, missing_token_summary_fieldnames())

    return {
        "platform_summary_path": platform_summary_path,
        "keyword_platform_summary_path": keyword_platform_summary_path,
        "missing_token_summary_path": missing_token_summary_path,
        "latest_platform_summary_path": latest_platform_summary_path,
        "latest_keyword_platform_summary_path": latest_keyword_platform_summary_path,
        "latest_missing_token_summary_path": latest_missing_token_summary_path,
    }


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def platform_summary_fieldnames() -> list[str]:
    return [
        "platform",
        "row_count",
        "unique_pid_count",
        "unique_keyword_count",
        "accuracy_pass_count",
        "accuracy_fail_count",
        "accuracy_pass_rate",
        "bracket_title_count",
        "bracket_title_rate",
        "avg_title_length",
        "avg_price",
        "median_price",
        "status_counts",
        "top_keywords",
    ]


def keyword_platform_summary_fieldnames() -> list[str]:
    return [
        "keyword",
        "platform",
        "row_count",
        "accuracy_pass_count",
        "accuracy_fail_count",
        "accuracy_pass_rate",
        "avg_price",
        "median_price",
        "status_counts",
        "sample_titles",
    ]


def missing_token_summary_fieldnames() -> list[str]:
    return [
        "platform",
        "missing_token",
        "fail_count",
        "top_fail_keywords",
        "sample_titles",
    ]


def group_by(rows: list[dict[str, Any]], key: str) -> dict[str, list[dict[str, Any]]]:
    grouped_rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped_rows[clean_value(row.get(key))].append(row)
    return grouped_rows


def parse_price(value: Any) -> int | None:
    digits = "".join(PRICE_PATTERN.findall(str(value or "")))
    return int(digits) if digits else None


def unique_count(rows: list[dict[str, Any]], key: str) -> int:
    return len({clean_value(row.get(key)) for row in rows if clean_value(row.get(key))})


def unique_values(values: Any, limit: int) -> list[str]:
    result = []
    seen = set()
    for value in values:
        cleaned = clean_value(value)
        if not cleaned or cleaned in seen:
            continue
        result.append(cleaned)
        seen.add(cleaned)
        if len(result) >= limit:
            break
    return result


def safe_rate(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "0.0000"
    return f"{numerator / denominator:.4f}"


def safe_average(values: list[int]) -> str:
    if not values:
        return ""
    return f"{sum(values) / len(values):.2f}"


def safe_median(values: list[int]) -> str:
    if not values:
        return ""
    return f"{median(values):.2f}"


def format_counter(counter: Counter[str], limit: int | None = None) -> str:
    return " | ".join(f"{key}:{count}" for key, count in counter.most_common(limit) if key)


def clean_value(value: Any) -> str:
    return str(value or "").strip()


if __name__ == "__main__":
    main()
