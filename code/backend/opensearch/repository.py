from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from opensearch.documents import MIN_PLAUSIBLE_PRICE, SUMMARY_PRICE_FLOOR_RATIO


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_OPENSEARCH_URL = "http://localhost:9200"
DEFAULT_INDEX_NAME = "hama_items"
DEFAULT_MAPPING_PATH = BASE_DIR / "index_mapping.json"
ACCESSORY_INTENT_TOKENS = {
    "케이스",
    "case",
    "필름",
    "강화유리",
    "맥세이프",
    "magsafe",
    "충전기",
    "어댑터",
    "커버",
    "스트랩",
    "빈박스",
    "상자",
    "트레이",
}


class OpenSearchRepositoryError(RuntimeError):
    pass


@dataclass(frozen=True)
class OpenSearchHit:
    item_id: int
    score: float


def is_opensearch_enabled() -> bool:
    value = os.environ.get("HAMA_OPENSEARCH_ENABLED", "false").lower()
    return value not in {"0", "false", "no", "off"}


def search_item_ids(
    *,
    q: str,
    platforms: set[str],
    sort: str,
    page: int,
    limit: int,
) -> tuple[list[OpenSearchHit], int, dict[str, object]]:
    if not is_opensearch_enabled():
        raise OpenSearchRepositoryError("OpenSearch is disabled.")
    if not q.strip():
        raise OpenSearchRepositoryError("OpenSearch search requires a non-empty query.")

    try:
        body = build_search_body(q=q, platforms=platforms, sort=sort, page=page, limit=limit)
        response = client().search(index=index_name(), body=body)
    except Exception as exc:
        raise OpenSearchRepositoryError(str(exc)) from exc

    hits = response.get("hits", {})
    aggregations = response.get("aggregations", {})
    summary = parse_search_summary(aggregations)
    summary = refine_summary_below_floor(summary, aggregations, body)
    return (
        parse_hits(hits.get("hits", [])),
        total_hits(hits.get("total")),
        summary,
    )


def refine_summary_below_floor(
    summary: dict[str, object],
    aggregations: object,
    body: dict[str, Any],
) -> dict[str, object]:
    """플레이스홀더 가격(낚시·잡글)이 최저가를 오염시키면 분포 기준 하한으로 재집계한다.

    하한 = max(MIN_PLAUSIBLE_PRICE, 중앙값 * SUMMARY_PRICE_FLOOR_RATIO).
    최저가가 하한 이상이면 추가 요청 없이 원본 요약을 그대로 쓴다.
    """
    median = parse_aggregation_median(aggregations)
    if median is None:
        return summary

    floor = max(MIN_PLAUSIBLE_PRICE, round(median * SUMMARY_PRICE_FLOOR_RATIO))
    lowest = summary.get("lowestPrice")
    if not isinstance(lowest, int) or lowest <= 0 or lowest >= floor:
        return summary

    floor_body = {
        "size": 0,
        "query": {
            "bool": {
                "must": [body["query"]],
                "filter": [{"range": {"current_price": {"gte": floor}}}],
            }
        },
        "aggs": body["aggs"],
    }
    try:
        response = client().search(index=index_name(), body=floor_body)
    except Exception:
        return summary

    refined = parse_search_summary(response.get("aggregations", {}))
    return refined if refined.get("lowestPrice") else summary


def ensure_index(*, recreate: bool = False) -> None:
    search_client = client()
    target_index = index_name()
    try:
        exists = search_client.indices.exists(index=target_index)
        if exists and recreate:
            search_client.indices.delete(index=target_index)
            exists = False
        if not exists:
            search_client.indices.create(index=target_index, body=load_index_mapping())
    except Exception as exc:
        raise OpenSearchRepositoryError(str(exc)) from exc


def bulk_index_documents(documents: list[dict[str, Any]]) -> int:
    if not documents:
        return 0

    try:
        from opensearchpy.helpers import bulk

        actions = [
            {
                "_op_type": "index",
                "_index": index_name(),
                "_id": document["document_id"],
                "_source": document,
            }
            for document in documents
        ]
        success_count, _ = bulk(client(), actions, stats_only=True, request_timeout=60)
        client().indices.refresh(index=index_name())
    except Exception as exc:
        raise OpenSearchRepositoryError(str(exc)) from exc

    return int(success_count)


@lru_cache(maxsize=1)
def client():
    try:
        from opensearchpy import OpenSearch
    except ImportError as exc:
        raise OpenSearchRepositoryError("Install opensearch-py before using OpenSearch.") from exc

    host = opensearch_url()
    return OpenSearch(
        hosts=[host],
        use_ssl=host.startswith("https://"),
        verify_certs=False,
        ssl_show_warn=False,
        timeout=2,
        max_retries=1,
        retry_on_timeout=False,
    )


def opensearch_url() -> str:
    return (
        os.environ.get("HAMA_OPENSEARCH_URL")
        or os.environ.get("OPENSEARCH_URL")
        or DEFAULT_OPENSEARCH_URL
    )


def index_name() -> str:
    return os.environ.get("HAMA_OPENSEARCH_INDEX") or DEFAULT_INDEX_NAME


def load_index_mapping() -> dict[str, Any]:
    return json.loads(DEFAULT_MAPPING_PATH.read_text(encoding="utf-8"))


def build_search_body(
    *,
    q: str,
    platforms: set[str],
    sort: str,
    page: int,
    limit: int,
) -> dict[str, Any]:
    filters: list[dict[str, Any]] = []
    must_not: list[dict[str, Any]] = [
        {"term": {"quality_flags": "noise_candidate"}},
        {"term": {"quality_flags": "invalid_price"}},
    ]

    if platforms:
        filters.append({"terms": {"platform": sorted(platforms)}})
    if not has_accessory_intent(q):
        must_not.append({"term": {"quality_flags": "accessory_candidate"}})

    body: dict[str, Any] = {
        "from": (page - 1) * limit,
        "size": limit,
        "track_total_hits": True,
        "aggs": {
            "lowest_price": {"min": {"field": "current_price"}},
            "average_price": {"avg": {"field": "current_price"}},
            "price_median": {"percentiles": {"field": "current_price", "percents": [50]}},
            "latest_crawled_at": {
                "max": {
                    "field": "crawled_at",
                    "format": "yyyy-MM-dd HH:mm",
                }
            },
        },
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": q,
                            "fields": [
                                "canonical_name^5",
                                "title^4",
                                "matched_keywords^3",
                                "normalized_title^2",
                                "search_text",
                            ],
                            "type": "best_fields",
                            "operator": "and",
                            "fuzziness": "AUTO",
                        }
                    }
                ],
                "filter": filters,
                "must_not": must_not,
            }
        },
    }

    if sort == "recent":
        body["sort"] = [{"crawled_at": {"order": "desc"}}, "_score"]
    elif sort == "low-price":
        body["sort"] = [{"current_price": {"order": "asc"}}, "_score"]

    return body


def parse_hits(hits: list[dict[str, Any]]) -> list[OpenSearchHit]:
    parsed_hits: list[OpenSearchHit] = []
    for hit in hits:
        source = hit.get("_source", {})
        item_id = parse_int(source.get("item_id"))
        if item_id is None:
            item_id = parse_int(hit.get("_id"))
        if item_id is None:
            continue
        parsed_hits.append(OpenSearchHit(item_id=item_id, score=float(hit.get("_score") or 0)))
    return parsed_hits


def total_hits(value: object) -> int:
    if isinstance(value, dict):
        total = value.get("value")
        return int(total) if isinstance(total, int) else 0
    if isinstance(value, int):
        return value
    return 0


def parse_search_summary(aggregations: object) -> dict[str, object]:
    if not isinstance(aggregations, dict):
        return empty_search_summary()

    lowest_price = parse_aggregation_number(aggregations.get("lowest_price"))
    average_price = parse_aggregation_number(aggregations.get("average_price"))
    updated_at = parse_aggregation_date(aggregations.get("latest_crawled_at"))
    if lowest_price is None or average_price is None:
        return empty_search_summary(updated_at=updated_at)

    return {
        "lowestPrice": int(lowest_price),
        "averagePrice": round(average_price),
        "updatedAt": updated_at,
    }


def empty_search_summary(*, updated_at: str = "") -> dict[str, object]:
    return {
        "lowestPrice": 0,
        "averagePrice": 0,
        "updatedAt": updated_at,
    }


def parse_aggregation_number(value: object) -> float | None:
    if not isinstance(value, dict):
        return None
    number = value.get("value")
    if not isinstance(number, int | float):
        return None
    return float(number)


def parse_aggregation_date(value: object) -> str:
    if not isinstance(value, dict):
        return ""
    text = str(value.get("value_as_string") or "").strip()
    return text


def parse_aggregation_median(aggregations: object) -> float | None:
    if not isinstance(aggregations, dict):
        return None
    percentiles = aggregations.get("price_median")
    if not isinstance(percentiles, dict):
        return None
    values = percentiles.get("values")
    if not isinstance(values, dict):
        return None
    median = values.get("50.0")
    return float(median) if isinstance(median, int | float) else None


def has_accessory_intent(query: str) -> bool:
    normalized = query.lower().replace(" ", "")
    return any(token.lower().replace(" ", "") in normalized for token in ACCESSORY_INTENT_TOKENS)


def parse_int(value: object) -> int | None:
    if isinstance(value, int):
        return value
    text = str(value or "").strip()
    return int(text) if text.isdigit() else None
