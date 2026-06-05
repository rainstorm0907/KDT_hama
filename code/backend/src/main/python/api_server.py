from __future__ import annotations

import csv
import json
import os
import random
import re
import zlib
from dataclasses import asdict, is_dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import requests
from bs4 import BeautifulSoup
from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).with_name(".env"))
except ImportError:
    pass

from hama_data_pipeline import HamaDataPipeline
from product_matching import ProductMatchIndex
from supabase_repository import (
    SupabaseRepositoryError,
    find_product_from_supabase,
    is_supabase_configured,
    load_products_from_supabase,
)


BASE_DIR = Path(__file__).resolve().parent
CRAWLING_DIR = BASE_DIR / "crawling"
RESULTS_DIR = CRAWLING_DIR / "results"
BY_KEYWORD_DIR = RESULTS_DIR / "by_keyword"
LABELS_DIR = RESULTS_DIR / "labels"
ARCHIVE_TEST_RESULTS_DIR = BASE_DIR / "archive" / "TEST" / "results"
ARCHIVE_CLUSTER_DIR = ARCHIVE_TEST_RESULTS_DIR / "clusters"
RESULT_TIMESTAMP_PATTERN = re.compile(r"_(?P<date>\d{8})_(?P<time>\d{4})\.csv$")
DETAIL_REQUEST_TIMEOUT = 3
DETAIL_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
GENERIC_DESCRIPTIONS = {
    "직거래부터 택배거래까지 쉽고 안전하게, 취향 기반 중고거래 플랫폼",
    "취향을 잇는 거래, 번개장터",
}

ProductStatus = Literal["판매중", "예약중", "판매완료"]

app = FastAPI(title="Hama MVP API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "dataSource": "supabase" if is_supabase_configured() else "csv",
    }


@app.get("/api/products/search")
def search_products(
    q: str = Query(default=""),
    platforms: str = Query(default=""),
    sort: str = Query(default="recent"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=5000, ge=1, le=5000),
) -> dict[str, object]:
    query = normalize_text(q)
    platform_filter = parse_platform_filter(platforms)
    products = [
        product
        for product in load_products()
        if matches_query(product, query) and matches_platform(product, platform_filter)
    ]
    products = sort_search_products(products, sort, query)

    start_index = (page - 1) * limit
    paged_products = products[start_index : start_index + limit]
    items = [{key: value for key, value in product.items() if key != "_searchText"} for product in paged_products]

    return {
        "items": items,
        "total": len(products),
        "page": page,
        "limit": limit,
        "summary": search_summary(products),
    }


@app.get("/api/products/recommended")
def recommended_products(
    limit: int = Query(default=8, ge=1, le=32),
) -> dict[str, object]:
    products = load_products()
    recommended = random.sample(products, k=min(limit, len(products))) if products else []
    items = [{key: value for key, value in product.items() if key != "_searchText"} for product in recommended]

    return {
        "items": items,
        "total": len(products),
        "limit": limit,
        "summary": search_summary(products),
    }


@app.get("/api/products/{platform}/{pid}")
def product_detail(platform: str, pid: str) -> dict[str, object]:
    product = find_product(platform, pid)
    if product is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")

    detail_product = dict(product)
    description = clean_value(str(detail_product.get("description", "")))
    if not description:
        description = fetch_external_description(
            clean_value(str(detail_product.get("platform", ""))),
            clean_value(str(detail_product.get("pid", ""))),
            clean_value(str(detail_product.get("link", ""))),
        )

    detail_product["description"] = description
    detail_product.pop("_searchText", None)

    return detail_product


def load_products() -> list[dict[str, object]]:
    if is_supabase_configured():
        try:
            return load_products_from_supabase()
        except SupabaseRepositoryError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return load_products_from_csv()


def find_product(platform: str, pid: str) -> dict[str, object] | None:
    if is_supabase_configured():
        try:
            return find_product_from_supabase(platform, pid)
        except SupabaseRepositoryError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return find_product_from_csv(platform, pid)


@lru_cache(maxsize=1)
def load_products_from_csv() -> list[dict[str, object]]:
    rows: list[dict[str, str]] = []
    for csv_path in result_files():
        rows.extend(read_csv_rows(csv_path))

    products_by_key: dict[str, dict[str, object]] = {}
    for row in rows:
        product = fast_row_to_product(row)
        if product is None:
            continue

        key = f"{product['platform']}:{product['pid']}"
        products_by_key[key] = product

    return list(products_by_key.values())


def fast_row_to_product(row: dict[str, str]) -> dict[str, object] | None:
    platform = clean_value(row.get("platform"))
    pid = clean_value(row.get("pid"))
    name = clean_value(row.get("name"))
    price = parse_price(row.get("price"))

    if not platform or not pid or not name or price is None:
        return None

    image_url = normalize_image_url(clean_value(row.get("image_url")))
    keyword = clean_value(row.get("canonical_name")) or clean_value(row.get("keyword"))
    date = clean_value(row.get("date"))
    link = clean_value(row.get("link"))
    matched_keywords = clean_value(row.get("matched_keywords"))
    product_id = zlib.crc32(f"{platform}:{pid}".encode("utf-8"))

    product: dict[str, object] = {
        "id": product_id,
        "platform": platform,
        "pid": pid,
        "name": name,
        "price": price,
        "status": normalize_status(row.get("status")),
        "imageUrl": image_url,
        "images": [image_url] if image_url else [],
        "link": link,
        "date": date,
        "description": clean_value(row.get("description")),
        "category": clean_value(row.get("category")),
        "priceHistory": current_price_history(price, date),
        "raw_title": name,
        "normalized_title": name,
        "source_keyword": keyword,
        "matched_keywords": matched_keywords,
        "graphKeywords": [],
        "brand": "",
        "canonical_name": clean_value(row.get("canonical_name")),
        "_searchText": " ".join(filter(None, [name, keyword, matched_keywords, clean_value(row.get("keyword"))])),
    }
    return product


def find_product_from_csv(platform: str, pid: str) -> dict[str, object] | None:
    for product in load_products_from_csv():
        if product["platform"] == platform and product["pid"] == pid:
            return product

    return None


def result_files() -> list[Path]:
    by_keyword_files = sorted(BY_KEYWORD_DIR.glob("*.csv"))
    if by_keyword_files:
        return by_keyword_files

    result_files = sorted(RESULTS_DIR.glob("*.csv"), key=lambda path: path.stat().st_mtime, reverse=True)
    return result_files[:1]


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        return list(csv.DictReader(csv_file))


def build_pipeline(rows: list[dict[str, str]]) -> HamaDataPipeline:
    reference_rows = [*rows, *read_match_reference_rows()]
    return HamaDataPipeline(match_index=ProductMatchIndex.from_rows(reference_rows))


def read_match_reference_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    reference_paths = [
        *sorted(LABELS_DIR.glob("*.csv")),
        ARCHIVE_CLUSTER_DIR / "latest_token_cluster_items.csv",
        ARCHIVE_CLUSTER_DIR / "latest_token_cluster_summary.csv",
    ]
    for path in reference_paths:
        if path.exists():
            rows.extend(read_csv_rows(path))
    return rows


def to_product(row: dict[str, str], pipeline: HamaDataPipeline) -> dict[str, object] | None:
    platform = clean_value(row.get("platform"))
    pid = clean_value(row.get("pid"))
    name = clean_value(row.get("name"))
    price = parse_price(row.get("price"))

    if not platform or not pid or not name or price is None:
        return None

    image_url = normalize_image_url(clean_value(row.get("image_url")))
    keyword = clean_value(row.get("canonical_name")) or clean_value(row.get("keyword"))
    date = clean_value(row.get("date"))
    link = clean_value(row.get("link"))
    product_id = zlib.crc32(f"{platform}:{pid}".encode("utf-8"))
    normalized_product = pipeline.run_pipeline(
        {
            "platform": platform,
            "pid": pid,
            "name": name,
            "raw_title": name,
            "price": price,
            "status": normalize_status(row.get("status")),
            "description": clean_value(row.get("description")),
            "imageUrl": image_url,
            "images": [image_url] if image_url else [],
            "link": link,
            "date": date,
            "keyword": keyword,
            "source_keyword": keyword,
            "priceHistory": current_price_history(price, date),
            "category": clean_value(row.get("category")),
            "canonical_name": clean_value(row.get("canonical_name")),
            "matched_keywords": clean_value(row.get("matched_keywords")),
            "cluster_id": clean_value(row.get("cluster_id")),
            "cluster_l1_id": clean_value(row.get("cluster_l1_id")),
            "cluster_l2_id": clean_value(row.get("cluster_l2_id")),
            "representative_name": clean_value(row.get("representative_name")),
            "derived_product_name": clean_value(row.get("derived_product_name")),
            "tree_path_ids": clean_value(row.get("tree_path_ids")),
        }
    )
    product = model_to_dict(normalized_product)

    product["id"] = product_id
    product["brand"] = ""
    product_matched_keywords = product.get("matched_keywords", {})
    if isinstance(product_matched_keywords, dict):
        matched_keyword_text = " ".join(str(value) for value in product_matched_keywords.values())
    else:
        matched_keyword_text = " ".join(str(value) for value in product_matched_keywords)
    product["_searchText"] = " ".join(
        [
            name,
            product.get("category", ""),
            keyword,
            clean_value(row.get("keyword")),
            clean_value(row.get("matched_keywords")),
            matched_keyword_text,
            " ".join(product.get("graphKeywords", [])),
        ]
    )
    return product


@lru_cache(maxsize=2048)
def fetch_external_description(platform: str, pid: str, link: str) -> str:
    if platform == "중고나라":
        return fetch_meta_description(link or f"https://web.joongna.com/product/{pid}")
    if platform == "번개장터":
        return fetch_meta_description(link or f"https://m.bunjang.co.kr/products/{pid}")

    return ""


def fetch_meta_description(url: str) -> str:
    if not url:
        return ""

    try:
        response = requests.get(url, headers=DETAIL_HEADERS, timeout=DETAIL_REQUEST_TIMEOUT)
        response.raise_for_status()
    except requests.RequestException:
        return ""

    soup = BeautifulSoup(response.content, "html.parser")
    for selector in (
        {"name": "description"},
        {"property": "og:description"},
        {"name": "twitter:description"},
    ):
        meta_tag = soup.find("meta", attrs=selector)
        description = normalize_description(
            meta_tag.get("content") if meta_tag else ""
        )
        if description:
            return description

    return ""


def normalize_description(value: object) -> str:
    description = re.sub(r"\s+", " ", str(value or "")).strip()
    if description in GENERIC_DESCRIPTIONS:
        return ""

    return description


def parse_price(value: str | None) -> int | None:
    cleaned_value = clean_value(value).replace(",", "")
    if not cleaned_value.isdigit():
        return None
    return int(cleaned_value)


def normalize_status(value: str | None) -> ProductStatus:
    status = clean_value(value)
    if status == "판매중":
        return "판매중"
    if status == "예약중":
        return "예약중"
    return "판매완료"


def normalize_image_url(value: str) -> str | None:
    if not value:
        return None
    return value.replace("{res}", "720")


def current_price_history(price: int, date_text: str) -> list[dict[str, int | str]]:
    return [
        {
            "label": format_price_history_label(date_text),
            "price": price,
        }
    ]


def format_price_history_label(date_text: str) -> str:
    text = clean_value(date_text)
    if not text:
        return "현재"

    for date_format in ("%Y-%m-%d %H:%M", "%Y.%m.%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, date_format).strftime("%m.%d")
        except ValueError:
            pass

    return text[:5] or "현재"


def model_to_dict(model: object) -> dict[str, object]:
    if is_dataclass(model):
        return asdict(model)
    if hasattr(model, "model_dump"):
        return model.model_dump()  # type: ignore[attr-defined]
    return model.dict()  # type: ignore[attr-defined]


def search_summary(products: list[dict[str, object]]) -> dict[str, object]:
    prices = [
        price
        for price in (product_price(product) for product in products)
        if price is not None and price > 0
    ]
    if not prices:
        return {
            "lowestPrice": 0,
            "averagePrice": 0,
            "updatedAt": latest_result_timestamp(),
        }

    return {
        "lowestPrice": min(prices),
        "averagePrice": round(sum(prices) / len(prices)),
        "updatedAt": latest_product_timestamp(products) or latest_result_timestamp(),
    }


def parse_platform_filter(platforms: str) -> set[str]:
    return {
        clean_value(platform)
        for platform in platforms.split(",")
        if clean_value(platform)
    }


def matches_query(product: dict[str, object], query: str) -> bool:
    return not query or query in normalize_text(product.get("_searchText", ""))


def matches_platform(product: dict[str, object], platform_filter: set[str]) -> bool:
    if not platform_filter:
        return True
    return clean_value(str(product.get("platform", ""))) in platform_filter


def sort_search_products(
    products: list[dict[str, object]],
    sort: str,
    query: str,
) -> list[dict[str, object]]:
    if sort == "low-price":
        return sorted(products, key=lambda product: product_price(product) or 0)
    if sort == "recent":
        return sorted(
            products,
            key=lambda product: clean_value(str(product.get("date", ""))),
            reverse=True,
        )

    # TODO(BE): 정확도순은 이후 검색 랭킹 모델/DB 점수로 교체합니다.
    # 현재는 API 계약 안정화를 위한 임시 점수입니다.
    prices = [price for price in (product_price(item) for item in products) if price]
    average_price = sum(prices) / len(prices) if prices else 0
    return sorted(
        products,
        key=lambda product: relevance_score(product, query, average_price),
        reverse=True,
    )


def relevance_score(
    product: dict[str, object],
    query: str,
    average_price: float,
) -> float:
    search_text = normalize_text(product.get("_searchText", ""))
    tokens = tokenize_query(query)
    matched_token_count = sum(1 for token in tokens if token in search_text)
    token_score = matched_token_count / len(tokens) if tokens else 0
    exact_query_bonus = 0.35 if query and query in search_text else 0
    price = product_price(product) or 0
    price_distance = abs(price - average_price) / max(average_price, 1)
    price_score = max(0, 1 - price_distance)
    stable_shuffle = stable_random(
        f"{query}:{product.get('platform', '')}:{product.get('pid', '')}"
    )

    return token_score * 8 + exact_query_bonus + price_score * 2 + stable_shuffle


def tokenize_query(query: str) -> list[str]:
    return [
        normalize_text(token)
        for token in re.findall(r"[a-z]+[0-9]+|[가-힣]+|[a-z]+|\d+", query.lower())
        if normalize_text(token)
    ]


def stable_random(seed: str) -> float:
    return zlib.crc32(seed.encode("utf-8")) / 0xFFFFFFFF


def product_price(product: dict[str, object]) -> int | None:
    price = product.get("price")
    if isinstance(price, int):
        return price
    if isinstance(price, str) and price.isdigit():
        return int(price)
    return None


def latest_product_timestamp(products: list[dict[str, object]]) -> str:
    timestamps = sorted(
        clean_value(str(product.get("date", "")))
        for product in products
        if clean_value(str(product.get("date", "")))
    )
    return timestamps[-1] if timestamps else ""


def latest_result_timestamp() -> str:
    files = result_files()
    if not files:
        return ""
    latest_file = max(files, key=lambda path: path.stat().st_mtime)
    timestamp_match = RESULT_TIMESTAMP_PATTERN.search(latest_file.name)
    if timestamp_match:
        parsed_timestamp = datetime.strptime(
            f"{timestamp_match.group('date')}{timestamp_match.group('time')}",
            "%Y%m%d%H%M",
        )
        return parsed_timestamp.strftime("%Y-%m-%d %H:%M")

    return datetime.fromtimestamp(latest_file.stat().st_mtime).strftime("%Y-%m-%d %H:%M")


def normalize_text(value: object) -> str:
    return "".join(str(value).lower().split())


def clean_value(value: str | None) -> str:
    return str(value or "").strip()


# ---------------------------------------------------------------------------
# 챗봇
# ---------------------------------------------------------------------------

DOCS_DIR = BASE_DIR.parents[4] / "docs"
FAQ_CSV_PATH = DOCS_DIR / "chatbot_expected_answers.csv"
GEMINI_API_BASE = "https://generativelanguage.googleapis.com"
GEMINI_MODEL = "gemini-1.5-flash"


@lru_cache(maxsize=1)
def load_faq_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    if not FAQ_CSV_PATH.exists():
        return entries
    with FAQ_CSV_PATH.open(encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            patterns = [p.strip() for p in row.get("question_patterns", "").split("|") if p.strip()]
            answer = row.get("answer_text", "").strip()
            if patterns and answer:
                entries.append({"patterns": patterns, "answer": answer})
    return entries


def find_faq_answer(message: str) -> str | None:
    normalized = message.strip().lower()
    for entry in load_faq_entries():
        for pattern in entry["patterns"]:
            if pattern.lower() in normalized:
                return entry["answer"]
    return None


def _contains_any(text: str, *keywords: str) -> bool:
    return any(kw in text for kw in keywords)


def _extract_all_prices(message: str) -> list[int]:
    text = message.replace(",", "").lower().strip()
    prices: list[int] = []

    range_manwon = re.findall(r"(\d{1,4})\s*[~\-–—]\s*(\d{1,4})\s*만원", text)
    if range_manwon:
        for a, b in range_manwon:
            prices += [int(a) * 10_000, int(b) * 10_000]
        return prices

    single_manwon = re.findall(r"(\d{1,4})\s*만원", text)
    for v in single_manwon:
        val = int(v)
        if 1 <= val <= 5000:
            prices.append(val * 10_000)

    won_prices = re.findall(r"(\d{4,})\s*원", text)
    for v in won_prices:
        prices.append(int(v))

    return prices


def _extract_min_price(message: str) -> int | None:
    prices = _extract_all_prices(message)
    normalized = message.lower().replace(" ", "")
    if len(prices) >= 2 and _contains_any(normalized, "사이", "에서", "부터", "~", "-"):
        return prices[0]
    if _contains_any(normalized, "이상", "부터"):
        return prices[0] if prices else None
    return None


def _extract_max_price(message: str) -> int | None:
    prices = _extract_all_prices(message)
    normalized = message.lower().replace(" ", "")
    if not prices:
        return None
    if len(prices) >= 2 and _contains_any(normalized, "사이", "에서", "부터", "~", "-"):
        return prices[1]
    if _contains_any(normalized, "이하", "미만", "아래", "까지", "예산", "안쪽"):
        return prices[-1]
    if len(prices) == 1 and not _contains_any(normalized, "이상", "부터"):
        return prices[0]
    return None


def _guess_product_type(message: str, keyword: str) -> str | None:
    text = (message + " " + keyword).lower().replace(" ", "")
    if _contains_any(text, "닌텐도", "스위치", "플스", "ps5", "ps4", "xbox", "엑스박스", "스팀덱"):
        return "game_console"
    if _contains_any(text, "노트북", "랩탑"):
        return "laptop"
    if _contains_any(text, "컴퓨터", "데스크탑", "본체", "pc"):
        return "desktop"
    if _contains_any(text, "아이폰", "갤럭시", "스마트폰", "휴대폰"):
        return "smartphone"
    return None


def _guess_use_case(message: str) -> str | None:
    normalized = message.lower().replace(" ", "")
    if _contains_any(normalized, "롤", "배그", "배틀그라운드", "에이펙스", "에이팩스", "사이버펑크", "게임", "게이밍"):
        return "gaming"
    if _contains_any(normalized, "중학생", "초등학생", "고등학생", "학생", "자녀"):
        return "student"
    if _contains_any(normalized, "사무용", "문서작업", "업무용"):
        return "office"
    if _contains_any(normalized, "코딩", "개발용", "프로그래밍"):
        return "coding"
    if _contains_any(normalized, "영상편집", "디자인", "포토샵"):
        return "creative"
    return None


def _extract_keyword_by_rule(message: str) -> str:
    normalized = message.lower().replace(" ", "")

    known: list[tuple[str, str]] = [
        ("닌텐도스위치oled", "닌텐도 스위치 OLED"),
        ("닌텐도스위치", "닌텐도 스위치"),
        ("닌텐도", "닌텐도"),
        ("플스5", "플스5"), ("ps5", "플스5"), ("플레이스테이션5", "플스5"),
        ("플스4", "플스4"), ("ps4", "플스4"),
        ("스팀덱", "스팀덱"), ("steamdeck", "스팀덱"),
        ("xbox", "xbox"), ("엑스박스", "xbox"),
    ]
    for marker, name in known:
        if marker in normalized:
            return name

    iphone = re.search(r"(아이폰)\s*(\d{1,2})?\s*(프로맥스|프로|미니|플러스|max|mini|plus)?", message.lower())
    if iphone:
        parts = [iphone.group(1)]
        num = iphone.group(2)
        if num and 4 <= int(num) <= 20:
            parts.append(num)
            if iphone.group(3):
                parts.append(iphone.group(3))
        return " ".join(parts)

    galaxy = re.search(r"(갤럭시)\s*(s\d{1,2}|z\s*플립\d*|z\s*폴드\d*|플립\d*|폴드\d*|노트\d*)?", message.lower())
    if galaxy:
        return (galaxy.group(1) + (" " + galaxy.group(2) if galaxy.group(2) else "")).strip()

    for word in ["에어팟 프로", "에어팟 맥스", "에어팟", "맥북 프로", "맥북 에어", "맥북", "아이패드 프로", "아이패드 에어", "아이패드 미니", "아이패드", "애플워치"]:
        if word in message.lower():
            return word

    for word in ["노트북", "모니터", "키보드", "마우스", "카메라", "컴퓨터", "데스크탑"]:
        if word in message.lower():
            return "컴퓨터" if word in ("데스크탑",) else word

    cleaned = re.sub(r"\d+\s*만원(\s*(이하|이상|미만|아래|까지|부터|사이|예산))?", "", message)
    cleaned = re.sub(r"\d{4,}\s*원(\s*(이하|이상|미만|아래|까지|부터))?", "", cleaned)
    for token in ["추천해줘", "추천", "찾아줘", "찾아", "보여줘", "보여", "알려줘", "검색", "조회", "상품", "제품", "매물", "시세", "가격", "비교", "저렴한", "싼", "이하", "이상", "사이", "예산", "구매", "살려고", "사려고", "?", "!", "."]:
        cleaned = cleaned.replace(token, "")
    return cleaned.strip()


def _fallback_analyze(message: str) -> dict[str, Any]:
    normalized = message.lower().replace(" ", "")
    keyword = _extract_keyword_by_rule(message)
    min_price = _extract_min_price(message)
    max_price = _extract_max_price(message)

    if _contains_any(normalized, "안녕", "하이", "반가워", "hello", "hi"):
        return {"intent": "GREETING", "keyword": "", "minPrice": None, "maxPrice": None}

    if _contains_any(normalized, "무슨사이트", "어떤사이트", "하마가뭐", "하마는뭐", "어떤서비스", "서비스소개", "이사이트"):
        return {"intent": "FAQ", "keyword": "", "minPrice": None, "maxPrice": None}

    if _contains_any(normalized, "나한테추천", "맞춤추천", "개인추천", "내추천"):
        return {"intent": "PERSONAL_RECOMMEND", "keyword": "", "minPrice": None, "maxPrice": None}

    if _contains_any(normalized, "찜목록", "내찜", "관심목록"):
        return {"intent": "WISHLIST_LIST", "keyword": "", "minPrice": None, "maxPrice": None}

    if _contains_any(normalized, "가격알림", "알림설정", "목표가격"):
        return {"intent": "PRICE_ALERT_GUIDE", "keyword": "", "minPrice": None, "maxPrice": None}

    if _contains_any(normalized, "시세", "가격비교", "가격대", "얼마", "최저가"):
        return {
            "intent": "PRICE_COMPARE", "keyword": keyword,
            "minPrice": min_price, "maxPrice": max_price,
            "productType": _guess_product_type(message, keyword),
            "useCase": _guess_use_case(message),
        }

    if keyword and _contains_any(normalized, "추천", "골라", "찾아", "보여", "조회", "검색", "상품", "제품", "매물", "구매", "사려고"):
        return {
            "intent": "PRODUCT_RECOMMEND", "keyword": keyword,
            "minPrice": min_price, "maxPrice": max_price,
            "productType": _guess_product_type(message, keyword),
            "useCase": _guess_use_case(message),
        }

    return {"intent": "UNKNOWN", "keyword": "", "minPrice": None, "maxPrice": None}


def _call_gemini(message: str) -> dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return {}

    prompt = f"""너는 중고거래 가격 비교 서비스의 검색 조건 분석기다.

사용자의 메시지를 분석해서 반드시 JSON만 출력해라.
설명 문장, 마크다운, 코드블록은 출력하지 마라.

intent 값은 아래 중 하나만 사용해라.
FAQ, GREETING, ITEM_COUNT, WISHLIST_LIST,
PRODUCT_RECOMMEND, PERSONAL_RECOMMEND,
PRICE_COMPARE, PRICE_ALERT_GUIDE,
SEARCH_HELP, UNKNOWN

keyword는 DB 상품 검색에 사용할 핵심 상품명이다. 절대 사용자 문장 전체를 keyword로 넣지 마라.

가격 규칙:
- "30만원 이하"는 maxPrice = 300000
- "50만원 이상"은 minPrice = 500000
- "50~100만원 사이"는 minPrice=500000, maxPrice=1000000
- 가격 조건이 없으면 null

productType: desktop / laptop / smartphone / game_console / null
useCase: gaming / student / office / coding / creative / null
performanceLevel: LOW / MID / HIGH / EXTREME / null
excludeAccessory: true
tradeStatus: "SALE"

출력 형식:
{{"intent": "PRODUCT_RECOMMEND", "keyword": "컴퓨터", "minPrice": null, "maxPrice": null, "productType": "desktop", "useCase": "gaming", "gameName": null, "performanceLevel": "MID", "excludeAccessory": true, "tradeStatus": "SALE"}}

사용자 메시지:
{message}"""

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 256},
    }
    try:
        resp = requests.post(
            f"{GEMINI_API_BASE}/v1beta/models/{GEMINI_MODEL}:generateContent",
            params={"key": api_key},
            json=body,
            timeout=20,
        )
        resp.raise_for_status()
        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
    except Exception:
        pass
    return {}


def _analyze_message(message: str) -> dict[str, Any]:
    fallback = _fallback_analyze(message)
    intent = fallback.get("intent", "UNKNOWN")

    needs_gemini = intent == "UNKNOWN" or (
        intent in ("PRODUCT_RECOMMEND", "PRICE_COMPARE")
        and _contains_any(
            message.lower().replace(" ", ""),
            "롤", "배그", "게임", "게이밍", "학생", "사무용", "코딩", "영상편집",
            "가성비", "풀옵", "144hz", "4k", "사이버펑크", "에이펙스",
        )
    )

    if not needs_gemini:
        return fallback

    gemini = _call_gemini(message)
    if gemini and gemini.get("intent") and gemini["intent"] != "UNKNOWN":
        if fallback.get("minPrice") and not gemini.get("minPrice"):
            gemini["minPrice"] = fallback["minPrice"]
        if fallback.get("maxPrice") and not gemini.get("maxPrice"):
            gemini["maxPrice"] = fallback["maxPrice"]
        return gemini

    return fallback


def _search_products_for_chat(keyword: str, min_price: int | None, max_price: int | None, limit: int = 10) -> list[dict[str, Any]]:
    if not keyword:
        return []
    kw = keyword.lower()
    results = [
        p for p in load_products()
        if kw in str(p.get("name", "")).lower()
        and p.get("status") == "판매중"
        and (min_price is None or (isinstance(p.get("price"), int) and p["price"] >= min_price))
        and (max_price is None or (isinstance(p.get("price"), int) and p["price"] <= max_price))
    ]
    results.sort(key=lambda p: p.get("price", 0))
    return [
        {
            "itemId": p.get("id"),
            "title": p.get("name", ""),
            "currentPrice": p.get("price"),
            "thumbnailUrl": p.get("imageUrl"),
            "itemUrl": p.get("link", ""),
            "platform": p.get("platform", ""),
            "recommendReason": "검색어와 관련성이 높은 상품입니다.",
        }
        for p in results[:limit]
    ]


def _make_recommendation_answer(keyword: str, min_price: int | None, max_price: int | None, use_case: str | None, items: list[dict[str, Any]]) -> str:
    if not items:
        if max_price:
            return f"'{keyword}' 관련 상품 중 {max_price:,}원 이하 조건에 맞는 상품을 찾지 못했습니다."
        return f"'{keyword}' 관련 추천 상품을 찾지 못했습니다. 검색어를 바꿔서 다시 시도해 보세요."
    if min_price and max_price:
        return f"'{keyword}' 관련 상품 중 {min_price:,}원 이상 {max_price:,}원 이하 상품을 추천순으로 정리했습니다."
    if max_price:
        return f"'{keyword}' 관련 상품 중 {max_price:,}원 이하 상품을 가격 기준으로 정리했습니다."
    return f"'{keyword}' 관련 상품 중 가격, 최신성을 기준으로 추천 상품을 정리했습니다."


def _make_price_compare_answer(keyword: str, items: list[dict[str, Any]]) -> str:
    if not items:
        return f"'{keyword}' 관련 시세 비교 대상 상품을 찾지 못했습니다."
    prices = [i["currentPrice"] for i in items if i.get("currentPrice")]
    if not prices:
        return f"'{keyword}' 관련 상품을 찾았습니다. 가격 정보가 있는 상품 위주로 확인해 주세요."
    return f"'{keyword}' 관련 상품의 현재 가격대는 약 {min(prices):,}원 ~ {max(prices):,}원입니다. 아래 상품들을 기준으로 비교해 보세요."


@app.post("/api/chatbot/message")
def chatbot_message(body: dict[str, Any] = Body(...)) -> dict[str, Any]:
    message = str(body.get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=400, detail="message가 비어 있습니다.")

    # 1. FAQ 우선 매칭
    faq_answer = find_faq_answer(message)
    if faq_answer:
        return {"answer": faq_answer, "intent": "FAQ", "responseType": "FAQ", "keyword": "", "items": []}

    # 2. 인텐트 분석 (룰 기반 + Gemini)
    analysis = _analyze_message(message)
    intent = str(analysis.get("intent") or "UNKNOWN").upper()
    keyword = str(analysis.get("keyword") or "").strip()
    min_price: int | None = analysis.get("minPrice")
    max_price: int | None = analysis.get("maxPrice")
    use_case: str | None = analysis.get("useCase")

    # 3. 인텐트별 응답
    if intent == "GREETING":
        return {
            "answer": "안녕하세요! 중고거래 가격 비교 서비스 하마입니다. 상품 검색, 가격 비교, 찜, 시세, 가격 알림에 대해 물어보실 수 있어요.",
            "intent": intent, "responseType": "RULE", "keyword": "", "items": [],
        }

    if intent == "ITEM_COUNT":
        count = len(load_products())
        answer = f"현재 등록된 상품은 총 {count:,}개입니다. 찾고 싶은 상품명을 입력하면 관련 상품을 추천해드릴 수 있습니다."
        return {"answer": answer, "intent": intent, "responseType": "RULE", "keyword": "", "items": []}

    if intent == "WISHLIST_LIST":
        return {
            "answer": "찜 목록은 마이페이지에서 확인할 수 있습니다. 상품 상세 화면의 하트 버튼을 눌러 찜 목록에 추가해보세요.",
            "intent": intent, "responseType": "RULE", "keyword": keyword, "items": [],
        }

    if intent == "PERSONAL_RECOMMEND":
        return {
            "answer": "맞춤 추천은 로그인 후 검색 기록과 찜 목록을 바탕으로 제공됩니다. 관심 있는 상품을 먼저 검색하거나 찜해보세요.",
            "intent": intent, "responseType": "RULE", "keyword": "", "items": [],
        }

    if intent == "PRICE_ALERT_GUIDE":
        return {
            "answer": "가격 알림은 상품 상세 화면의 알림 버튼을 누르면 설정할 수 있습니다. 마이페이지 알림 목록에서 대상 상품을 확인할 수 있어요.",
            "intent": intent, "responseType": "GUIDE", "keyword": "", "items": [],
        }

    if intent == "SEARCH_HELP":
        return {
            "answer": "검색창에 상품명을 입력하면 여러 중고거래 플랫폼의 상품을 한곳에서 비교할 수 있습니다. 예를 들어 '아이폰 14', '갤럭시 S23', '에어팟 프로'처럼 입력하면 됩니다.",
            "intent": intent, "responseType": "GUIDE", "keyword": "", "items": [],
        }

    if intent == "PRODUCT_RECOMMEND":
        if not keyword:
            return {
                "answer": "찾고 싶은 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 13 보여줘', '30만원 이하 갤럭시 추천해줘'처럼 물어보실 수 있습니다.",
                "intent": intent, "responseType": "GUIDE", "keyword": "", "items": [],
            }
        items = _search_products_for_chat(keyword, min_price, max_price)
        answer = _make_recommendation_answer(keyword, min_price, max_price, use_case, items)
        return {"answer": answer, "intent": intent, "responseType": "DB_RECOMMEND", "keyword": keyword, "items": items}

    if intent == "PRICE_COMPARE":
        if not keyword:
            return {
                "answer": "시세를 확인할 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 14 시세 알려줘'처럼 물어보실 수 있습니다.",
                "intent": intent, "responseType": "GUIDE", "keyword": "", "items": [],
            }
        items = _search_products_for_chat(keyword, min_price, max_price)
        answer = _make_price_compare_answer(keyword, items)
        return {"answer": answer, "intent": intent, "responseType": "DB_PRICE_COMPARE", "keyword": keyword, "items": items}

    return {
        "answer": "아직 그 질문은 정확히 이해하지 못했어요. 상품 검색, 가격 비교, 찜, 시세, 가격 알림 관련 질문을 도와드릴 수 있습니다. 예를 들어 '아이폰 13 저렴한 상품 찾아줘', '가격 알림은 어떻게 설정해?'처럼 물어보실 수 있어요.",
        "intent": intent, "responseType": "DEFAULT", "keyword": keyword, "items": [],
    }
