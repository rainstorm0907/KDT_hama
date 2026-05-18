from __future__ import annotations

import csv
import re
import zlib
from dataclasses import asdict, is_dataclass
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from hama_data_pipeline import HamaDataPipeline
from product_matching import ProductMatchIndex


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
    return {"status": "ok"}


@app.get("/api/products/search")
def search_products(
    q: str = Query(default=""),
    platforms: str = Query(default=""),
    sort: str = Query(default="recent"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=5000, ge=1, le=5000),
) -> dict[str, object]:
    del platforms, sort

    query = normalize_text(q)
    products = [
        product
        for product in load_products()
        if not query or query in normalize_text(product["_searchText"])
    ]

    start_index = (page - 1) * limit
    paged_products = products[start_index : start_index + limit]
    items = [{key: value for key, value in product.items() if key != "_searchText"} for product in paged_products]

    return {
        "items": items,
        "total": len(products),
        "page": page,
        "limit": limit,
        # TODO(BE): MVP에서는 프론트의 temporarySearchCalculations.ts가 최저가/평균가를 계산합니다.
        # DB 기반 검색으로 넘어가면 여기서 필터 적용 전체 결과 기준 summary를 계산하고 프론트 임시 코드를 제거합니다.
        "summary": {
            "lowestPrice": 0,
            "averagePrice": 0,
            "updatedAt": latest_result_timestamp(),
        },
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


@lru_cache(maxsize=1)
def load_products() -> list[dict[str, object]]:
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


def find_product(platform: str, pid: str) -> dict[str, object] | None:
    for product in load_products():
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
            "priceHistory": temporary_price_history(price),
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
    product["_searchText"] = " ".join(
        [
            name,
            product.get("category", ""),
            keyword,
            clean_value(row.get("keyword")),
            clean_value(row.get("matched_keywords")),
            " ".join(product.get("matched_keywords", [])),
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


def temporary_price_history(price: int) -> list[dict[str, int | str]]:
    labels = ["05.02", "05.03", "05.04", "05.05", "05.06", "05.07", "05.08"]
    multipliers = [1.08, 1.04, 1.02, 1.01, 0.99, 1.01, 1]
    return [
        {
            "label": label,
            "price": max(1000, round(price * multiplier / 1000) * 1000),
        }
        for label, multiplier in zip(labels, multipliers)
    ]


def model_to_dict(model: object) -> dict[str, object]:
    if is_dataclass(model):
        return asdict(model)
    if hasattr(model, "model_dump"):
        return model.model_dump()  # type: ignore[attr-defined]
    return model.dict()  # type: ignore[attr-defined]


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
