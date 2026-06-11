from __future__ import annotations

import os
import re
from collections import defaultdict
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


# --- 클러스터 가격 인사이트 (온더플라이 집계) -------------------------------
# 개별 상품의 price_history는 보통 1포인트뿐이라 트렌드가 안 나온다.
# 같은 cluster_product_name 상품들의 price_history를 일자별 평균으로 묶어
# 클러스터 단위 가격 트렌드를 만든다. 상세 차트와 가격비교 창이 공유한다.

_CAPACITY_RE = re.compile(r"\d+(gb|tb|기가|테라)", re.IGNORECASE)
_ACCESSORY_TOKENS = (
    "케이스", "필름", "강화유리", "유리", "충전기", "충전", "케이블", "젠더",
    "거치대", "파우치", "그립", "스트랩", "보호", "홀더", "스티커",
)


def cluster_base_name(cluster_name: str) -> str:
    """변형 토큰(용량 등)을 끝에서 떼어내 모델 식별 접두부를 만든다.

    예: "아이폰 13 미니 128gb" -> "아이폰 13 미니"
    """
    tokens = clean_value(cluster_name).split()
    while len(tokens) > 1 and _CAPACITY_RE.fullmatch(tokens[-1]):
        tokens.pop()
    return " ".join(tokens)


def is_accessory_cluster(name: str) -> bool:
    return any(token in name for token in _ACCESSORY_TOKENS)


def _chunked(values: list[int], size: int = 200) -> list[list[int]]:
    return [values[i : i + size] for i in range(0, len(values), size)]


def _daily_points(date_prices: dict[str, list[int]]) -> list[dict[str, int | str]]:
    points: list[dict[str, int | str]] = []
    for recorded_at in sorted(d for d in date_prices if d):
        prices = date_prices[recorded_at]
        if prices:
            points.append({"label": format_date(recorded_at), "price": round(sum(prices) / len(prices))})
    return points


def find_related_clusters(cluster_name: str, *, limit: int = 6) -> list[dict[str, object]]:
    """대상 클러스터와 접두 토큰을 공유하는 관련 클러스터 목록을 트렌드와 함께 반환한다.

    반환: [{clusterName, avgPrice, count, points:[{label, price}]}], 대상 클러스터가 맨 앞.
    """
    name = clean_value(cluster_name)
    base = cluster_base_name(name)
    if not base:
        return []

    db = client()
    rows = (
        db.table("items")
        .select("item_id, cluster_product_name, current_price")
        .ilike("cluster_product_name", f"{base}%")
        .execute()
        .data
        or []
    )

    cluster_prices: dict[str, list[int]] = defaultdict(list)
    id_to_cluster: dict[int, str] = {}
    for row in rows:
        cluster = clean_value(row.get("cluster_product_name"))
        item_id = row.get("item_id")
        if not cluster or item_id is None:
            continue
        # 액세서리 클러스터는 제외(단, 대상 클러스터 자신은 유지)
        if cluster != name and is_accessory_cluster(cluster):
            continue
        cluster_prices[cluster].append(int(row.get("current_price") or 0))
        id_to_cluster[int(item_id)] = cluster

    cluster_date_prices: dict[str, dict[str, list[int]]] = defaultdict(lambda: defaultdict(list))
    for chunk in _chunked(list(id_to_cluster.keys())):
        history = (
            db.table("price_history")
            .select("item_id, price, recorded_at")
            .in_("item_id", chunk)
            .execute()
            .data
            or []
        )
        for entry in history:
            item_id = entry.get("item_id")
            price = entry.get("price")
            if item_id is None or not isinstance(price, int):
                continue
            cluster = id_to_cluster.get(int(item_id))
            if cluster:
                cluster_date_prices[cluster][clean_value(entry.get("recorded_at"))].append(price)

    result: list[dict[str, object]] = []
    for cluster, prices in cluster_prices.items():
        result.append(
            {
                "clusterName": cluster,
                "avgPrice": round(sum(prices) / len(prices)) if prices else 0,
                "count": len(prices),
                "points": _daily_points(cluster_date_prices.get(cluster, {})),
            }
        )

    # 대상 클러스터를 맨 앞, 그다음 매물 수 많은 순
    result.sort(key=lambda item: (item["clusterName"] != name, -int(item["count"])))
    return result[:limit]


# --- 관리자: 이상데이터 조회 (적재 없이 items 직접 쿼리) ------------------------
# 클러스터 신뢰도 하위 / 클러스터에 악세서리 매물이 섞인 케이스를 관리자 화면에 노출.
# 악세서리 토큰은 config/accessory_tokens.csv에서 관리한다 (token_exclude_list와 동일 포맷).

_ANOMALY_COLUMNS = (
    "item_id, platform_name, original_id, title, current_price, status, "
    "cluster_product_name, cluster_confidence, item_url"
)


@lru_cache(maxsize=1)
def accessory_tokens() -> tuple[str, ...]:
    path = PYTHON_DIR / "config" / "accessory_tokens.csv"
    if not path.exists():
        return ()

    import csv

    tokens: list[str] = []
    with path.open(encoding="utf-8-sig") as fp:
        for row in csv.DictReader(fp):
            token = clean_value(row.get("token"))
            if token and str(row.get("enabled", "1")).strip() != "0":
                tokens.append(token)
    return tuple(tokens)


def _matched_accessory_tokens(title: str) -> list[str]:
    return [token for token in accessory_tokens() if token in title]


def _to_anomaly_row(row: dict[str, object]) -> dict[str, object]:
    title = clean_value(row.get("title"))
    return {
        "itemId": row.get("item_id"),
        "platform": clean_value(row.get("platform_name")),
        "pid": clean_value(row.get("original_id")),
        "title": title,
        "price": row.get("current_price"),
        "saleStatus": clean_value(row.get("status")),
        "clusterName": clean_value(row.get("cluster_product_name")),
        "clusterConfidence": row.get("cluster_confidence"),
        "matchedTokens": _matched_accessory_tokens(title),
        "link": clean_value(row.get("item_url")),
    }


def _accessory_or_filter() -> str:
    return ",".join(f"title.ilike.%{token}%" for token in accessory_tokens())


def find_anomaly_items(
    mode: Literal["low_confidence", "accessory"],
    *,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, object]]:
    """클러스터된 매물 중 이상 후보를 반환한다.

    - low_confidence: cluster_confidence 낮은 순
    - accessory: 제목에 악세서리 토큰이 포함된 매물 (신뢰도 낮은 순)
    """
    db = client()
    query = (
        db.table("items")
        .select(_ANOMALY_COLUMNS)
        .not_.is_("cluster_product_name", "null")
    )

    if mode == "accessory":
        query = query.or_(_accessory_or_filter())

    rows = (
        query.order("cluster_confidence", desc=False)
        .order("item_id", desc=False)
        .range(offset, offset + limit - 1)
        .execute()
        .data
        or []
    )
    return [_to_anomaly_row(row) for row in rows]


def count_anomaly_items() -> dict[str, int]:
    """관리자 지표 카드용 카운트: 저신뢰 클러스터 / 악세서리 의심."""
    db = client()

    low_confidence = (
        db.table("items")
        .select("item_id", count="exact", head=True)
        .not_.is_("cluster_product_name", "null")
        .lt("cluster_confidence", 0.5)
        .execute()
        .count
        or 0
    )

    accessory = (
        db.table("items")
        .select("item_id", count="exact", head=True)
        .not_.is_("cluster_product_name", "null")
        .or_(_accessory_or_filter())
        .execute()
        .count
        or 0
    )

    return {"lowConfidence": int(low_confidence), "accessory": int(accessory)}
