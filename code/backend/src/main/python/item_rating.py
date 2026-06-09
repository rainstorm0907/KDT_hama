"""items.rating 및 파생 점수 계산 유틸리티."""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone

import pandas as pd

RATING_WEIGHT_CLUSTER = 0.40
RATING_WEIGHT_PRICE = 0.30
RATING_WEIGHT_VIEW = 0.20
RATING_WEIGHT_RECENCY = 0.10

RECENCY_FULL_SCORE_DAYS = 1
RECENCY_ZERO_SCORE_DAYS = 30

CANONICAL_CLUSTER_PATTERN = re.compile(
    r"^(갤럭시|아이폰|iphone)\s+"
    r"(?:s\d{1,2}|a\d{1,2}|z플립\d{1,2}|z폴드\d{1,2}|노트\d{1,2}|\d{1,2})"
    r"(?:\s+(?:프로|플러스|맥스|미니|fe))?"
    r"(?:\s+\d{1,4}(?:gb|tb))?$",
    re.I,
)
ACCESSORY_CLUSTER_PATTERN = re.compile(r"(케이스|필름)$", re.I)
MODEL_SIGNAL_PATTERN = re.compile(r"s\d{1,2}|a\d{1,2}|z플립|z폴드|노트|\d{1,2}\s*프로", re.I)


@dataclass(frozen=True)
class ItemRatingBreakdown:
    rating: float
    cluster_score: float
    price_score: float
    view_score: float
    recency_score: float
    cluster_confidence: float
    view_count: int = 0


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def compute_cluster_score(
    cluster_product_name: str,
    *,
    cluster_route: str | None = None,
) -> tuple[float, float]:
    name = str(cluster_product_name or "").strip()
    route = str(cluster_route or "").strip().lower()

    if route == "canonical":
        return 100.0, 1.0
    if route == "accessory":
        return 90.0, 0.9
    if route == "token":
        return 45.0, 0.45
    if CANONICAL_CLUSTER_PATTERN.match(name):
        return 95.0, 0.95
    if ACCESSORY_CLUSTER_PATTERN.search(name):
        return 85.0, 0.85
    if MODEL_SIGNAL_PATTERN.search(name):
        return 65.0, 0.65
    if name:
        return 45.0, 0.45
    return 20.0, 0.2


def compute_price_score(current_price: int, group_min_price: int | None) -> float:
    if current_price <= 0:
        return 0.0
    if not group_min_price or group_min_price <= 0:
        return 50.0

    ratio = current_price / group_min_price
    if ratio <= 1.0:
        return 100.0
    if ratio <= 1.03:
        return 90.0
    if ratio <= 1.08:
        return 75.0
    if ratio <= 1.15:
        return 55.0
    if ratio <= 1.30:
        return 35.0
    return max(0.0, 100.0 - ((ratio - 1.0) * 100.0))


def compute_view_score(view_count: int, max_view_count: int) -> float:
    if view_count <= 0 or max_view_count <= 0:
        return 0.0
    return _clamp_score((view_count / max_view_count) * 100.0)


def compute_recency_score(
    reference_at: datetime | None,
    *,
    now: datetime | None = None,
) -> float:
    if reference_at is None:
        return 0.0

    current = now or datetime.now(timezone.utc)
    if reference_at.tzinfo is None:
        reference_at = reference_at.replace(tzinfo=timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)

    age_days = max(0.0, (current - reference_at).total_seconds() / 86_400)
    if age_days <= RECENCY_FULL_SCORE_DAYS:
        return 100.0
    if age_days >= RECENCY_ZERO_SCORE_DAYS:
        return 0.0

    span = RECENCY_ZERO_SCORE_DAYS - RECENCY_FULL_SCORE_DAYS
    return _clamp_score(100.0 * (1.0 - ((age_days - RECENCY_FULL_SCORE_DAYS) / span)))


def compute_item_rating(
    *,
    cluster_product_name: str,
    current_price: int,
    group_min_price: int | None = None,
    view_count: int = 0,
    max_view_count: int = 0,
    reference_at: datetime | None = None,
    cluster_route: str | None = None,
) -> ItemRatingBreakdown:
    cluster_score, cluster_confidence = compute_cluster_score(
        cluster_product_name,
        cluster_route=cluster_route,
    )
    price_score = _clamp_score(compute_price_score(current_price, group_min_price))
    view_score = _clamp_score(compute_view_score(view_count, max_view_count))
    recency_score = _clamp_score(compute_recency_score(reference_at))

    rating = _clamp_score(
        cluster_score * RATING_WEIGHT_CLUSTER
        + price_score * RATING_WEIGHT_PRICE
        + view_score * RATING_WEIGHT_VIEW
        + recency_score * RATING_WEIGHT_RECENCY
    )

    return ItemRatingBreakdown(
        rating=rating,
        cluster_score=cluster_score,
        price_score=price_score,
        view_score=view_score,
        recency_score=recency_score,
        cluster_confidence=cluster_confidence,
        view_count=view_count,
    )


def rating_fields_to_payload(breakdown: ItemRatingBreakdown) -> dict[str, object]:
    return {
        "rating": breakdown.rating,
        "cluster_score": breakdown.cluster_score,
        "price_score": breakdown.price_score,
        "view_score": breakdown.view_score,
        "recency_score": breakdown.recency_score,
        "cluster_confidence": breakdown.cluster_confidence,
        "view_count": breakdown.view_count,
    }


def rating_breakdown_to_payload(
    breakdown: ItemRatingBreakdown,
    cluster_product_name: str,
) -> dict[str, object]:
    return {
        **rating_fields_to_payload(breakdown),
        "cluster_product_name": cluster_product_name,
    }


def enrich_dataframe_with_rating(
    df: pd.DataFrame,
    *,
    cluster_column: str = "cluster_product_name",
    price_column: str = "price_numeric",
    viewed_at_column: str | None = None,
    view_count_column: str | None = None,
    cluster_route_column: str | None = None,
    reference_at: datetime | None = None,
) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    working = df.copy()
    if cluster_column not in working.columns:
        working[cluster_column] = ""
    if price_column not in working.columns:
        working[price_column] = 0

    working[price_column] = pd.to_numeric(working[price_column], errors="coerce").fillna(0).astype(int)
    group_min_prices = working.groupby(cluster_column, dropna=False)[price_column].min().to_dict()

    if view_count_column and view_count_column in working.columns:
        view_counts = pd.to_numeric(working[view_count_column], errors="coerce").fillna(0).astype(int)
        max_view_count = int(view_counts.max()) if len(view_counts) else 0
    else:
        view_counts = pd.Series(0, index=working.index, dtype=int)
        max_view_count = 0

    rating_rows = []
    for index, row in working.iterrows():
        cluster_name = str(row.get(cluster_column, "") or "").strip()
        current_price = int(row.get(price_column, 0) or 0)
        group_min_price = group_min_prices.get(cluster_name)
        view_count = int(view_counts.loc[index]) if index in view_counts.index else 0

        row_reference_at = reference_at
        if viewed_at_column and viewed_at_column in working.columns:
            parsed = pd.to_datetime(row.get(viewed_at_column), errors="coerce")
            if pd.notna(parsed):
                row_reference_at = parsed.to_pydatetime()

        cluster_route = None
        if cluster_route_column and cluster_route_column in working.columns:
            cluster_route = str(row.get(cluster_route_column, "") or "").strip() or None

        breakdown = compute_item_rating(
            cluster_product_name=cluster_name,
            current_price=current_price,
            group_min_price=int(group_min_price) if group_min_price is not None else None,
            view_count=view_count,
            max_view_count=max_view_count,
            reference_at=row_reference_at,
            cluster_route=cluster_route,
        )
        rating_rows.append(rating_fields_to_payload(breakdown))

    rating_df = pd.DataFrame(rating_rows, index=working.index)
    return pd.concat([working, rating_df], axis=1)
