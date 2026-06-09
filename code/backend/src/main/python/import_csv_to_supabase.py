from __future__ import annotations

import argparse
import csv
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import TypeVar

from item_rating import compute_item_rating, rating_breakdown_to_payload
from supabase_repository import SupabaseRepositoryError, client


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_RESULTS_DIR = BASE_DIR / "crawling" / "results" / "by_keyword"
DEFAULT_PREVIEW_CSV = BASE_DIR / "analysis" / "exports" / "keyword_db_input_df.csv"
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
    cluster_product_name: str = ""
    cluster_route: str | None = None
    view_count: int = 0


def main() -> None:
    args = parse_args()
    csv_paths = find_csv_paths(args)
    products = read_products(csv_paths)
    if not products:
        raise SystemExit("No valid product rows found in CSV files.")

    group_min_prices = build_group_min_prices(products)
    max_view_count = max((product.view_count for product in products), default=0)

    database = client()
    platform_ids = upsert_platforms(database, sorted({product.platform for product in products}))
    item_payloads = build_item_payloads(
        products,
        platform_ids,
        group_min_prices=group_min_prices,
        max_view_count=max_view_count,
    )

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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import crawling/preview CSV rows into Supabase items.")
    parser.add_argument(
        "--preview-csv",
        type=Path,
        default=None,
        help="keyword_final preview CSV path. 지정 시 cluster_product_name 기반 rating 계산에 사용합니다.",
    )
    parser.add_argument(
        "--use-cluster-preview",
        action="store_true",
        help=f"기본 preview CSV를 사용합니다: {DEFAULT_PREVIEW_CSV}",
    )
    return parser.parse_args()


def find_csv_paths(args: argparse.Namespace) -> list[Path]:
    if args.preview_csv is not None:
        if not args.preview_csv.exists():
            raise SystemExit(f"Preview CSV not found: {args.preview_csv}")
        return [args.preview_csv]

    if args.use_cluster_preview:
        if not DEFAULT_PREVIEW_CSV.exists():
            raise SystemExit(f"Default preview CSV not found: {DEFAULT_PREVIEW_CSV}")
        return [DEFAULT_PREVIEW_CSV]

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
            reader = csv.DictReader(csv_file)
            fieldnames = reader.fieldnames or []
            using_preview = is_preview_csv(fieldnames)
            if using_preview:
                log_preview_rating_inputs(fieldnames)

            for row in reader:
                product = parse_preview_product(row) if using_preview else parse_product(row)
                if product:
                    products.append(product)
                else:
                    skipped += 1

    if skipped:
        print(f"Skipped {skipped} incomplete CSV rows.")

    return products


def is_preview_csv(fieldnames: list[str]) -> bool:
    return "cluster_product_name" in fieldnames and (
        "price_numeric" in fieldnames or "price" in fieldnames
    )


def log_preview_rating_inputs(fieldnames: list[str]) -> None:
    present_columns = [column for column in PREVIEW_RATING_INPUT_COLUMNS if column in fieldnames]
    missing_columns = [column for column in PREVIEW_RATING_INPUT_COLUMNS if column not in fieldnames]
    print(
        "Preview CSV rating inputs: "
        f"present={present_columns or ['none']}, missing={missing_columns or ['none']}"
    )


def is_preview_row(row: dict[str, str]) -> bool:
    return "cluster_product_name" in row and ("price_numeric" in row or "price" in row)


PREVIEW_RATING_INPUT_COLUMNS = (
    "cluster_product_name",
    "cluster_route",
    "price_numeric",
    "date",
    "view_count",
)


def parse_product(row: dict[str, str]) -> CsvProduct | None:
    platform = clean(row.get("platform"))
    original_id = clean(row.get("pid"))
    title = clean(row.get("name"))
    current_price = parse_price(row.get("price"))
    item_url = clean(row.get("link"))

    if not platform or not original_id or not title or current_price is None or not item_url:
        return None

    canonical_name = clean(row.get("canonical_name")) or clean(row.get("keyword")) or title
    cluster_product_name = clean(row.get("cluster_product_name")) or canonical_name
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
        cluster_product_name=cluster_product_name,
        cluster_route=clean(row.get("cluster_route")) or None,
        view_count=parse_int(row.get("view_count"), default=0),
    )


def parse_preview_product(row: dict[str, str]) -> CsvProduct | None:
    platform = clean(row.get("platform"))
    original_id = clean(row.get("pid"))
    title = clean(row.get("name"))
    current_price = parse_price(row.get("price_numeric") or row.get("price"))
    item_url = clean(row.get("link"))
    cluster_product_name = clean(row.get("cluster_product_name"))

    if not platform or not original_id or not title or current_price is None or not item_url:
        return None

    canonical_name = cluster_product_name or clean(row.get("keyword")) or title
    return CsvProduct(
        platform=platform,
        original_id=original_id,
        title=title,
        current_price=current_price,
        item_url=item_url,
        canonical_name=canonical_name,
        status=normalize_status(row.get("status")),
        description=clean(row.get("description")),
        category_name=clean(row.get("keyword")),
        matched_keywords=clean(row.get("keyword")),
        thumbnail_url=normalize_image_url(clean(row.get("image_url"))),
        crawled_at=parse_datetime(row.get("date")),
        cluster_product_name=cluster_product_name or canonical_name,
        cluster_route=clean(row.get("cluster_route")) or None,
        view_count=parse_int(row.get("view_count"), default=0),
    )


def build_group_min_prices(products: list[CsvProduct]) -> dict[str, int]:
    group_min_prices: dict[str, int] = {}
    for product in products:
        key = product.cluster_product_name or product.canonical_name
        current = group_min_prices.get(key)
        if current is None or product.current_price < current:
            group_min_prices[key] = product.current_price
    return group_min_prices


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
    *,
    group_min_prices: dict[str, int],
    max_view_count: int,
) -> dict[tuple[int, str], dict[str, object]]:
    payloads: dict[tuple[int, str], dict[str, object]] = {}
    now = datetime.now().isoformat()

    for product in products:
        platform_id = platform_ids[product.platform]
        cluster_product_name = product.cluster_product_name or product.canonical_name
        group_min_price = group_min_prices.get(cluster_product_name)

        rating_payload = rating_breakdown_to_payload(
            compute_item_rating(
                cluster_product_name=cluster_product_name,
                current_price=product.current_price,
                group_min_price=group_min_price,
                view_count=product.view_count,
                max_view_count=max_view_count,
                reference_at=product.crawled_at,
                cluster_route=product.cluster_route,
            ),
            cluster_product_name,
        )

        payloads[(platform_id, product.original_id)] = {
            "platform_id": platform_id,
            "original_id": product.original_id,
            "canonical_name": cluster_product_name,
            "title": product.title,
            "current_price": product.current_price,
            "lowest_price": group_min_price or product.current_price,
            "status": product.status,
            "description": product.description,
            "category_name": product.category_name or product.canonical_name,
            "matched_keywords": product.matched_keywords,
            "thumbnail_url": product.thumbnail_url,
            "item_url": product.item_url,
            "crawled_at": product.crawled_at.isoformat(),
            "last_seen_at": now,
            "updated_at": now,
            **rating_payload,
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
    if not text:
        return None
    digits = re.sub(r"[^\d]", "", text)
    return int(digits) if digits else None


def parse_int(value: str | None, *, default: int = 0) -> int:
    text = clean(value).replace(",", "")
    return int(text) if text.isdigit() else default


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
