from __future__ import annotations

import csv
import random
import re
import sys
import zlib
from dataclasses import asdict, is_dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BACKEND_DIR = Path(__file__).resolve().parents[3]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from lib.hama_data_pipeline import HamaDataPipeline
from opensearch.documents import MIN_PLAUSIBLE_PRICE
from opensearch.repository import (
    OpenSearchRepositoryError,
    is_opensearch_enabled,
    search_item_ids,
)
from lib.product_matching import ProductMatchIndex
from lib.supabase_repository import (
    SupabaseRepositoryError,
    count_anomaly_items,
    find_anomaly_items,
    find_product_from_supabase,
    find_products_by_item_ids_from_supabase,
    find_related_clusters,
    is_supabase_configured,
    load_products_from_supabase,
)
from lib.gemini_chatbot import answer_message


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
        "searchSource": "opensearch" if is_opensearch_enabled() else "python",
    }


class ChatbotMessageRequest(BaseModel):
    message: str = ""


@app.post("/api/chatbot/message")
def chatbot_message(request: ChatbotMessageRequest) -> dict[str, object]:
    # 프론트 계약: {answer, items, intent}. Gemini 호출은 gemini_chatbot가 담당.
    return answer_message(request.message)


@app.get("/api/products/search")
def search_products(
    q: Annotated[str, Query()] = "",
    platforms: Annotated[str, Query()] = "",
    sort: Annotated[str, Query()] = "recent",
    page: Annotated[int, Query(ge=1)] = 1,
    limit: Annotated[int, Query(ge=1, le=5000)] = 5000,
) -> dict[str, object]:
    query = normalize_text(q)
    platform_filter = parse_platform_filter(platforms)
    opensearch_result = try_search_products_from_opensearch(
        q=q,
        platforms=platform_filter,
        sort=sort,
        page=page,
        limit=limit,
    )
    if opensearch_result is not None:
        return opensearch_result

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
        "searchSource": "python",
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


@app.get("/api/products/anomalies")
def product_anomalies(
    mode: Literal["low_confidence", "accessory"] = "low_confidence",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, object]:
    """관리자 이상데이터: 클러스터 신뢰도 하위 / 악세서리 의심 매물."""
    if not is_supabase_configured():
        raise HTTPException(status_code=503, detail="Supabase가 설정되지 않았습니다.")

    try:
        rows = find_anomaly_items(mode, limit=limit, offset=offset)
    except SupabaseRepositoryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"mode": mode, "limit": limit, "offset": offset, "rows": rows}


@app.get("/api/products/anomalies/summary")
def product_anomalies_summary() -> dict[str, int]:
    """관리자 지표 카드용 이상데이터 카운트."""
    if not is_supabase_configured():
        raise HTTPException(status_code=503, detail="Supabase가 설정되지 않았습니다.")

    try:
        return count_anomaly_items()
    except SupabaseRepositoryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


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


@app.get("/api/products/{platform}/{pid}/insights")
def product_insights(platform: str, pid: str) -> dict[str, object]:
    """상품의 클러스터 기준 관련 클러스터 + 가격 트렌드(온더플라이 집계)."""
    product = find_product(platform, pid)
    if product is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")

    cluster_name = clean_value(str(product.get("category", "")))
    if not is_supabase_configured() or not cluster_name:
        return {"clusterName": cluster_name, "relatedClusters": []}

    try:
        related = find_related_clusters(cluster_name)
    except SupabaseRepositoryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"clusterName": cluster_name, "relatedClusters": related}


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


def try_search_products_from_opensearch(
    *,
    q: str,
    platforms: set[str],
    sort: str,
    page: int,
    limit: int,
) -> dict[str, object] | None:
    if not q.strip() or not is_supabase_configured():
        return None

    try:
        hits, total, summary = search_item_ids(q=q, platforms=platforms, sort=sort, page=page, limit=limit)
        products = find_products_by_item_ids_from_supabase([hit.item_id for hit in hits])
    except (OpenSearchRepositoryError, SupabaseRepositoryError):
        return None

    items = [{key: value for key, value in product.items() if key != "_searchText"} for product in products]
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "summary": summary,
        "searchSource": "opensearch",
    }


@lru_cache(maxsize=1)
def load_products_from_csv() -> list[dict[str, object]]:
    rows: list[dict[str, str]] = []
    for csv_path in result_files():
        rows.extend(read_csv_rows(csv_path))

    pipeline = build_pipeline(rows)
    products_by_key: dict[str, dict[str, object]] = {}
    for row in rows:
        product = to_product(row, pipeline)
        if product is None:
            continue

        key = f"{product['platform']}:{product['pid']}"
        products_by_key[key] = product

    return list(products_by_key.values())


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
        },
        drop_on_filter=True,
    )
    if normalized_product is None:
        return None
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
    all_prices = [
        price
        for price in (product_price(product) for product in products)
        if price is not None and price > 0
    ]
    # 교환/광고 글의 플레이스홀더 가격(1원·500원)은 시세 요약에서 제외한다.
    # 전부 걸러지면(초저가 카테고리) 원본 표본으로 폴백한다.
    prices = [price for price in all_prices if price >= MIN_PLAUSIBLE_PRICE] or all_prices
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api_server:app", host="127.0.0.1", port=8000, reload=True)
