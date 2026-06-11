"""번개장터·중고나라 no-filter 크롤링 파이프라인."""
from __future__ import annotations

import argparse
import json
import random
import re
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

from lib._paths import PYTHON_DIR
from lib.keyword_preprocessing import normalize_search_text

CRAWLING_DIR = PYTHON_DIR / "crawling"
DEFAULT_KEYWORD_FILE = CRAWLING_DIR / "keyword_list.csv"
DEFAULT_BLACKLIST_FILE = CRAWLING_DIR / "blacklist_keywords.csv"
DEFAULT_TOKEN_BLACKLIST_FILE = CRAWLING_DIR / "blacklist_tokens.csv"
DEFAULT_RESULT_DIR = CRAWLING_DIR / "results"

RESULT_COLUMNS = [
    "platform",
    "pid",
    "name",
    "price",
    "status",
    "image_url",
    "link",
    "date",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    )
}


@dataclass(frozen=True)
class CrawlingConfig:
    keywords: list[str]
    blacklist_keywords: list[str]
    token_blacklist: frozenset[str]
    result_dir: Path
    days_limit: int = 14
    request_timeout: int = 10
    max_retries: int = 2
    bunjang_delay_range: tuple[float, float] = (1.0, 1.5)
    joongna_delay_range: tuple[float, float] = (1.5, 2.5)
    keyword_delay_range: tuple[float, float] = (2.0, 3.0)
    joongna_max_pages: int = 10

    @property
    def limit_date(self) -> datetime:
        return datetime.now() - timedelta(days=self.days_limit)


def load_keywords(keyword_file: Path) -> list[str]:
    keyword_df = pd.read_csv(keyword_file, encoding="utf-8-sig")
    keyword_column = "keyword" if "keyword" in keyword_df.columns else keyword_df.columns[0]
    keywords = keyword_df[keyword_column].dropna().astype(str).str.strip()
    return [keyword for keyword in keywords if keyword]


def load_blacklist_keywords(blacklist_file: Path) -> list[str]:
    if not blacklist_file.exists():
        return []

    blacklist_df = pd.read_csv(blacklist_file, encoding="utf-8-sig")
    blacklist_column = "keyword" if "keyword" in blacklist_df.columns else blacklist_df.columns[0]
    blacklist_keywords = blacklist_df[blacklist_column].dropna().astype(str).str.strip()
    return [keyword for keyword in blacklist_keywords if keyword]


def load_token_blacklist(token_blacklist_file: Path) -> frozenset[str]:
    if not token_blacklist_file.exists():
        return frozenset()

    token_df = pd.read_csv(token_blacklist_file, encoding="utf-8-sig")
    if token_df.empty or not len(token_df.columns):
        return frozenset()

    token_column = "token" if "token" in token_df.columns else token_df.columns[0]
    raw_tokens = token_df[token_column].dropna().astype(str).str.strip()
    raw_tokens = raw_tokens[(raw_tokens != "") & (~raw_tokens.str.startswith("#"))]

    seen: set[str] = set()
    for cell in raw_tokens:
        normalized = normalize_search_text(cell)
        for token in normalized.split(" "):
            cleaned = re.sub(r"^[^\w가-힣]+|[^\w가-힣]+$", "", token)
            if cleaned:
                seen.add(cleaned)
    return frozenset(seen)


def build_config(
    *,
    keyword_file: Path = DEFAULT_KEYWORD_FILE,
    blacklist_file: Path = DEFAULT_BLACKLIST_FILE,
    token_blacklist_file: Path = DEFAULT_TOKEN_BLACKLIST_FILE,
    result_dir: Path = DEFAULT_RESULT_DIR,
) -> CrawlingConfig:
    keywords = load_keywords(keyword_file)
    if not keywords:
        raise ValueError(f"{keyword_file.name} 파일에 조회할 키워드가 없습니다.")

    return CrawlingConfig(
        keywords=keywords,
        blacklist_keywords=load_blacklist_keywords(blacklist_file),
        token_blacklist=load_token_blacklist(token_blacklist_file),
        result_dir=result_dir,
    )


def contains_blacklist_keyword(title: str, config: CrawlingConfig) -> bool:
    normalized_title = normalize_search_text(title)
    return any(
        normalize_search_text(keyword) in normalized_title
        for keyword in config.blacklist_keywords
    )


def title_has_blacklisted_token(title: str, config: CrawlingConfig) -> bool:
    if not config.token_blacklist:
        return False

    tokens: set[str] = set()
    for part in normalize_search_text(title).split(" "):
        cleaned = re.sub(r"^[^\w가-힣]+|[^\w가-힣]+$", "", part)
        if cleaned:
            tokens.add(cleaned)
    return not tokens.isdisjoint(config.token_blacklist)


def should_exclude_by_blacklist(title: str, config: CrawlingConfig) -> bool:
    return contains_blacklist_keyword(title, config) or title_has_blacklisted_token(title, config)


def polite_delay(delay_range: tuple[float, float]) -> None:
    time.sleep(random.uniform(*delay_range))


def get_with_retries(url: str, platform: str, config: CrawlingConfig):
    for attempt in range(1, config.max_retries + 1):
        try:
            return requests.get(url, headers=HEADERS, timeout=config.request_timeout)
        except requests.RequestException as error:
            print(f"{platform} 요청 실패 {attempt}/{config.max_retries}: {error}")
            if attempt < config.max_retries:
                polite_delay((2.0, 4.0))
    return None


def get_bunjang_status(status) -> str:
    status_map = {
        "0": "판매중",
        "1": "예약중",
        "2": "거래중",
        "3": "판매완료",
    }
    return status_map.get(str(status), f"상태코드:{status}")


def decode_joongna_text(value: str) -> str:
    try:
        return json.loads(f'"{value}"')
    except Exception:
        return value


def get_joongna_status(state: int) -> str:
    status_map = {
        0: "판매중",
        1: "예약중",
        3: "거래완료",
    }
    return status_map.get(state, f"상태코드:{state}")


def parse_joongna_search_items(html: str) -> list[dict[str, object]]:
    pattern = re.compile(
        r'\{\\"seq\\":(?P<pid>\d+).*?'
        r'\\"price\\":(?P<price>\d+).*?'
        r'\\"url\\":\\"(?P<image_url>.*?)\\".*?'
        r'\\"title\\":\\"(?P<name>.*?)\\",'
        r'\\"state\\":(?P<state>\d+),'
        r'\\"sortDate\\":\\"(?P<date>.*?)\\"',
        re.S,
    )

    items: list[dict[str, object]] = []
    for match in pattern.finditer(html):
        items.append(
            {
                "pid": match.group("pid"),
                "name": decode_joongna_text(match.group("name")),
                "price": int(match.group("price")),
                "status": get_joongna_status(int(match.group("state"))),
                "image_url": decode_joongna_text(match.group("image_url")),
                "date": match.group("date"),
            }
        )
    return items


def get_bunjang_data(keyword: str, config: CrawlingConfig) -> list[dict[str, object]]:
    print("⚡ 번개장터 조회 시작...")
    items: list[dict[str, object]] = []
    page = 0

    while True:
        encoded_keyword = urllib.parse.quote(keyword)
        url = (
            "https://api.bunjang.co.kr/api/1/find_v2.json"
            f"?q={encoded_keyword}&order=date&n=100&page={page}"
        )
        response = get_with_retries(url, "번개장터", config)
        if response is None or response.status_code != 200:
            break

        data = response.json().get("list", [])
        if not data:
            break

        for item in data:
            updated_at = datetime.fromtimestamp(item.get("update_time"))
            if updated_at < config.limit_date:
                return items

            item_name = item.get("name")
            if should_exclude_by_blacklist(str(item_name), config):
                continue

            items.append(
                {
                    "platform": "번개장터",
                    "pid": item.get("pid"),
                    "name": item_name,
                    "price": item.get("price"),
                    "status": get_bunjang_status(item.get("status")),
                    "image_url": item.get("product_image"),
                    "link": f"https://m.bunjang.co.kr/products/{item.get('pid')}",
                    "date": updated_at.strftime("%Y-%m-%d %H:%M"),
                }
            )

        page += 1
        polite_delay(config.bunjang_delay_range)

    return items


def get_joongna_web_data(keyword: str, config: CrawlingConfig) -> list[dict[str, object]]:
    print("📦 중고나라 웹 조회 시작...")
    encoded_keyword = urllib.parse.quote(keyword)
    items: list[dict[str, object]] = []
    page = 1

    while True:
        url = (
            f"https://web.joongna.com/search/{encoded_keyword}"
            f"?page={page}&excludeSoldOutProductYn=N"
        )
        response = get_with_retries(url, "중고나라", config)
        if response is None or response.status_code != 200:
            break

        search_items = parse_joongna_search_items(response.text)
        if not search_items:
            break

        for item in search_items:
            item_date = datetime.strptime(str(item["date"]), "%Y-%m-%d %H:%M:%S")
            if item_date < config.limit_date:
                continue

            item_name = str(item["name"])
            if should_exclude_by_blacklist(item_name, config):
                continue

            items.append(
                {
                    "platform": "중고나라",
                    "pid": item["pid"],
                    "name": item_name,
                    "price": item["price"],
                    "status": item["status"],
                    "image_url": item["image_url"],
                    "link": f"https://web.joongna.com/product/{item['pid']}",
                    "date": item_date.strftime("%Y-%m-%d %H:%M"),
                }
            )

        print(f"중고나라 {page}페이지 완료...")
        page += 1
        polite_delay(config.joongna_delay_range)
        if page > config.joongna_max_pages:
            break

    return items


def merge_keywords(values) -> str:
    keywords = [str(value).strip() for value in values if str(value).strip()]
    return ", ".join(dict.fromkeys(keywords))


def choose_canonical_name(values) -> str:
    keywords = [str(value).strip() for value in values if str(value).strip()]
    if not keywords:
        return ""

    unique_values = list(dict.fromkeys(keywords))
    return max(
        unique_values,
        key=lambda value: (
            len(re.findall(r"[a-z]+[0-9]+|[가-힣]+|[a-z]+|\d+", normalize_search_text(value))),
            len(normalize_search_text(value)),
        ),
    )


def keyword_length(value) -> int:
    return len(normalize_search_text(value))


def deduplicate_items(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    dedupe_columns = ["platform", "pid"]
    keyword_summary = (
        df.groupby(dedupe_columns)["keyword"]
        .agg(
            matched_keywords=merge_keywords,
            canonical_name=choose_canonical_name,
        )
        .reset_index()
    )

    deduplicated_df = (
        df.assign(_keyword_length=df["keyword"].apply(keyword_length))
        .sort_values("_keyword_length", ascending=False, kind="mergesort")
        .drop_duplicates(subset=dedupe_columns, keep="first")
        .drop(columns=["canonical_name", "_keyword_length"], errors="ignore")
    )
    return deduplicated_df.merge(keyword_summary, on=dedupe_columns, how="left")


def run_crawling(config: CrawlingConfig | None = None) -> Path:
    config = config or build_config()
    now = datetime.now().strftime("%Y%m%d_%H%M")
    all_dfs: list[pd.DataFrame] = []

    print("\n조회 키워드 목록")
    for idx, keyword in enumerate(config.keywords, start=1):
        print(f"{idx}. {keyword}")

    for keyword in config.keywords:
        print(f"\n🔎 [{keyword}] 조회 시작")
        bunjang_data = get_bunjang_data(keyword, config)
        joongna_data = get_joongna_web_data(keyword, config)

        df = pd.DataFrame(bunjang_data + joongna_data, columns=RESULT_COLUMNS)
        df.insert(0, "keyword", keyword)
        df.insert(1, "canonical_name", keyword)
        all_dfs.append(df)

        print(f"✅ [{keyword}] 총 {len(df)}개 매물 수집 완료!")
        print(df.head())
        polite_delay(config.keyword_delay_range)

    if not all_dfs:
        raise RuntimeError("수집된 크롤링 데이터가 없습니다.")

    config.result_dir.mkdir(parents=True, exist_ok=True)
    total_df = pd.concat(all_dfs, ignore_index=True)
    total_count = len(total_df)
    total_df = deduplicate_items(total_df)
    output_path = config.result_dir / f"통합조회_전체_no_filter_{now}.csv"
    total_df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(
        f"\n✅ 전체 키워드 총 {total_count}개 매물 수집, "
        f"중복 제거 후 {len(total_df)}개 저장 완료!"
    )
    print(f"CSV 저장: {output_path}")
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="keyword_list.csv 기준으로 중고 플랫폼 상품을 크롤링합니다.")
    parser.add_argument("--keyword-file", type=Path, default=DEFAULT_KEYWORD_FILE)
    parser.add_argument("--blacklist-file", type=Path, default=DEFAULT_BLACKLIST_FILE)
    parser.add_argument("--token-blacklist-file", type=Path, default=DEFAULT_TOKEN_BLACKLIST_FILE)
    parser.add_argument("--result-dir", type=Path, default=DEFAULT_RESULT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = build_config(
        keyword_file=args.keyword_file,
        blacklist_file=args.blacklist_file,
        token_blacklist_file=args.token_blacklist_file,
        result_dir=args.result_dir,
    )
    run_crawling(config)
    print()
    print("다음 단계:")
    print("  python run_refine_data.py")


if __name__ == "__main__":
    main()
