from __future__ import annotations

import csv
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import TypeVar

from supabase_repository import SupabaseRepositoryError, client


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RESULTS_DIR = BASE_DIR / "crawling" / "results" / "by_keyword"
BATCH_SIZE = 500
T = TypeVar("T")


@dataclass(frozen=True)
class CsvProduct:
    platform: str
    original_id: str
    title: str
    current_price: int
    item_url: str
    canonical_name: str
    status: str
    description: str
    category_name: str
    matched_keywords: str
    thumbnail_url: str
    crawled_at: datetime


def main() -> None:
    csv_paths = find_csv_paths()
    products = read_products(csv_paths)
    if not products:
        raise SystemExit("No valid product rows found in crawling CSV files.")

    database = client()
    platform_ids = upsert_platforms(database, sorted({product.platform for product in products}))
    item_payloads = build_item_payloads(products, platform_ids)

    for chunk in chunked(list(item_payloads.values()), BATCH_SIZE):
        database.table("items").upsert(chunk, on_conflict="platform_id,original_id").execute()

    item_ids = fetch_item_ids(database, item_payloads.values())
    history_payloads = build_price_history_payloads(products, platform_ids, item_ids)
    for chunk in chunked(list(history_payloads.values()), BATCH_SIZE):
        database.table("price_history").upsert(chunk, on_conflict="item_id,recorded_at").execute()

    print(
        "Imported "
        f"{len(item_payloads)} items and {len(history_payloads)} price history rows "
        f"from {len(csv_paths)} CSV files."
    )


def find_csv_paths() -> list[Path]:
    csv_paths = sorted(DEFAULT_RESULTS_DIR.glob("*.csv"))
    if not csv_paths:
        csv_paths = sorted((BASE_DIR / "crawling" / "results").glob("*.csv"))

    if not csv_paths:
        raise SystemExit("No crawling CSV files found.")

    return csv_paths


def read_products(csv_paths: list[Path]) -> list[CsvProduct]:
    products: list[CsvProduct] = []
    skipped = 0

    for csv_path in csv_paths:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
            for row in csv.DictReader(csv_file):
                product = parse_product(row)
                if product:
                    products.append(product)
                else:
                    skipped += 1

    if skipped:
        print(f"Skipped {skipped} incomplete CSV rows.")

    return products


def parse_product(row: dict[str, str]) -> CsvProduct | None:
    platform = clean(row.get("platform"))
    original_id = clean(row.get("pid"))
    title = clean(row.get("name"))
    current_price = parse_price(row.get("price"))
    item_url = clean(row.get("link"))

    if not platform or not original_id or not title or current_price is None or not item_url:
        return None

    canonical_name = clean(row.get("canonical_name")) or clean(row.get("keyword")) or title
    return CsvProduct(
        platform=platform,
        original_id=original_id,
        title=title,
        current_price=current_price,
        item_url=item_url,
        canonical_name=canonical_name,
        status=normalize_status(row.get("status")),
        description=clean(row.get("description")),
        category_name=clean(row.get("canonical_name")) or clean(row.get("keyword")),
        matched_keywords=clean(row.get("matched_keywords")),
        thumbnail_url=normalize_image_url(clean(row.get("image_url"))),
        crawled_at=parse_datetime(row.get("date")),
    )


def upsert_platforms(database, platform_names: list[str]) -> dict[str, int]:
    payloads = [{"platform_name": platform_name} for platform_name in platform_names]
    for chunk in chunked(payloads, BATCH_SIZE):
        database.table("platforms").upsert(chunk, on_conflict="platform_name").execute()

    response = (
        database.table("platforms")
        .select("platform_id, platform_name")
        .in_("platform_name", platform_names)
        .execute()
    )
    return {row["platform_name"]: int(row["platform_id"]) for row in response.data or []}


def build_item_payloads(
    products: list[CsvProduct],
    platform_ids: dict[str, int],
) -> dict[tuple[int, str], dict[str, object]]:
    payloads: dict[tuple[int, str], dict[str, object]] = {}
    now = datetime.now().isoformat()

    for product in products:
        platform_id = platform_ids[product.platform]
        payloads[(platform_id, product.original_id)] = {
            "platform_id": platform_id,
            "original_id": product.original_id,
            "canonical_name": product.canonical_name,
            "title": product.title,
            "current_price": product.current_price,
            "lowest_price": product.current_price,
            "status": product.status,
            "description": product.description,
            "category_name": product.category_name,
            "matched_keywords": product.matched_keywords,
            "thumbnail_url": product.thumbnail_url,
            "item_url": product.item_url,
            "crawled_at": product.crawled_at.isoformat(),
            "updated_at": now,
        }

    return payloads


def fetch_item_ids(
    database,
    item_payloads,
) -> dict[tuple[int, str], int]:
    originals_by_platform: dict[int, list[str]] = defaultdict(list)
    for payload in item_payloads:
        originals_by_platform[int(payload["platform_id"])].append(str(payload["original_id"]))

    item_ids: dict[tuple[int, str], int] = {}
    for platform_id, original_ids in originals_by_platform.items():
        for chunk in chunked(sorted(set(original_ids)), BATCH_SIZE):
            response = (
                database.table("items")
                .select("item_id, platform_id, original_id")
                .eq("platform_id", platform_id)
                .in_("original_id", chunk)
                .execute()
            )
            for row in response.data or []:
                item_ids[(int(row["platform_id"]), str(row["original_id"]))] = int(row["item_id"])

    return item_ids


def build_price_history_payloads(
    products: list[CsvProduct],
    platform_ids: dict[str, int],
    item_ids: dict[tuple[int, str], int],
) -> dict[tuple[int, str], dict[str, object]]:
    payloads: dict[tuple[int, str], dict[str, object]] = {}

    for product in products:
        platform_id = platform_ids[product.platform]
        item_id = item_ids.get((platform_id, product.original_id))
        if not item_id:
            continue

        recorded_at = product.crawled_at.date().isoformat()
        payloads[(item_id, recorded_at)] = {
            "item_id": item_id,
            "price": product.current_price,
            "recorded_at": recorded_at,
        }

    return payloads


def chunked(values: list[T], size: int) -> list[list[T]]:
    return [values[index : index + size] for index in range(0, len(values), size)]


def parse_price(value: str | None) -> int | None:
    text = clean(value).replace(",", "")
    return int(text) if text.isdigit() else None


def parse_datetime(value: str | None) -> datetime:
    text = clean(value)
    if not text:
        return datetime.now()

    for date_format in ("%Y-%m-%d %H:%M", "%Y.%m.%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, date_format)
        except ValueError:
            pass

    return datetime.now()


def normalize_status(value: str | None) -> str:
    status = clean(value)
    if status in {"판매중", "예약중", "판매완료"}:
        return status
    return "판매중"


def normalize_image_url(value: str) -> str:
    return value.replace("{res}", "720") if value else ""


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


if __name__ == "__main__":
    try:
        main()
    except SupabaseRepositoryError as exc:
        raise SystemExit(str(exc)) from exc
