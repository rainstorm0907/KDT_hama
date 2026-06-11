from __future__ import annotations

import os
import re
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal


ProductStatus = Literal["판매중", "예약중", "판매완료"]
from lib._paths import PYTHON_DIR

ENV_PATH = PYTHON_DIR / ".env"

try:
    from dotenv import load_dotenv

    load_dotenv(ENV_PATH)
except ImportError:
    pass


class SupabaseRepositoryError(RuntimeError):
    pass


PRODUCT_SELECT = "*, price_history(price, recorded_at)"
SIMILAR_PRICE_SELECT = "item_id, title, canonical_name, category_name, current_price, crawled_at"
OPENSEARCH_ITEM_SELECT = "*"
SUPABASE_PAGE_SIZE = 1000


def is_supabase_configured() -> bool:
    return bool(valid_env_value("SUPABASE_URL") and valid_supabase_key())


def supabase_key() -> str:
    return (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_KEY")
        or ""
    )


def valid_supabase_key() -> str:
    key = supabase_key()
    return "" if key in {"", "your-service-role-key"} else key


def valid_env_value(name: str) -> str:
    value = os.environ.get(name, "")
    placeholders = {
        "SUPABASE_URL": "https://your-project-ref.supabase.co",
    }
    if value == placeholders.get(name):
        return ""
    return value


@lru_cache(maxsize=1)
def client():
    url = valid_env_value("SUPABASE_URL")
    key = valid_supabase_key()
    if not url or not key:
        raise SupabaseRepositoryError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

    try:
        from supabase import create_client
    except ImportError as exc:
        raise SupabaseRepositoryError("Install backend requirements before using Supabase.") from exc

    return create_client(url, key)


def load_products_from_supabase() -> list[dict[str, object]]:
    response = (
        client()
        .table("items")
        .select(PRODUCT_SELECT)
        .order("crawled_at", desc=True)
        .limit(5000)
        .execute()
    )
    rows = response.data or []
    return [to_product(row) for row in rows if row]


def find_product_from_supabase(platform: str, pid: str) -> dict[str, object] | None:
    response = (
        client()
        .table("items")
        .select(PRODUCT_SELECT)
        .eq("platform_name", platform)
        .eq("original_id", pid)
        .maybe_single()
        .execute()
    )
    row = response.data
    if not row:
        return None

    product = to_product(row)
    similar_history = similar_group_price_history(row)
    if len(similar_history) > len(product["priceHistory"]):
        product["priceHistory"] = similar_history
    return product


def find_products_by_item_ids_from_supabase(item_ids: list[int]) -> list[dict[str, object]]:
    if not item_ids:
        return []

    response = (
        client()
        .table("items")
        .select(PRODUCT_SELECT)
        .in_("item_id", item_ids)
        .execute()
    )
    rows = response.data or []
    products_by_id = {
        int(row.get("item_id") or 0): to_product(row)
        for row in rows
        if isinstance(row, dict) and row.get("item_id") is not None
    }
    return [products_by_id[item_id] for item_id in item_ids if item_id in products_by_id]


def load_item_rows_for_opensearch(limit: int | None = None) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    start = 0
    while limit is None or len(rows) < limit:
        end = start + SUPABASE_PAGE_SIZE - 1
        if limit is not None:
            end = min(end, limit - 1)
        response = (
            client()
            .table("items")
            .select(OPENSEARCH_ITEM_SELECT)
            .order("crawled_at", desc=True)
            .range(start, end)
            .execute()
        )
        page_rows = [row for row in response.data or [] if isinstance(row, dict)]
        rows.extend(page_rows)
        if len(page_rows) < end - start + 1:
            break
        start = end + 1
    return rows if limit is None else rows[:limit]


def to_product(row: dict[str, object]) -> dict[str, object]:
    platform = platform_name(row)
    pid = clean_value(row.get("original_id"))
    title = clean_value(row.get("title"))
    canonical_name = clean_value(row.get("canonical_name"))
    category_name = clean_value(row.get("category_name"))
    thumbnail_url = clean_value(row.get("thumbnail_url"))
    item_url = clean_value(row.get("item_url"))
    price = int(row.get("current_price") or 0)
    product_id = int(row.get("item_id") or 0)
    history = price_history(row.get("price_history"), price)

    return {
        "id": product_id,
        "platform": platform,
        "pid": pid,
        "name": title,
        "brand": "",
        "price": price,
        "status": normalize_status(row.get("status")),
        "description": clean_value(row.get("description")),
        "imageUrl": thumbnail_url or None,
        "images": [thumbnail_url] if thumbnail_url else [],
        "link": item_url,
        "date": format_datetime(row.get("crawled_at")),
        "category": canonical_name or category_name,
        "priceHistory": history,
        "_searchText": " ".join(
            [
                title,
                canonical_name,
                category_name,
                clean_value(row.get("matched_keywords")),
            ]
        ),
    }


def platform_name(row: dict[str, object]) -> str:
    return clean_value(row.get("platform_name"))


def price_history(value: object, fallback_price: int) -> list[dict[str, int | str]]:
    if not isinstance(value, list):
        return fallback_history(fallback_price)

    points: list[dict[str, int | str]] = []
    for row in sorted(value, key=lambda item: clean_value(item.get("recorded_at")) if isinstance(item, dict) else ""):
        if not isinstance(row, dict):
            continue
        price = row.get("price")
        if not isinstance(price, int):
            continue
        points.append(
            {
                "label": format_date(row.get("recorded_at")),
                "price": price,
            }
        )

    return points or fallback_history(fallback_price)


def similar_group_price_history(row: dict[str, object]) -> list[dict[str, int | str]]:
    canonical_name = clean_value(row.get("canonical_name"))
    category_name = clean_value(row.get("category_name"))
    query_field = "canonical_name" if canonical_name else "category_name"
    query_value = canonical_name or category_name
    if not query_value:
        return []

    try:
        response = (
            client()
            .table("items")
            .select(SIMILAR_PRICE_SELECT)
            .eq(query_field, query_value)
            .not_.is_("current_price", "null")
            .order("crawled_at")
            .limit(300)
            .execute()
        )
    except Exception:
        return []

    buckets: dict[str, list[int]] = {}
    similar_rows = filter_similar_rows(row, response.data or [])
    similar_prices = similar_group_prices(similar_rows)
    filtered_prices = filter_price_outliers(similar_prices)
    for crawled_at, price in filtered_prices:
        label = format_date(crawled_at)
        if not label:
            continue
        buckets.setdefault(label, []).append(price)

    points = [
        {
            "label": label,
            "price": round(sum(prices) / len(prices)),
        }
        for label, prices in sorted(buckets.items())
        if prices
    ]
    return points


def similar_group_prices(rows: object) -> list[tuple[object, int]]:
    prices: list[tuple[object, int]] = []
    if not isinstance(rows, list):
        return prices

    for similar in rows:
        if not isinstance(similar, dict):
            continue
        price = int(similar.get("current_price") or 0)
        if price <= 0:
            continue
        prices.append((similar.get("crawled_at"), price))
    return prices


def filter_similar_rows(target: dict[str, object], rows: object) -> list[dict[str, object]]:
    if not isinstance(rows, list):
        return []

    candidates = [
        row
        for row in rows
        if isinstance(row, dict) and not is_accessory_or_wanted_row(row)
    ]
    tokens = similarity_tokens(target)
    if not tokens:
        return candidates

    filtered = [
        row
        for row in candidates
        if all(token in normalize_compact(similar_text(row)) for token in tokens)
    ]
    return filtered


def similarity_tokens(row: dict[str, object]) -> list[str]:
    text = clean_value(
        " ".join(
            [
                clean_value(row.get("title")),
                clean_value(row.get("canonical_name")),
                clean_value(row.get("matched_keywords")),
            ]
        )
    ).lower()

    tokens: list[str] = []
    patterns = [
        r"아이폰\s*\d+\s*(?:프로맥스|프로|max|plus|플러스|미니|mini|에어|air)?",
        r"iphone\s*\d+\s*(?:promax|pro|max|plus|mini|air)?",
        r"갤럭시\s*s\s*\d+\s*(?:울트라|플러스|plus)?",
        r"galaxy\s*s\s*\d+\s*(?:ultra|plus)?",
        r"(?<![a-z0-9])s\s*\d{2}\s*(?:울트라|플러스|plus)?",
        r"z\s*플립\s*\d+",
        r"z\s*폴드\s*\d+",
        r"(?<!\d)\d{2,4}\s*(?:gb|기가|g)(?!\d)",
        r"(?<!\d)(?:128|256|512|1024)\s*(?!\d)",
        r"(?<!\d)1\s*(?:tb|테라)(?!\d)",
    ]
    for pattern in patterns:
        for match in re.findall(pattern, text):
            token = normalize_compact(match)
            if token and token not in tokens:
                tokens.append(token)
    return tokens[:3]


def similar_text(row: dict[str, object]) -> str:
    return " ".join(
        [
            clean_value(row.get("title")),
            clean_value(row.get("canonical_name")),
            clean_value(row.get("category_name")),
        ]
    )


def is_accessory_or_wanted_row(row: dict[str, object]) -> bool:
    text = normalize_compact(similar_text(row))
    accessory_terms = [
        "케이스",
        "필름",
        "강화유리",
        "렌즈필름",
        "카메라필름",
        "충전기",
        "충전케이블",
        "어댑터",
        "맥세이프",
        "거치대",
        "스트랩",
        "보호캡",
    ]
    wanted_terms = [
        "삽니다",
        "사봐요",
        "구매합니다",
        "구합니다",
        "매입",
        "교환",
        "대리구매",
    ]
    return any(term in text for term in accessory_terms + wanted_terms)


def normalize_compact(value: object) -> str:
    return "".join(clean_value(value).lower().split())


def filter_price_outliers(prices: list[tuple[object, int]]) -> list[tuple[object, int]]:
    if len(prices) < 3:
        return prices

    ordered = sorted(price for _, price in prices)
    median = ordered[len(ordered) // 2]
    lower_bound = median * 0.35
    upper_bound = median * 2.5
    filtered = [
        (crawled_at, price)
        for crawled_at, price in prices
        if lower_bound <= price <= upper_bound
    ]
    return filtered or prices


def fallback_history(price: int) -> list[dict[str, int | str]]:
    return [{"label": "현재", "price": price}]


def normalize_status(value: object) -> ProductStatus:
    status = clean_value(value)
    if status == "예약중":
        return "예약중"
    if status == "판매완료":
        return "판매완료"
    return "판매중"


def format_datetime(value: object) -> str:
    text = clean_value(value)
    if not text:
        return ""
    return re.sub(r"[TZ]", " ", text).strip()[:16]


def format_date(value: object) -> str:
    if isinstance(value, datetime):
        return value.strftime("%m.%d")
    if isinstance(value, date):
        return value.strftime("%m.%d")

    text = clean_value(value)
    if not text:
        return ""

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).strftime("%m.%d")
    except ValueError:
        return text[:5]


def clean_value(value: object) -> str:
    return str(value or "").strip()
