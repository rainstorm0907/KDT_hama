from __future__ import annotations

import argparse
import csv
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


from _paths import ANALYSIS_DIR, DEFAULT_RESULTS_DIR, PYTHON_DIR

DEFAULT_OUTPUT_DIR = ANALYSIS_DIR / "results" / "title_keyword_accuracy"
TOKEN_PATTERN = re.compile(r"[a-z]+[0-9]+[a-z]?|[가-힣]+|[a-z]+|\d+")


def main() -> None:
    args = parse_args()
    input_path = resolve_input_path(args.input, args.results_dir)
    output_paths = run_accuracy_check(input_path=input_path, output_dir=args.output_dir)

    print(f"입력 CSV: {input_path}")
    print(f"정확성 검사 결과: {output_paths['detail_output_path']}")
    print(f"정확성 검사 실패 행: {output_paths['fail_output_path']}")
    print(f"정확성 검사 요약: {output_paths['summary_output_path']}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="크롤링 CSV의 keyword와 name이 규칙 기반 정확성 검사를 통과하는지 확인합니다."
    )
    parser.add_argument(
        "--input",
        type=Path,
        help="정확성 검사를 실행할 크롤링 CSV 경로입니다. 비우면 crawling/results의 최신 통합조회_전체*.csv를 사용합니다.",
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
        help="정확성 검사 결과 CSV를 저장할 폴더입니다.",
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


def run_accuracy_check(input_path: Path, output_dir: Path) -> dict[str, Path]:
    rows = read_rows(input_path)
    detail_rows = [build_detail_row(row) for row in rows]
    fail_rows = [row for row in detail_rows if row["accuracy_check_pass"] == 0]
    summary_rows = build_summary_rows(detail_rows)
    label_summary_rows = build_label_summary_rows(detail_rows)

    return write_outputs(
        output_dir=output_dir,
        detail_rows=detail_rows,
        fail_rows=fail_rows,
        summary_rows=summary_rows + label_summary_rows,
    )


def build_detail_row(row: dict[str, str]) -> dict[str, Any]:
    keyword = clean_value(row.get("keyword") or row.get("canonical_name"))
    name = clean_value(row.get("name") or row.get("title"))
    tokens = tokenize_keyword(keyword)
    is_pass, missing_tokens = keyword_matches_title(keyword, name)
    label = normalize_label(row.get("label"))

    return {
        "keyword": keyword,
        "platform": clean_value(row.get("platform")),
        "pid": clean_value(row.get("pid")),
        "name": name,
        "keyword_tokens": " | ".join(tokens),
        "missing_tokens": " | ".join(missing_tokens),
        "accuracy_check_pass": int(is_pass),
        "accuracy_check_result": "pass" if is_pass else "fail",
        "label": label,
        "is_correct_prediction": int(label == int(is_pass)) if label in (0, 1) else "",
        "price": clean_value(row.get("price")),
        "status": clean_value(row.get("status")),
        "link": clean_value(row.get("link")),
    }


def keyword_matches_title(keyword: str, title: str) -> tuple[bool, list[str]]:
    normalized_title = normalize_search_text(title)
    tokens = tokenize_keyword(keyword)
    missing_tokens = [token for token in tokens if not token_matches_title(token, normalized_title)]
    return not missing_tokens, missing_tokens


def token_matches_title(token: str, normalized_title: str) -> bool:
    if re.fullmatch(r"[a-z]+[0-9]+[a-z]?", token):
        return re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", normalized_title) is not None

    if re.fullmatch(r"\d+", token):
        return re.search(rf"(?<!\d){re.escape(token)}(?!\d)", normalized_title) is not None

    return token in normalized_title


def normalize_search_text(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    text = re.sub(r"[^0-9a-z가-힣\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize_keyword(keyword: str) -> list[str]:
    return TOKEN_PATTERN.findall(normalize_search_text(keyword))


def build_summary_rows(detail_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    total_count = len(detail_rows)
    pass_count = sum(1 for row in detail_rows if row["accuracy_check_pass"] == 1)
    fail_count = total_count - pass_count
    platform_counter = Counter(row["platform"] for row in detail_rows if row["platform"])
    fail_keyword_counter = Counter(row["keyword"] for row in detail_rows if row["accuracy_check_pass"] == 0)

    return [
        {"metric": "total_count", "value": total_count},
        {"metric": "pass_count", "value": pass_count},
        {"metric": "fail_count", "value": fail_count},
        {"metric": "pass_rate", "value": safe_rate(pass_count, total_count)},
        {"metric": "platform_counts", "value": format_counter(platform_counter)},
        {"metric": "fail_keywords_top20", "value": format_counter(fail_keyword_counter, limit=20)},
    ]


def build_label_summary_rows(detail_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    labeled_rows = [row for row in detail_rows if row["label"] in (0, 1)]
    if not labeled_rows:
        return []

    true_positive = sum(1 for row in labeled_rows if row["label"] == 1 and row["accuracy_check_pass"] == 1)
    true_negative = sum(1 for row in labeled_rows if row["label"] == 0 and row["accuracy_check_pass"] == 0)
    false_positive = sum(1 for row in labeled_rows if row["label"] == 0 and row["accuracy_check_pass"] == 1)
    false_negative = sum(1 for row in labeled_rows if row["label"] == 1 and row["accuracy_check_pass"] == 0)
    correct_count = true_positive + true_negative

    return [
        {"metric": "labeled_count", "value": len(labeled_rows)},
        {"metric": "label_accuracy", "value": safe_rate(correct_count, len(labeled_rows))},
        {"metric": "precision", "value": safe_rate(true_positive, true_positive + false_positive)},
        {"metric": "recall", "value": safe_rate(true_positive, true_positive + false_negative)},
        {"metric": "true_positive", "value": true_positive},
        {"metric": "true_negative", "value": true_negative},
        {"metric": "false_positive", "value": false_positive},
        {"metric": "false_negative", "value": false_negative},
    ]


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def write_outputs(
    output_dir: Path,
    detail_rows: list[dict[str, Any]],
    fail_rows: list[dict[str, Any]],
    summary_rows: list[dict[str, Any]],
) -> dict[str, Path]:
    now = datetime.now().strftime("%Y%m%d_%H%M")
    output_dir.mkdir(parents=True, exist_ok=True)

    detail_output_path = output_dir / f"title_keyword_accuracy_detail_{now}.csv"
    fail_output_path = output_dir / f"title_keyword_accuracy_fail_{now}.csv"
    summary_output_path = output_dir / f"title_keyword_accuracy_summary_{now}.csv"
    latest_detail_path = output_dir / "latest_title_keyword_accuracy_detail.csv"
    latest_fail_path = output_dir / "latest_title_keyword_accuracy_fail.csv"
    latest_summary_path = output_dir / "latest_title_keyword_accuracy_summary.csv"

    write_csv(detail_output_path, detail_rows, detail_fieldnames())
    write_csv(fail_output_path, fail_rows, detail_fieldnames())
    write_csv(summary_output_path, summary_rows, summary_fieldnames())
    write_csv(latest_detail_path, detail_rows, detail_fieldnames())
    write_csv(latest_fail_path, fail_rows, detail_fieldnames())
    write_csv(latest_summary_path, summary_rows, summary_fieldnames())

    return {
        "detail_output_path": detail_output_path,
        "fail_output_path": fail_output_path,
        "summary_output_path": summary_output_path,
        "latest_detail_path": latest_detail_path,
        "latest_fail_path": latest_fail_path,
        "latest_summary_path": latest_summary_path,
    }


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def detail_fieldnames() -> list[str]:
    return [
        "keyword",
        "platform",
        "pid",
        "name",
        "keyword_tokens",
        "missing_tokens",
        "accuracy_check_pass",
        "accuracy_check_result",
        "label",
        "is_correct_prediction",
        "price",
        "status",
        "link",
    ]


def summary_fieldnames() -> list[str]:
    return ["metric", "value"]


def normalize_label(value: Any) -> int | str:
    text = clean_value(value)
    if text in {"0", "1"}:
        return int(text)
    return ""


def safe_rate(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "0.0000"
    return f"{numerator / denominator:.4f}"


def format_counter(counter: Counter[str], limit: int | None = None) -> str:
    return " | ".join(f"{key}:{count}" for key, count in counter.most_common(limit) if key)


def clean_value(value: Any) -> str:
    return str(value or "").strip()


if __name__ == "__main__":
    main()
