from __future__ import annotations

import re
from typing import Any


ACCESSORY_TOKENS = {
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
NOISE_TOKENS = {
    "삽니다",
    "매입",
    "광고",
    "문의",
    "대여",
    "렌탈",
    "임대",
    "빌리",
    "보증금",
    "구매합니다",
    "구합니다",
    "구해요",
    "구함",
    "사요",
    "사기꾼",
    "조심",
}

# 교환/광고/구매 글이 1원·500원 같은 플레이스홀더 가격을 달고 올라온다.
# 이 가격대는 실거래 호가가 아니므로 invalid_price로 분류해 검색·시세 요약에서 뺀다.
MIN_PLAUSIBLE_PRICE = 1000

# 교환글의 가격란은 플레이스홀더(1,000원)나 추가금이라 판매가가 아니다.
# 단, 이 금액 이상이면 판매 겸 교환 글로 보고 검색에 유지한다.
EXCHANGE_TOKEN = "교환"
MAX_EXCHANGE_PLACEHOLDER_PRICE = 100_000

# 시세 요약(최저가/평균가)에서 결과 중앙값 대비 이 비율 미만 가격은
# 토큰으로 못 잡은 낚시·잡글의 플레이스홀더로 보고 집계에서 제외한다.
# (검색 결과 노출에는 영향 없음)
SUMMARY_PRICE_FLOOR_RATIO = 0.03


def build_search_document_from_item_row(row: dict[str, Any]) -> dict[str, Any] | None:
    item_id = parse_int(row.get("item_id"))
    platform = platform_name(row)
    pid = clean_value(row.get("original_id"))
    title = clean_value(row.get("title"))
    current_price = parse_int(row.get("current_price"))
    if item_id is None or current_price is None or not platform or not pid or not title:
        return None

    canonical_name = clean_value(row.get("canonical_name")) or title
    category_name = clean_value(row.get("category_name")) or canonical_name
    matched_keywords = split_keywords(row.get("matched_keywords")) or [canonical_name]
    normalized_title = normalize_title(title)
    quality_flags = quality_flags_for(title=title, price=current_price)
    item_key = f"{platform}:{pid}"

    return {
        "document_id": str(item_id),
        "item_id": item_id,
        "item_key": item_key,
        "platform": platform,
        "pid": pid,
        "title": title,
        "normalized_title": normalized_title,
        "canonical_name": canonical_name,
        "category_name": category_name,
        "matched_keywords": matched_keywords,
        "search_text": " ".join([title, normalized_title, canonical_name, category_name, *matched_keywords]),
        "current_price": current_price,
        "status": normalize_status(row.get("status")),
        "image_url": clean_value(row.get("thumbnail_url")),
        "item_url": clean_value(row.get("item_url")),
        "crawled_at": normalize_datetime(row.get("crawled_at")),
        "is_accessory_candidate": "accessory_candidate" in quality_flags,
        "quality_flags": quality_flags,
    }


def platform_name(row: dict[str, Any]) -> str:
    return clean_value(row.get("platform_name"))


def normalize_title(value: str) -> str:
    text = value.lower()
    text = re.sub(r"([가-힣])([a-z0-9])", r"\1 \2", text)
    text = re.sub(r"([a-z0-9])([가-힣])", r"\1 \2", text)
    text = text.replace("프로맥스", "프로 맥스")
    text = text.replace("플러스", " 플러스 ")
    text = text.replace("울트라", " 울트라 ")
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    text = re.sub(r"[^0-9a-z가-힣\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def quality_flags_for(*, title: str, price: int) -> list[str]:
    compact_title = normalize_compact(title)
    flags: list[str] = []
    if any(normalize_compact(token) in compact_title for token in ACCESSORY_TOKENS):
        flags.append("accessory_candidate")
    if any(normalize_compact(token) in compact_title for token in NOISE_TOKENS):
        flags.append("noise_candidate")
    if price < MIN_PLAUSIBLE_PRICE or (
        EXCHANGE_TOKEN in compact_title and price < MAX_EXCHANGE_PLACEHOLDER_PRICE
    ):
        flags.append("invalid_price")
    return flags


def normalize_compact(value: str) -> str:
    return re.sub(r"\s+", "", normalize_title(value))


def split_keywords(value: object) -> list[str]:
    keywords: list[str] = []
    seen: set[str] = set()
    for keyword in re.split(r"[,/|;]", clean_value(value)):
        if not keyword or keyword in seen:
            continue
        keywords.append(keyword)
        seen.add(keyword)
    return keywords


def parse_int(value: object) -> int | None:
    if isinstance(value, int):
        return value
    text = clean_value(value).replace(",", "")
    return int(text) if text.isdigit() else None


def normalize_status(value: object) -> str:
    status = clean_value(value)
    if status in {"판매중", "예약중", "판매완료"}:
        return status
    return "판매중"


def normalize_datetime(value: object) -> str:
    text = clean_value(value)
    if not text:
        return "1970-01-01"
    if "T" in text:
        return text
    if re.match(r"^\d{4}[-.]\d{2}[-.]\d{2} \d{2}:\d{2}:\d{2}", text):
        return text[:16]
    return text


def clean_value(value: object) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()
