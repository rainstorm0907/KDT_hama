# -*- coding: utf-8 -*-
"""중고나라/번개장터 인기검색어를 수집해 테스트용 키워드 CSV를 생성합니다.

공식 인기검색어 API가 확인되지 않은 플랫폼은 웹 페이지에서 노출되는
키워드를 best-effort 방식으로 추출합니다. 충분한 키워드를 수집하지 못하면
기존 keyword_list.csv 내용을 keyword_list_test.csv로 복사합니다.
"""

import argparse
import csv
import json
import re
import tempfile
from pathlib import Path
from typing import Iterable

import requests
from bs4 import BeautifulSoup


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_EXISTING_KEYWORD_FILE = BASE_DIR / "keyword_list.csv"
DEFAULT_OUTPUT_FILE = BASE_DIR / "keyword_list_test.csv"
DEFAULT_TOP_N = 20
MIN_COLLECTED_KEYWORDS = 3

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

POPULAR_KEYWORD_SELECTORS = [
    "[class*='popular'][class*='keyword'] a",
    "[class*='Popular'][class*='Keyword'] a",
    "[class*='rank'][class*='keyword'] a",
    "[class*='Rank'][class*='Keyword'] a",
    "[data-testid*='popular'] a",
    "[data-testid*='keyword'] a",
]

KEYWORD_KEYS = {
    "keyword",
    "keywords",
    "query",
    "queries",
    "searchword",
    "searchwords",
    "search_word",
    "search_words",
    "word",
    "words",
    "term",
    "terms",
}

RANKING_CONTEXT_KEYS = {
    "popular",
    "popularsearch",
    "popularsearches",
    "popularkeywords",
    "ranking",
    "rankings",
    "rank",
    "realtime",
    "realtimekeyword",
    "trend",
    "trends",
}

EXCLUDED_CONTEXT_KEYS = {
    "category",
    "categories",
    "navigation",
    "nav",
    "menu",
    "gnb",
    "lnb",
    "footer",
}

NOISE_WORDS = {
    "검색",
    "채팅하기",
    "로그인",
    "회원가입",
    "전체",
    "메뉴",
    "홈",
    "이전",
    "다음",
    "더보기",
    "앱 다운로드",
    "수입명품",
    "패션의류",
    "패션잡화",
    "뷰티",
    "출산/유아동",
    "모바일/태블릿",
    "가전제품",
    "노트북/pc",
    "카메라/캠코더",
    "가구/인테리어",
    "리빙/생활",
    "게임",
    "반려동물/취미",
    "도서/음반/문구",
    "티켓/쿠폰",
    "스포츠",
    "레저/여행",
    "중고차",
    "오토바이",
}


def normalize_keyword(value: str) -> str:
    keyword = re.sub(r"\s+", " ", value).strip()
    keyword = re.sub(r"^\d+\s*", "", keyword)
    return keyword.lower()


def is_valid_keyword(value: str) -> bool:
    keyword = normalize_keyword(value)
    if not keyword or keyword in NOISE_WORDS:
        return False
    if len(keyword) < 2 or len(keyword) > 40:
        return False
    if re.fullmatch(r"[\W_]+", keyword):
        return False
    return True


def unique_keywords(values: Iterable[str]) -> list[str]:
    keywords: list[str] = []
    seen: set[str] = set()

    for value in values:
        keyword = normalize_keyword(value)
        if not is_valid_keyword(keyword) or keyword in seen:
            continue
        seen.add(keyword)
        keywords.append(keyword)

    return keywords


def fetch_text(url: str) -> str:
    response = requests.get(url, headers=HEADERS, timeout=10)
    response.raise_for_status()
    return response.text


def collect_keywords_from_json(data, in_ranking_context: bool = False) -> list[str]:
    keywords: list[str] = []

    if isinstance(data, dict):
        for key, value in data.items():
            normalized_key = re.sub(r"[^a-z]", "", str(key).lower())
            if normalized_key in EXCLUDED_CONTEXT_KEYS:
                continue

            next_context = in_ranking_context or normalized_key in RANKING_CONTEXT_KEYS

            if next_context and normalized_key in KEYWORD_KEYS:
                if isinstance(value, str):
                    keywords.append(value)
                elif isinstance(value, list):
                    keywords.extend(str(item) for item in value if isinstance(item, str))

            keywords.extend(collect_keywords_from_json(value, next_context))

    elif isinstance(data, list):
        for item in data:
            if isinstance(item, str) and in_ranking_context:
                keywords.append(item)
            else:
                keywords.extend(collect_keywords_from_json(item, in_ranking_context))

    return keywords


def extract_keywords_from_html(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    candidates: list[str] = []

    for selector in POPULAR_KEYWORD_SELECTORS:
        for element in soup.select(selector):
            section_text = " ".join(parent.get_text(" ", strip=True) for parent in element.parents)
            if "인기" in section_text and "검색어" in section_text:
                candidates.append(element.get_text(" ", strip=True))

    for script in soup.find_all("script", type="application/json"):
        script_text = script.string or script.get_text(strip=True)
        if not script_text:
            continue

        try:
            data = json.loads(script_text)
        except json.JSONDecodeError:
            continue

        candidates.extend(collect_keywords_from_json(data))

    return unique_keywords(candidates)


def fetch_joongna_popular_keywords(limit: int) -> list[str]:
    urls = [
        "https://www.joongna.com/search-price",
        "https://web.joongna.com/search-price",
    ]
    return fetch_popular_keywords_from_urls("중고나라", urls, limit)


def fetch_bunjang_popular_keywords(limit: int) -> list[str]:
    urls = [
        "https://m.bunjang.co.kr/",
        "https://www.bunjang.co.kr/",
    ]
    return fetch_popular_keywords_from_urls("번개장터", urls, limit)


def fetch_popular_keywords_from_urls(platform: str, urls: list[str], limit: int) -> list[str]:
    for url in urls:
        try:
            keywords = extract_keywords_from_html(fetch_text(url))
        except requests.RequestException as error:
            print(f"[WARN] {platform} 인기검색어 수집 실패: {url} ({error})")
            continue

        if keywords:
            print(f"[INFO] {platform} 인기검색어 {len(keywords)}개 수집: {url}")
            return keywords[:limit]

    print(f"[WARN] {platform} 인기검색어를 찾지 못했습니다.")
    return []


def read_existing_keywords(path: Path) -> list[str]:
    if not path.exists():
        return []

    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if "keyword" not in (reader.fieldnames or []):
            return []
        return unique_keywords(row["keyword"] for row in reader if row.get("keyword"))


def write_keyword_file(path: Path, keywords: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8-sig",
        newline="",
        delete=False,
        dir=path.parent,
    ) as temp_file:
        writer = csv.writer(temp_file)
        writer.writerow(["keyword"])
        for keyword in keywords:
            writer.writerow([keyword])
        temp_path = Path(temp_file.name)

    temp_path.replace(path)


def update_keyword_file(
    path: Path,
    limit: int,
    include_existing: bool,
    existing_path: Path,
) -> list[str]:
    joongna_keywords = fetch_joongna_popular_keywords(limit)
    bunjang_keywords = fetch_bunjang_popular_keywords(limit)
    collected_keywords = unique_keywords([*joongna_keywords, *bunjang_keywords])

    if len(collected_keywords) < MIN_COLLECTED_KEYWORDS:
        print("[WARN] 수집된 인기검색어가 부족해 기존 keyword_list.csv로 테스트 파일을 생성합니다.")
        keywords = read_existing_keywords(existing_path)[:limit]
        if keywords:
            write_keyword_file(path, keywords)
        return keywords

    keywords = collected_keywords
    if include_existing:
        keywords = unique_keywords([*keywords, *read_existing_keywords(existing_path)])

    keywords = keywords[:limit]
    write_keyword_file(path, keywords)
    return keywords


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="인기검색어 기반 테스트용 키워드 CSV 생성")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_FILE,
        help="생성할 테스트용 키워드 CSV 경로",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_TOP_N,
        help="저장할 최대 키워드 개수",
    )
    parser.add_argument(
        "--no-existing",
        action="store_true",
        help="기존 keyword_list.csv 키워드를 뒤에 합치지 않음",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    keywords = update_keyword_file(
        path=args.output,
        limit=args.limit,
        include_existing=not args.no_existing,
        existing_path=DEFAULT_EXISTING_KEYWORD_FILE,
    )

    print(f"[INFO] 최종 키워드 {len(keywords)}개")
    print(f"[INFO] 출력 파일: {args.output}")
    for index, keyword in enumerate(keywords, start=1):
        print(f"{index}. {keyword}")


if __name__ == "__main__":
    main()
