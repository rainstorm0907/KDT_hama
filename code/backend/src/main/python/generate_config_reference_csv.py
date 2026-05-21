from __future__ import annotations

import argparse
import csv
import re
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import Any

from product_matching import normalize_title, split_keyword_values, tokenize_title


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RESULTS_DIR = BASE_DIR / "crawling" / "results"
DEFAULT_OUTPUT_DIR = BASE_DIR / "config" / "reference"

COMMON_NOISE_TOKENS = {
    "a급",
    "급처",
    "무료",
    "공짜",
    "구매",
    "구함",
    "구해요",
    "나눔",
    "대여",
    "렌탈",
    "매입",
    "문의",
    "삽니다",
    "업자",
    "전단",
    "판매",
    "판매합니다",
    "홍보",
}

ACCESSORY_OR_LOW_SIGNAL_TOKENS = {
    "강화유리",
    "맥세이프",
    "액정",
    "케이스",
    "클리어",
    "필름",
}

PRODUCT_TOKEN_RULES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("brand", "아이폰", ("iphone", "아이폰")),
    ("brand", "갤럭시", ("galaxy", "갤럭시")),
    ("brand", "애플", ("apple", "애플")),
    ("brand", "삼성", ("samsung", "삼성")),
    ("brand", "LG", ("lg", "엘지")),
    ("model", "16", ("16", "아이폰16", "iphone16")),
    ("model", "16 pro", ("16pro", "16프로", "16 pro", "16 프로")),
    ("model", "16 pro max", ("16promax", "16프로맥스", "16 pro max", "16 프로 맥스")),
    ("model", "17", ("17", "아이폰17", "iphone17")),
    ("model", "17e", ("17e", "아이폰17e", "iphone17e")),
    ("model", "17 pro", ("17pro", "17프로", "17 pro", "17 프로")),
    ("model", "17 pro max", ("17promax", "17프로맥스", "17 pro max", "17 프로 맥스")),
    ("model", "s25", ("s25", "갤럭시s25", "galaxys25")),
    ("model", "s25 plus", ("s25plus", "s25플러스", "s25 plus", "s25 플러스")),
    ("model", "s25 ultra", ("s25ultra", "s25울트라", "s25 ultra", "s25 울트라")),
    ("model", "s26", ("s26", "갤럭시s26", "galaxys26")),
    ("model", "s26 edge", ("s26edge", "s26엣지", "s26 edge", "s26 엣지")),
    ("model", "s26 ultra", ("s26ultra", "s26울트라", "s26 ultra", "s26 울트라")),
    ("model", "맥북", ("macbook", "맥북")),
    ("model", "맥북 에어", ("macbookair", "맥북에어", "macbook air", "맥북 에어")),
    ("model", "맥북 프로", ("macbookpro", "맥북프로", "macbook pro", "맥북 프로")),
    ("model", "그램", ("gram", "그램")),
    ("detail", "pro", ("pro", "프로")),
    ("detail", "pro max", ("promax", "프로맥스", "pro max", "프로 맥스")),
    ("detail", "plus", ("plus", "플러스")),
    ("detail", "ultra", ("ultra", "울트라")),
    ("detail", "edge", ("edge", "엣지")),
    ("detail", "air", ("air", "에어")),
    ("detail", "m1", ("m1",)),
    ("detail", "m2", ("m2",)),
    ("detail", "m3", ("m3",)),
    ("detail", "m4", ("m4",)),
    ("spec", "64GB", ("64gb", "64기가", "64g")),
    ("spec", "128GB", ("128gb", "128기가", "128g")),
    ("spec", "256GB", ("256gb", "256기가", "256g")),
    ("spec", "512GB", ("512gb", "512기가", "512g")),
    ("spec", "1TB", ("1tb", "1테라")),
    ("option", "자급제", ("자급제", "공기계")),
    ("option", "미개봉", ("미개봉", "새상품", "새제품")),
    ("option", "정상해지", ("정상해지",)),
    ("option", "풀박스", ("풀박스", "풀박", "박스풀")),
    ("option", "리퍼", ("리퍼", "리퍼폰")),
)

CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "디지털/가전 > 모바일",
        (
            "아이폰",
            "iphone",
            "갤럭시",
            "galaxy",
            "모바일",
            "스마트폰",
            "휴대폰",
            "핸드폰",
            "s25",
            "s25plus",
            "s25ultra",
            "s26",
            "s26edge",
            "s26ultra",
        ),
    ),
    (
        "디지털/가전 > 노트북",
        ("맥북", "macbook", "macbookair", "macbookpro", "그램", "gram", "노트북", "랩탑", "laptop"),
    ),
)


def main() -> None:
    args = parse_args()
    input_paths = resolve_input_paths(args.inputs, args.results_dir)
    rows = load_rows(input_paths)

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    write_product_token_reference(output_dir / "product_token_dictionary_reference.csv", rows)
    write_category_rule_reference(output_dir / "category_rules_reference.csv", rows)
    write_token_exclude_reference(output_dir / "token_exclude_list_reference.csv", rows)
    write_token_frequency_reference(output_dir / "title_token_frequency_reference.csv", rows, args.min_count)

    print(f"입력 CSV: {len(input_paths)}개")
    print(f"입력 상품 행: {len(rows)}개")
    print(f"참고 CSV 출력 폴더: {output_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="크롤링 결과에서 설정 수동 기입용 참고 CSV를 생성합니다.")
    parser.add_argument(
        "inputs",
        nargs="*",
        type=Path,
        help="분석할 CSV 파일 경로입니다. 비우면 crawling/results 아래 CSV를 자동으로 읽습니다.",
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
        help="참고 CSV를 저장할 폴더입니다.",
    )
    parser.add_argument(
        "--min-count",
        type=int,
        default=5,
        help="토큰 빈도 참고 CSV에 포함할 최소 등장 횟수입니다.",
    )
    return parser.parse_args()


def resolve_input_paths(inputs: Sequence[Path], results_dir: Path) -> list[Path]:
    if inputs:
        return [path for path in inputs if path.is_file()]

    if not results_dir.exists():
        return []

    return sorted(
        path
        for path in results_dir.rglob("*.csv")
        if path.is_file() and "labels" not in {part.lower() for part in path.parts}
    )


def load_rows(paths: Iterable[Path]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen_keys: set[tuple[str, str, str, str]] = set()
    for path in paths:
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            for row in csv.DictReader(file):
                normalized_row = {key: clean_value(value) for key, value in row.items() if key is not None}
                name = normalized_row.get("name", "")
                if not name:
                    continue
                key = (
                    normalized_row.get("platform", ""),
                    normalized_row.get("pid", ""),
                    normalized_row.get("keyword", ""),
                    name,
                )
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                normalized_row["_tokens"] = tuple(tokenize_title(name))
                normalized_row["_source_keywords"] = tuple(row_source_keywords(normalized_row))
                normalized_row["_match_text"] = compact_text(
                    " ".join(
                        [
                            normalized_row.get("name", ""),
                            normalized_row.get("keyword", ""),
                            normalized_row.get("canonical_name", ""),
                            normalized_row.get("matched_keywords", ""),
                        ]
                    )
                )
                rows.append(normalized_row)
    return rows


def write_product_token_reference(path: Path, rows: Sequence[Mapping[str, Any]]) -> None:
    fieldnames = [
        "field_name",
        "canonical_value",
        "aliases",
        "enabled",
        "match_count",
        "source_keywords",
        "sample_titles",
        "note",
    ]
    output_rows: list[dict[str, str | int]] = []
    for field_name, canonical_value, aliases in PRODUCT_TOKEN_RULES:
        compact_aliases = tuple(compact_text(alias) for alias in aliases if alias)
        matched_rows = [row for row in rows if any_alias_matches(row, compact_aliases)]
        if not matched_rows:
            continue

        output_rows.append(
            {
                "field_name": field_name,
                "canonical_value": canonical_value,
                "aliases": ", ".join(aliases),
                "enabled": 1,
                "match_count": len(matched_rows),
                "source_keywords": join_limited(keyword_counter(matched_rows), limit=8),
                "sample_titles": join_samples((row.get("name", "") for row in matched_rows), limit=3),
                "note": "검토 후 config/product_token_dictionary.csv에 필요한 행만 복사",
            }
        )

    write_csv(path, fieldnames, output_rows)


def write_category_rule_reference(path: Path, rows: Sequence[Mapping[str, Any]]) -> None:
    fieldnames = ["category", "tokens", "enabled", "match_count", "source_keywords", "note"]
    output_rows: list[dict[str, str | int]] = []
    for category, tokens in CATEGORY_RULES:
        compact_tokens = tuple(compact_text(token) for token in tokens if token)
        matched_rows = [row for row in rows if any_alias_matches(row, compact_tokens)]
        output_rows.append(
            {
                "category": category,
                "tokens": ", ".join(tokens),
                "enabled": 1,
                "match_count": len(matched_rows),
                "source_keywords": join_limited(keyword_counter(matched_rows), limit=12),
                "note": "검토 후 config/category_rules.csv에 필요한 토큰만 반영",
            }
        )

    write_csv(path, fieldnames, output_rows)


def write_token_exclude_reference(path: Path, rows: Sequence[Mapping[str, Any]]) -> None:
    token_counts = token_counter(rows)
    sample_titles = sample_titles_by_token(rows)
    output_rows: list[dict[str, str | int]] = []

    for token in sorted(COMMON_NOISE_TOKENS | ACCESSORY_OR_LOW_SIGNAL_TOKENS):
        count = token_counts.get(token, 0)
        if count <= 0:
            continue

        reason = "accessory_or_low_signal" if token in ACCESSORY_OR_LOW_SIGNAL_TOKENS else "bait_or_noise"
        output_rows.append(
            {
                "token": token,
                "reason": reason,
                "enabled": 1,
                "match_count": count,
                "sample_titles": join_samples(sample_titles[token], limit=3),
                "note": "정상 상품까지 제외될 수 있으니 검토 후 반영",
            }
        )

    fieldnames = ["token", "reason", "enabled", "match_count", "sample_titles", "note"]
    write_csv(path, fieldnames, output_rows)


def write_token_frequency_reference(path: Path, rows: Sequence[Mapping[str, Any]], min_count: int) -> None:
    token_counts = token_counter(rows)
    sample_titles = sample_titles_by_token(rows)
    source_keywords_by_token: dict[str, Counter[str]] = defaultdict(Counter)

    for row in rows:
        source_keywords = row.get("_source_keywords", ())
        for token in set(row.get("_tokens", ())):
            for keyword in source_keywords:
                source_keywords_by_token[token][keyword] += 1

    output_rows: list[dict[str, str | int]] = []
    for token, count in token_counts.most_common():
        if count < min_count or len(token) < 2:
            continue

        output_rows.append(
            {
                "token": token,
                "count": count,
                "suggested_usage": suggest_token_usage(token),
                "source_keywords": join_limited(source_keywords_by_token[token], limit=8),
                "sample_titles": join_samples(sample_titles[token], limit=3),
            }
        )

    fieldnames = ["token", "count", "suggested_usage", "source_keywords", "sample_titles"]
    write_csv(path, fieldnames, output_rows)


def any_alias_matches(row: Mapping[str, Any], compact_aliases: Iterable[str]) -> bool:
    haystack = str(row.get("_match_text", ""))
    return any(alias in haystack for alias in compact_aliases)


def token_counter(rows: Sequence[Mapping[str, Any]]) -> Counter[str]:
    counts: Counter[str] = Counter()
    for row in rows:
        counts.update(set(row.get("_tokens", ())))
    return counts


def sample_titles_by_token(rows: Sequence[Mapping[str, Any]]) -> dict[str, list[str]]:
    samples: dict[str, list[str]] = defaultdict(list)
    for row in rows:
        title = row.get("name", "")
        for token in set(row.get("_tokens", ())):
            if len(samples[token]) < 5:
                samples[token].append(title)
    return samples


def keyword_counter(rows: Sequence[Mapping[str, Any]]) -> Counter[str]:
    counter: Counter[str] = Counter()
    for row in rows:
        counter.update(row.get("_source_keywords", ()))
    return counter


def row_source_keywords(row: Mapping[str, Any]) -> list[str]:
    return split_keyword_values(
        [
            row.get("keyword", ""),
            row.get("canonical_name", ""),
            row.get("matched_keywords", ""),
        ]
    )


def suggest_token_usage(token: str) -> str:
    compact_token = compact_text(token)
    if token in COMMON_NOISE_TOKENS:
        return "token_exclude_list 후보"
    if token in ACCESSORY_OR_LOW_SIGNAL_TOKENS:
        return "token_exclude_list 후보"
    if re.fullmatch(r"\d{2,4}(g|gb|기가)", compact_token) or compact_token in {"1tb", "1테라"}:
        return "product_token_dictionary spec 후보"
    if compact_token in {"프로", "맥스", "울트라", "플러스", "엣지", "에어", "pro", "max", "ultra", "plus", "edge", "air"}:
        return "product_token_dictionary detail 후보"
    if compact_token in {"아이폰", "iphone", "갤럭시", "galaxy", "애플", "apple", "삼성", "samsung", "lg", "엘지"}:
        return "product_token_dictionary brand 후보"
    if re.fullmatch(r"(s\d{2}|s\d{2}(plus|ultra|edge)|\d{2}e?)", compact_token):
        return "product_token_dictionary model 후보"
    return "검토 필요"


def compact_text(value: Any) -> str:
    return re.sub(r"\s+", "", normalize_title(value))


def clean_value(value: Any) -> str:
    return str(value or "").strip()


def join_limited(counter: Counter[str], *, limit: int) -> str:
    return ", ".join(value for value, _ in counter.most_common(limit) if value)


def join_samples(values: Iterable[str], *, limit: int) -> str:
    samples: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = clean_value(value)
        if not cleaned or cleaned in seen:
            continue
        samples.append(cleaned)
        seen.add(cleaned)
        if len(samples) >= limit:
            break
    return " | ".join(samples)


def write_csv(path: Path, fieldnames: Sequence[str], rows: Sequence[Mapping[str, Any]]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
