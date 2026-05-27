from __future__ import annotations

import os
import re
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal


ProductStatus = Literal["판매중", "예약중", "판매완료"]
ENV_PATH = Path(__file__).with_name(".env")

try:
    from dotenv import load_dotenv

    load_dotenv(ENV_PATH)
except ImportError:
    pass


class SupabaseRepositoryError(RuntimeError):
    pass


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
        .select("*, platforms(platform_name), price_history(price, recorded_at)")
        .order("crawled_at", desc=True)
        .limit(5000)
        .execute()
    )
    rows = response.data or []
    return [to_product(row) for row in rows if row]


def find_product_from_supabase(platform: str, pid: str) -> dict[str, object] | None:
    platform_response = (
        client()
        .table("platforms")
        .select("platform_id")
        .eq("platform_name", platform)
        .maybe_single()
        .execute()
    )
    platform_row = platform_response.data
    if not platform_row:
        return None

    response = (
        client()
        .table("items")
        .select("*, platforms(platform_name), price_history(price, recorded_at)")
        .eq("platform_id", platform_row["platform_id"])
        .eq("original_id", pid)
        .maybe_single()
        .execute()
    )
    row = response.data
    if not row:
        return None

    return to_product(row)


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
    platform = row.get("platforms")
    if isinstance(platform, dict):
        return clean_value(platform.get("platform_name"))
    return ""


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
