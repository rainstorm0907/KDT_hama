"""keyword_final.ipynb 전처리/클러스터 규칙을 로컬 파이프라인에서 재사용합니다."""
from __future__ import annotations

import csv
import logging
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import pandas as pd

from lib._paths import PYTHON_DIR

logger = logging.getLogger(__name__)

DEFAULT_DROP_NAME_KEYWORDS = [
    "삽니다",
    "구매합니다",
    "매입",
    "대여",
    "교환",
    "렌탈",
    "급처",
]

DEFAULT_BLACKLIST_KEYWORDS_PATH = PYTHON_DIR / "crawling" / "blacklist_keywords.csv"

LOW_PRICE_MEDIAN_RATIO = 0.2

DROP_REASON_INVALID_PRICE = "유효하지 않은 가격"
DROP_REASON_NAME_BLACKLIST = "상품명 블랙리스트"
DROP_REASON_PRICE_OUTLIER_LOW = "가격 이상치(저가)"
DROP_REASON_PRICE_OUTLIER_HIGH = "가격 이상치(고가)"

ClusterRoute = Literal["canonical", "accessory", "token"]

try:
    from sklearn.cluster import AgglomerativeClustering
    from sklearn.feature_extraction.text import TfidfVectorizer

    _SKLEARN_AVAILABLE = True
except ImportError:  # pragma: no cover
    AgglomerativeClustering = None  # type: ignore[assignment,misc]
    TfidfVectorizer = None  # type: ignore[assignment,misc]
    _SKLEARN_AVAILABLE = False


@dataclass(frozen=True)
class DropDecision:
    should_drop: bool
    reason: str = ""
    detail: str = ""
    stage: str = ""


@dataclass(frozen=True)
class ClusterFields:
    cluster_name_text: str
    tokenized_cluster_name_text: str
    cluster_product_name: str
    cluster_route: ClusterRoute
    raw_tokens: tuple[str, ...] = ()

def normalize_search_text(value):
    text = str(value or "").lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    # 10.5인치 같은 소수는 10 5로 쪼개지지 않게 소수점만 보존합니다.
    text = re.sub(r"[^0-9a-z가-힣\s.]+", " ", text)
    text = re.sub(r"(?<![0-9])\.(?![0-9])", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def compact_search_text(value):
    return re.sub(r"\s+", "", normalize_search_text(value))


def build_drop_name_keywords(keywords):
    drop_keywords = []
    seen = set()

    for keyword in keywords:
        original = str(keyword or "").strip()
        normalized = normalize_search_text(original)
        compact = compact_search_text(original)
        key = (normalized, compact)

        if not normalized or key in seen:
            continue

        seen.add(key)
        drop_keywords.append(
            {
                "original": original,
                "normalized": normalized,
                "compact": compact,
            }
        )

    return drop_keywords




def matched_drop_keywords(name, matchers: Sequence[Mapping[str, str]] | None = None):
    raw_name = str(name or "").lower()
    normalized_name = normalize_search_text(name)
    compact_name = compact_search_text(name)

    matched_keywords = []
    for keyword in (matchers or build_drop_name_keyword_matchers()):
        raw_keyword = keyword["original"].lower()
        normalized_keyword = keyword["normalized"]
        compact_keyword = keyword["compact"]

        if (
            raw_keyword in raw_name
            or normalized_keyword in normalized_name
            or compact_keyword in compact_name
        ):
            matched_keywords.append(keyword["original"])

    return matched_keywords




def annotate_dropped_rows(rows_df, drop_reason, drop_stage, drop_detail=""):
    if rows_df is None or rows_df.empty:
        return pd.DataFrame()

    annotated = rows_df.copy()
    annotated["drop_reason"] = drop_reason
    annotated["drop_stage"] = drop_stage
    annotated["drop_detail"] = drop_detail if str(drop_detail).strip() else drop_reason
    return annotated


def append_pipeline_drops(rows_df, drop_reason, drop_stage, drop_detail=""):
    if rows_df is None or rows_df.empty:
        return pd.DataFrame()

    if isinstance(drop_detail, pd.Series):
        annotated = rows_df.copy()
        annotated["drop_reason"] = drop_reason
        annotated["drop_stage"] = drop_stage
        annotated["drop_detail"] = drop_detail.fillna(drop_reason).astype(str)
        PIPELINE_DROPPED_PARTS.append(annotated)
        return annotated

    annotated = annotate_dropped_rows(rows_df, drop_reason, drop_stage, drop_detail)
    if not annotated.empty:
        PIPELINE_DROPPED_PARTS.append(annotated)
    return annotated


def build_pipeline_dropped_df():
    if not PIPELINE_DROPPED_PARTS:
        return pd.DataFrame()
    return pd.concat(PIPELINE_DROPPED_PARTS, ignore_index=True)


def format_dropped_export_df(dropped_df):
    if dropped_df.empty:
        return dropped_df

    drop_columns = ["drop_reason", "drop_stage", "drop_detail"]
    original_columns = [column for column in dropped_df.columns if column not in drop_columns]
    ordered_columns = [*original_columns, *drop_columns]
    return dropped_df[[column for column in ordered_columns if column in dropped_df.columns]]

# 상품명 매칭에 방해되는 거래/상태/배송 문구입니다.
CLUSTER_TRADE_NOISE_PATTERN = re.compile(
    r"판매합니다|판매해요|판매중|판매완료|판매|"
    r"팝니다|팔아요|팔아봅니다|팔아여|"
    r"구매합니다|구해요|구합니다|삽니다|매입|"
    r"급처합니다|급처|급매|일괄판매|일괄|"
    r"택포|착불|배송|직거래|거래|네고|에눌|"
    r"미개봉|새상품|신품|중고|정품|풀박스|풀박|단품|"
    r"교환|대여|렌탈|"
    r"당일배송|당일발송|새제품|제품"
)

# 단독 '새'는 모델명과 겹칠 수 있어 토큰 단계에서만 제외합니다.
CLUSTER_PROMO_NOISE_PATTERN = re.compile(r"\b새\b")

# 상태/외관/등급 표기는 모델 구분이 아니므로 제거합니다.
CLUSTER_CONDITION_NOISE_PATTERN = re.compile(
    r"무잔상|유잔상|잔상|무기스|기스|스크래치|"
    r"께끗|깨끗|깔끔|클린|깨끗한|깨끗한기기|"
    r"(?:aa|aaa|ss|s|a|b|c|d|e)급|"
    r"리퍼급|새상품급|중고급|민트급|미사용급|"
    r"정상공기기|정상해지|공기기|공기계|자급제|해지"
)

# 색상/지역명은 모델명 매칭에 불필요하므로 제거합니다.
CLUSTER_COLOR_NOISE_PATTERN = re.compile(
    r"블랙|화이트|실버|골드|그레이|그린|레드|블루|"
    r"핑크|퍼플|바이올렛|라벤더|민트|네이비|"
    r"옐로우|크림|베이지|코랄|오렌지|차콜|"
    r"티타늄|티타니움|아이스블루|딥퍼플|스카이블루|"
    r"메탈릭|코퍼|브론즈|로즈골드|스페이스그레이|"
    r"그래파이트|실버쉐도우|엠버|옐로우|바이올렛|"
    r"라이트그린|다크그레이|미드나잇|스타라이트|"
    r"퍼플|블루쉐도우|엠버옐로우|메탈릭코퍼"
)

CLUSTER_REGION_NOISE_PATTERN = re.compile(
    r"부산중고폰|인천중고폰|김해중고폰|양산중고폰|"
    r"서울|부산|대구|인천|광주|대전|울산|세종|"
    r"경기|강원|충북|충남|전북|전남|경북|경남|제주|"
    r"수원|성남|고양|용인|부천|안산|안양|남양주|화성|평택|"
    r"의정부|시흥|파주|김포|광명|하남|군포|김해|창원|진주|"
    r"포항|천안|청주|전주|목포|여수|순천|양산|구미|안동|"
    r"춘천|마산|"
    r"일산|분당|판교|강남|홍대|신촌|건대|잠실"
)

# (), [] 안의 내용은 전부 제거합니다. 예: (6380), [A급], [25777]
CLUSTER_PAREN_BRACKET_CONTENT_PATTERN = re.compile(
    r"\([^)]*\)|\[[^\]]*\]"
)

# 02379, 749 같은 숫자-only 토큰은 클러스터링에 쓰지 않습니다.
CLUSTER_ISOLATED_NUMERIC_TOKEN_PATTERN = re.compile(r"\b\d+\b")

# 21.6.17) 같은 게시일 표기는 제거합니다.
CLUSTER_LISTING_DATE_PATTERN = re.compile(r"\b\d{1,2}\.\d{1,2}\.\d{1,2}\)?\b")

# 게시글 홍보/거래 부가 표현만 제거합니다. 상품 고유명사(북, 폴더, 케이스 등)는 남깁니다.
CLUSTER_GENERIC_NOISE_PATTERN = re.compile(
    r"삼성|휴대폰|스마트폰|파라요|공기기|공기계|도매|할인가능|네고|에눌"
)

# 단독 '폰'만 제거합니다. 중고폰/폴더폰 같은 복합어는 유지합니다.
CLUSTER_STANDALONE_PHONE_NOISE_PATTERN = re.compile(r"\b폰\b")

# 토큰 단계에서도 제외할 잔여 토큰입니다. 무잔상 분해 시 생기는 '무', '잔상' 등을 막습니다.
TOKEN_STAGE_EXCLUDED_TOKENS = frozenset({
    "무", "잔상", "유", "기스", "무기스", "급", "a급", "b급", "s급", "ss급",
    "aa급", "aaa급", "리퍼급", "새상품급", "께끗", "깨끗", "깔끔",
    "새", "제품", "당일배송", "당일발송", "새제품",
    "삼성", "폰", "휴대폰", "스마트폰", "파라요", "공기기", "공기계", "도매", ".",
    "티파이",
})

# 케이스티파이(Casetify) 브랜드는 '케이스+티파이'로 분해하지 않습니다.
CLUSTER_CASETIFY_BRAND_PATTERN = re.compile(r"케이스\s*티파이", re.I)


MODEL_SERIES_BOUNDARY_PATTERN = re.compile(
    r"s\d{1,2}(?:fe|e|플러스|프로|울트라|엣지)?|"
    r"a\d{1,2}|"
    r"z플립\d{1,2}|z폴드\d{1,2}|"
    r"노트\d{1,2}|"
    r"버디\d|"
    r"와이드\d{1,2}|"
    r"워치\d{1,2}|"
    r"아이폰\d{1,2}(?:프로맥스|프로|플러스|맥스|미니|fe)?|"
    r"\d+\.\d+|"  # 10.5인치 등 소수 화면 크기
    r"\d{1,4}(?:gb|tb)"  # 256gb, 512gb, 1tb
)


def remove_cluster_paren_bracket_content(value):
    text = str(value or "")
    text = CLUSTER_PAREN_BRACKET_CONTENT_PATTERN.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def remove_cluster_listing_dates(text):
    text = CLUSTER_LISTING_DATE_PATTERN.sub(" ", text)
    text = re.sub(r"(?:^|\s)\.(?:\s|$)", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def remove_cluster_isolated_numeric_tokens(text):
    text = CLUSTER_ISOLATED_NUMERIC_TOKEN_PATTERN.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


# s 25, a 33처럼 공백으로 떨어진 기종 표기는 숫자 제거 전에 합칩니다.
CLUSTER_MODEL_S_SPACED_PATTERN = re.compile(
    r"\bs\s+(\d{1,2})(?:\s*(fe|플러스|프로|울트라|엣지))?\b"
)
CLUSTER_MODEL_S_EDGE_SPACED_PATTERN = re.compile(r"\bs\s+(\d{1,2})\s+엣지\b")
CLUSTER_MODEL_A_SPACED_PATTERN = re.compile(r"\ba\s+(\d{1,2})\b")
CLUSTER_MODEL_NOTE_SPACED_PATTERN = re.compile(r"노트\s+(\d{1,2})\b")
CLUSTER_MODEL_ZFLIP_SPACED_PATTERN = re.compile(r"z\s*플립\s*(\d{1,2})\b")
CLUSTER_MODEL_ZFOLD_SPACED_PATTERN = re.compile(r"z\s*폴드\s*(\d{1,2})\b")
CLUSTER_MODEL_WIDE_SPACED_PATTERN = re.compile(r"와이드\s+(\d{1,2})\b")
CLUSTER_MODEL_WATCH_SPACED_PATTERN = re.compile(r"워치\s+(\d{1,2})\b")
CLUSTER_MODEL_IPHONE_SPACED_PATTERN = re.compile(r"아이폰\s+(\d{1,2})\b")
CLUSTER_MODEL_IPHONE_VARIANT_ATTACHED_PATTERN = re.compile(
    r"아이폰\s*(\d{1,2})(프로맥스|프로|플러스|맥스|미니|fe)\b",
    re.I,
)
CLUSTER_MODEL_IPHONE_VARIANT_SPACED_PATTERN = re.compile(
    r"아이폰\s*(\d{1,2})\s*(프로맥스|프로|플러스|맥스|미니|fe)\b",
    re.I,
)
CLUSTER_MODEL_BUDDY_SPACED_PATTERN = re.compile(r"버디\s+(\d)\b")


def _merge_s_spaced_match(match):
    suffix = match.group(2) or ""
    return f"s{match.group(1)}{suffix}"


def normalize_casetify_brand(text):
    return CLUSTER_CASETIFY_BRAND_PATTERN.sub("케이스티파이", text)


def _merge_iphone_variant_match(match):
    return f"아이폰{match.group(1)}{match.group(2).lower()}"


def merge_spaced_model_series_tokens(text):
    text = CLUSTER_MODEL_S_EDGE_SPACED_PATTERN.sub(r"s\1엣지", text)
    text = CLUSTER_MODEL_S_SPACED_PATTERN.sub(_merge_s_spaced_match, text)
    text = CLUSTER_MODEL_A_SPACED_PATTERN.sub(r"a\1", text)
    text = CLUSTER_MODEL_NOTE_SPACED_PATTERN.sub(r"노트\1", text)
    text = CLUSTER_MODEL_ZFLIP_SPACED_PATTERN.sub(r"z플립\1", text)
    text = CLUSTER_MODEL_ZFOLD_SPACED_PATTERN.sub(r"z폴드\1", text)
    text = CLUSTER_MODEL_WIDE_SPACED_PATTERN.sub(r"와이드\1", text)
    text = CLUSTER_MODEL_WATCH_SPACED_PATTERN.sub(r"워치\1", text)
    text = CLUSTER_MODEL_IPHONE_VARIANT_ATTACHED_PATTERN.sub(_merge_iphone_variant_match, text)
    text = CLUSTER_MODEL_IPHONE_VARIANT_SPACED_PATTERN.sub(_merge_iphone_variant_match, text)
    text = CLUSTER_MODEL_IPHONE_SPACED_PATTERN.sub(r"아이폰\1", text)
    text = CLUSTER_MODEL_BUDDY_SPACED_PATTERN.sub(r"버디\1", text)
    return re.sub(r"\s+", " ", text).strip()


def insert_model_series_boundaries(text):
    def _split_match(match):
        return f" {match.group()} "

    text = MODEL_SERIES_BOUNDARY_PATTERN.sub(_split_match, text)
    return re.sub(r"\s+", " ", text).strip()


# 용량 표기는 가격 차이가 있어 클러스터 키에 남깁니다. 256기가/128G 등은 256gb 형태로 통일합니다.
CLUSTER_STORAGE_GB_SPACE_PATTERN = re.compile(r"(\d{1,4})\s+gb\b")  # 256 gb -> 256gb
CLUSTER_STORAGE_GIGA_PATTERN = re.compile(r"(\d{1,4})\s*기가\b")
CLUSTER_STORAGE_G_PATTERN = re.compile(r"(\d{2,4})g\b")  # 5g 같은 기종 표기는 제외
CLUSTER_STORAGE_TB_PATTERN = re.compile(r"(\d{1,4})\s*tb\b")


def collapse_storage_gb_space(text):
    return CLUSTER_STORAGE_GB_SPACE_PATTERN.sub(r"\1gb", text)


def normalize_cluster_storage_units(text):
    text = collapse_storage_gb_space(text)
    text = CLUSTER_STORAGE_GIGA_PATTERN.sub(r"\1gb", text)
    text = CLUSTER_STORAGE_G_PATTERN.sub(r"\1gb", text)
    text = CLUSTER_STORAGE_TB_PATTERN.sub(r"\1tb", text)
    return re.sub(r"\s+", " ", text).strip()


def cluster_normalized_name(value):
    text = remove_cluster_paren_bracket_content(value)
    text = normalize_search_text(text)
    text = normalize_casetify_brand(text)
    # 부산중고폰처럼 '중고'가 포함된 지역 표기는 거래 문구 제거보다 먼저 없앱니다.
    text = CLUSTER_REGION_NOISE_PATTERN.sub(" ", text)
    text = CLUSTER_TRADE_NOISE_PATTERN.sub(" ", text)
    text = CLUSTER_CONDITION_NOISE_PATTERN.sub(" ", text)
    text = CLUSTER_COLOR_NOISE_PATTERN.sub(" ", text)
    text = CLUSTER_GENERIC_NOISE_PATTERN.sub(" ", text)
    text = CLUSTER_STANDALONE_PHONE_NOISE_PATTERN.sub(" ", text)
    text = CLUSTER_PROMO_NOISE_PATTERN.sub(" ", text)
    text = remove_cluster_listing_dates(text)
    text = normalize_cluster_storage_units(text)
    text = merge_spaced_model_series_tokens(text)
    text = remove_cluster_isolated_numeric_tokens(text)
    text = insert_model_series_boundaries(text)
    text = collapse_storage_gb_space(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# 토큰 단계 상품명 클러스터링 최종본입니다.
# 1) 기존 cluster_normalized_name() 규칙으로 거래 문구/관리번호를 제거합니다.
# 2) keyword별 토큰 사전을 만들고, 공백 없이 붙어 있는 상품명도 긴 토큰 우선으로 다시 토큰화합니다.
# 3) c1 -> c2 -> c3 순서로 이전 토큰 경로 안에서 반복 클러스터링합니다.
# 4) 기종 토큰이 명확하면 keyword+기종+용량으로 묶고, 그 외는 c1..cN 토큰 클러스터 결과를 사용합니다.
TOKEN_STAGE_DISTANCE_THRESHOLD = 0.25
TOKEN_STAGE_MIN_CLUSTER_ITEMS = 2
TOKEN_STAGE_MIN_UNIQUE_TOKENS_FOR_CLUSTER = 5  # 이 수 미만이면 해당 단계에서 클러스터링하지 않음
TOKEN_STAGE_MAX_COLUMNS = 8
TOKEN_STAGE_TREE_ITEM_LIMIT = 20
TOKEN_STAGE_REVIEW_KEYWORD = None  # 예: "갤럭시", "아이폰". 전체 조회는 None
TOKEN_STAGE_REVIEW_LIMIT = 300
TOKEN_STAGE_MIN_VOCAB_TOKEN_LENGTH = 2
TOKEN_STAGE_MIN_VOCAB_TOKEN_COUNT = 2
TOKEN_STAGE_TOKEN_NGRAM_RANGE = (1, 4)

MODEL_SERIES_TOKEN_PATTERN = re.compile(
    r"^s\d{1,2}(?:fe|e|플러스|프로|울트라|엣지)?$|"
    r"^a\d{1,2}$|"
    r"^z플립\d{1,2}$|"
    r"^z폴드\d{1,2}$|"
    r"^노트\d{1,2}$|"
    r"^버디\d$|"
    r"^와이드\d{1,2}$|"
    r"^워치\d{1,2}$|"
    r"^아이폰\d{1,2}(?:프로맥스|프로|플러스|맥스|미니|fe)?$|"
    r"^\d+\.\d+$"  # 10.5 등
)


def is_pure_numeric_token(token):
    return bool(re.fullmatch(r"\d+", str(token or "").strip()))


def is_storage_unit_token(token):
    return bool(re.fullmatch(r"\d{1,4}(?:gb|tb)", str(token or "").strip()))


def is_excluded_cluster_token(token):
    token = str(token or "").strip()
    return token in TOKEN_STAGE_EXCLUDED_TOKENS or is_pure_numeric_token(token)


def is_preserved_model_series_token(token):
    return bool(MODEL_SERIES_TOKEN_PATTERN.fullmatch(str(token or "").strip()))


def is_model_series_fragment_token(token):
    token = str(token or "").strip()
    if is_preserved_model_series_token(token):
        return False
    return bool(
        re.fullmatch(r"(?:갤럭시)?s\d$", token)
        or re.fullmatch(r"(?:갤럭시)?a\d$", token)
        or token in {"s", "a"}
    )


def segment_preserved_model_tokens(token):
    if not token:
        return []

    parts = []
    cursor = 0
    for match in MODEL_SERIES_BOUNDARY_PATTERN.finditer(token):
        if match.start() > cursor:
            parts.append(token[cursor:match.start()])
        parts.append(match.group())
        cursor = match.end()
    if cursor < len(token):
        parts.append(token[cursor:])
    return [part for part in parts if part]


def split_space_tokens(value):
    return [
        token
        for token in str(value or "").split()
        if token and not is_excluded_cluster_token(token)
    ]


def build_keyword_token_vocabulary(names):
    token_counts = {}
    for name in names:
        for token in split_space_tokens(name):
            if len(token) < TOKEN_STAGE_MIN_VOCAB_TOKEN_LENGTH:
                continue
            if (
                is_excluded_cluster_token(token)
                or is_model_series_fragment_token(token)
                or is_pure_numeric_token(token)
            ):
                continue
            token_counts[token] = token_counts.get(token, 0) + 1

    vocabulary = [
        token
        for token, count in token_counts.items()
        if count >= TOKEN_STAGE_MIN_VOCAB_TOKEN_COUNT
        and not is_excluded_cluster_token(token)
        and not is_model_series_fragment_token(token)
        and not is_pure_numeric_token(token)
    ]
    return sorted(vocabulary, key=lambda token: (-len(token), -token_counts[token], token))


def merge_iphone_model_fragments(tokens):
    merged = []
    idx = 0
    while idx < len(tokens):
        token = str(tokens[idx]).strip()
        if token == "아이폰" and idx + 1 < len(tokens):
            next_token = normalize_model_series_token(tokens[idx + 1])
            if IPHONE_VARIANT_TOKEN_PATTERN.fullmatch(next_token):
                merged.append(f"아이폰{next_token}")
                idx += 2
                continue
            if re.fullmatch(r"\d{1,2}", str(tokens[idx + 1]).strip()) and idx + 2 < len(tokens):
                variant = str(tokens[idx + 2]).strip()
                if variant in MODEL_VARIANT_TOKENS:
                    merged.append(f"아이폰{tokens[idx + 1]}{variant}")
                    idx += 3
                    continue
        merged.append(tokens[idx])
        idx += 1
    return merged


def split_attached_token(token, token_vocabulary):
    if not token:
        return []
    if is_pure_numeric_token(token):
        return []
    if PRESERVED_BRAND_COMPOUND_PATTERN.fullmatch(str(token).strip()):
        return [token]
    if IPHONE_VARIANT_TOKEN_PATTERN.fullmatch(str(token).strip()):
        return [token]
    if is_preserved_model_series_token(token) or is_storage_unit_token(token):
        return [token]

    matches = []
    occupied = [False] * len(token)
    for vocab_token in token_vocabulary:
        if vocab_token == token or len(vocab_token) >= len(token):
            continue
        # 100 -> 10 + 0 같은 분해를 막기 위해 숫자-only 사전 토큰은 분해에 쓰지 않습니다.
        if is_pure_numeric_token(vocab_token):
            continue

        start_idx = 0
        while True:
            found_idx = token.find(vocab_token, start_idx)
            if found_idx == -1:
                break

            end_idx = found_idx + len(vocab_token)
            if not any(occupied[found_idx:end_idx]):
                matches.append((found_idx, end_idx, vocab_token))
                for idx in range(found_idx, end_idx):
                    occupied[idx] = True
            start_idx = found_idx + 1

    if not matches:
        return [token]

    tokens = []
    cursor = 0
    for start_idx, end_idx, vocab_token in sorted(matches, key=lambda item: item[0]):
        if cursor < start_idx:
            tokens.append(token[cursor:start_idx])
        tokens.append(vocab_token)
        cursor = end_idx
    if cursor < len(token):
        tokens.append(token[cursor:])

    return [item for item in tokens if item]


def tokenize_cluster_name(value, token_vocabulary):
    tokens = []
    for token in split_space_tokens(value):
        for segment in segment_preserved_model_tokens(token):
            if is_pure_numeric_token(segment):
                continue
            if is_preserved_model_series_token(segment) or is_storage_unit_token(segment):
                tokens.append(segment)
            else:
                tokens.extend(split_attached_token(segment, token_vocabulary))
    filtered_tokens = [
        token
        for token in tokens
        if token and not is_excluded_cluster_token(token) and not is_model_series_fragment_token(token)
    ]
    return merge_iphone_model_fragments(filtered_tokens)


def normalize_model_series_token(token):
    return re.sub(r"\s+", "", str(token or "").strip())


def extract_model_storage_tokens(tokens):
    model_candidates = []
    for token in tokens:
        normalized_token = normalize_model_series_token(token)
        if is_preserved_model_series_token(normalized_token):
            model_candidates.append(normalized_token)

    model_token = max(model_candidates, key=len) if model_candidates else None
    storage_token = next((token for token in tokens if is_storage_unit_token(token)), None)
    return model_token, storage_token


def should_use_canonical_cluster_name(tokens):
    model_token, _ = extract_model_storage_tokens(tokens)
    if not model_token:
        return False

    normalized_tokens = [normalize_model_series_token(token) for token in tokens]
    return model_token in normalized_tokens


MODEL_VARIANT_TOKENS = frozenset({
    "프로", "플러스", "맥스", "미니", "fe", "엣지", "울트라", "프로맥스",
})

# 케이스/필름 등 액세서리는 본체와 별도 상품으로 분리합니다. 앞에 있을수록 우선합니다.
ACCESSORY_PRIORITY_TOKENS = ("케이스", "필름")
ACCESSORY_BRAND_NOISE_TOKENS = frozenset({"티파이", "케이스티파이", "casetify"})
PRESERVED_BRAND_COMPOUND_PATTERN = re.compile(r"^케이스티파이$", re.I)
IPHONE_VARIANT_TOKEN_PATTERN = re.compile(
    r"^\d{1,2}(?:프로맥스|프로|플러스|맥스|미니|fe)$",
    re.I,
)

IPHONE_MODEL_REMAINDER_PATTERN = re.compile(
    r"^(\d{1,2})((?:프로맥스|프로|플러스|맥스|미니|fe|엣지|울트라)?)$"
)


def split_model_suffix_label(suffix):
    if not suffix:
        return []
    if suffix == "프로맥스":
        return ["프로", "맥스"]
    return [suffix]


def format_canonical_model_label(keyword, model_token):
    keyword_text = str(keyword or "").strip()
    model_text = normalize_model_series_token(model_token)

    if not model_text:
        return keyword_text

    # 아이폰16프로처럼 model에 keyword가 이미 있으면 '아이폰 16 프로' 형태로 분리합니다.
    if keyword_text and model_text.startswith(keyword_text):
        remainder = model_text[len(keyword_text):]
        match = IPHONE_MODEL_REMAINDER_PATTERN.match(remainder)
        if match:
            number, suffix = match.groups()
            parts = [keyword_text, number, *split_model_suffix_label(suffix)]
            return " ".join(part for part in parts if part).strip()
        return f"{keyword_text} {remainder}".strip() if remainder else keyword_text

    if keyword_text:
        return f"{keyword_text} {model_text}".strip()
    return model_text


def extract_model_variant_tokens(tokens, model_token, base_label):
    normalized_model = normalize_model_series_token(model_token or "")
    base_label_text = str(base_label or "").strip()
    variants = []

    for token in tokens:
        token_text = str(token or "").strip()
        compact_token = normalize_model_series_token(token_text)
        if compact_token == normalized_model or token_text in base_label_text:
            continue
        if token_text not in MODEL_VARIANT_TOKENS and compact_token not in MODEL_VARIANT_TOKENS:
            continue
        label_token = token_text if token_text in MODEL_VARIANT_TOKENS else compact_token
        if label_token == "프로맥스":
            for part in split_model_suffix_label(label_token):
                if part not in variants and part not in base_label_text:
                    variants.append(part)
            continue
        if label_token not in variants and label_token not in base_label_text:
            variants.append(label_token)

    return variants


def detect_accessory_tokens(tokens, normalized_text=""):
    text = str(normalized_text or "").strip()
    token_set = {str(token or "").strip() for token in tokens}
    detected = []

    for accessory_token in ACCESSORY_PRIORITY_TOKENS:
        if accessory_token in text or accessory_token in token_set:
            detected.append(accessory_token)

    return detected


def is_accessory_product(tokens, normalized_text=""):
    return bool(detect_accessory_tokens(tokens, normalized_text))


def build_accessory_cluster_product_name(keyword, tokens, normalized_text=""):
    keyword_text = str(keyword or "").strip()
    tokens = merge_iphone_model_fragments(list(tokens))
    accessory_tokens = detect_accessory_tokens(tokens, normalized_text)
    accessory_label = " ".join(accessory_tokens)
    model_token, _ = extract_model_storage_tokens(tokens)

    if model_token:
        base_label = format_canonical_model_label(keyword_text, model_token)
        variant_tokens = extract_model_variant_tokens(tokens, model_token, base_label)
        if variant_tokens:
            base_label = f"{base_label} {' '.join(variant_tokens)}".strip()
        return f"{base_label} {accessory_label}".strip()

    cleaned_tokens = [
        token
        for token in tokens
        if token
        and token != keyword_text
        and token not in accessory_tokens
        and token not in ACCESSORY_BRAND_NOISE_TOKENS
        and not is_excluded_cluster_token(token)
    ]
    if cleaned_tokens:
        return f"{keyword_text} {' '.join(cleaned_tokens[:2])} {accessory_label}".strip()
    return f"{keyword_text} {accessory_label}".strip()


def build_canonical_cluster_product_name(keyword, tokens):
    keyword_text = str(keyword or "").strip()
    model_token, storage_token = extract_model_storage_tokens(tokens)
    parts = []

    if model_token:
        base_label = format_canonical_model_label(keyword_text, model_token)
        variant_tokens = extract_model_variant_tokens(tokens, model_token, base_label)
        if variant_tokens:
            parts.append(f"{base_label} {' '.join(variant_tokens)}".strip())
        else:
            parts.append(base_label)
    elif keyword_text:
        parts.append(keyword_text)

    if storage_token:
        parts.append(storage_token)

    return " ".join(parts)


def choose_representative_token(tokens):
    token_counts = pd.Series(list(tokens)).value_counts()
    if token_counts.empty:
        return ""

    max_count = token_counts.iloc[0]
    candidates = token_counts[token_counts == max_count].index.tolist()
    return sorted(candidates, key=lambda token: (-len(token), token))[0]


def build_token_cluster_labels(tokens):
    tokens = pd.Series(tokens).fillna("").astype(str)
    labels = pd.Series("", index=tokens.index, dtype="object")
    non_empty_tokens = tokens[tokens != ""]
    unique_tokens = non_empty_tokens.drop_duplicates().tolist()

    if not unique_tokens:
        return labels

    protected_mask = non_empty_tokens.apply(
        lambda token: is_preserved_model_series_token(token) or is_storage_unit_token(token)
    )
    labels.loc[non_empty_tokens.index[protected_mask]] = non_empty_tokens[protected_mask]
    remaining_tokens = non_empty_tokens[~protected_mask]
    if remaining_tokens.empty:
        return labels

    unique_tokens = remaining_tokens.drop_duplicates().tolist()

    # 토큰 종류가 적으면 억지로 묶지 않고 원본 토큰을 그대로 둡니다.
    if len(unique_tokens) < TOKEN_STAGE_MIN_UNIQUE_TOKENS_FOR_CLUSTER:
        labels.loc[remaining_tokens.index] = remaining_tokens
        return labels
    if len(remaining_tokens) < TOKEN_STAGE_MIN_CLUSTER_ITEMS:
        labels.loc[remaining_tokens.index] = remaining_tokens
        return labels

    if not _SKLEARN_AVAILABLE:
        labels.loc[remaining_tokens.index] = remaining_tokens
        return labels

    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=TOKEN_STAGE_TOKEN_NGRAM_RANGE,
        min_df=1,
    )
    token_vectors = vectorizer.fit_transform(unique_tokens)

    try:
        model = AgglomerativeClustering(
            n_clusters=None,
            metric="cosine",
            linkage="average",
            distance_threshold=TOKEN_STAGE_DISTANCE_THRESHOLD,
        )
    except TypeError:
        model = AgglomerativeClustering(
            n_clusters=None,
            affinity="cosine",
            linkage="average",
            distance_threshold=TOKEN_STAGE_DISTANCE_THRESHOLD,
        )

    token_cluster_df = pd.DataFrame(
        {
            "token": unique_tokens,
            "token_cluster_id": model.fit_predict(token_vectors.toarray()),
        }
    )
    token_frequency = remaining_tokens.value_counts().to_dict()

    token_label_map = {}
    for _, cluster_df in token_cluster_df.groupby("token_cluster_id", sort=True):
        representative_token = choose_representative_token(
            token
            for token in cluster_df["token"]
            for _ in range(token_frequency.get(token, 0))
        )
        for token in cluster_df["token"]:
            token_label_map[token] = representative_token

    labels.loc[remaining_tokens.index] = remaining_tokens.map(token_label_map)
    return labels


def join_cluster_product_name(row, token_columns):
    tokens = [str(row[column]).strip() for column in token_columns if str(row[column]).strip()]
    return " ".join(tokens)


def build_cluster_product_name(row, token_columns):
    raw_tokens = row["_raw_tokens"]
    normalized_text = str(row.get("cluster_name_text", "") or "").strip()

    # 케이스/필름 등 액세서리는 본체 canonical보다 우선해 별도 클러스터로 분리합니다.
    if is_accessory_product(raw_tokens, normalized_text):
        return build_accessory_cluster_product_name(
            row["keyword"],
            raw_tokens,
            normalized_text,
        )

    if should_use_canonical_cluster_name(raw_tokens):
        return build_canonical_cluster_product_name(row["keyword"], raw_tokens)
    return join_cluster_product_name(row, token_columns)


def add_token_stage_columns(keyword_df):
    keyword_df = keyword_df.copy().reset_index(drop=True)
    keyword_df["cluster_name_text"] = keyword_df["name"].apply(cluster_normalized_name)
    keyword_df.loc[keyword_df["cluster_name_text"] == "", "cluster_name_text"] = keyword_df[
        "name"
    ].astype(str)

    token_vocabulary = build_keyword_token_vocabulary(keyword_df["cluster_name_text"])
    keyword_df["_raw_tokens"] = keyword_df["cluster_name_text"].apply(
        lambda value: tokenize_cluster_name(value, token_vocabulary)
    )
    keyword_df["_name_tokens"] = keyword_df["_raw_tokens"]
    keyword_df["tokenized_cluster_name_text"] = keyword_df["_raw_tokens"].apply(" ".join)

    token_columns = []
    max_token_count = int(keyword_df["_name_tokens"].apply(len).max()) if len(keyword_df) else 0
    for token_position in range(min(max_token_count, TOKEN_STAGE_MAX_COLUMNS)):
        token_column = f"c{token_position + 1}"
        token_columns.append(token_column)
        keyword_df[token_column] = ""

        group_columns = token_columns[:-1] or ["keyword"]
        for _, stage_df in keyword_df.groupby(group_columns, sort=True, dropna=False):
            stage_tokens = stage_df["_name_tokens"].apply(
                lambda tokens: tokens[token_position] if token_position < len(tokens) else ""
            )
            keyword_df.loc[stage_df.index, token_column] = build_token_cluster_labels(stage_tokens).values

    keyword_df["cluster_product_name"] = keyword_df.apply(
        build_cluster_product_name,
        axis=1,
        token_columns=token_columns,
    )
    keyword_df["cluster_route"] = keyword_df.apply(
        lambda row: (
            "accessory"
            if is_accessory_product(row["_raw_tokens"], row["cluster_name_text"])
            else "canonical"
            if should_use_canonical_cluster_name(row["_raw_tokens"])
            else "token"
        ),
        axis=1,
    )
    return keyword_df.drop(columns=["_name_tokens", "_raw_tokens"]), token_columns


def summarize_token_stage_clusters(item_df, token_columns):
    if item_df.empty:
        return pd.DataFrame()

    summary_rows = []
    group_columns = ["keyword", *token_columns, "cluster_product_name"]
    for group_key, cluster_df in item_df.groupby(group_columns, sort=True, dropna=False):
        group_values = dict(zip(group_columns, group_key if isinstance(group_key, tuple) else (group_key,)))
        price_median = cluster_df["price_numeric"].median()
        summary_rows.append(
            {
                **group_values,
                "item_count": len(cluster_df),
                "min_price": int(cluster_df["price_numeric"].min()),
                "median_price": float(price_median),
                "average_price": float(cluster_df["price_numeric"].mean()),
                "max_price": int(cluster_df["price_numeric"].max()),
                "sample_tokenized_names": " | ".join(
                    dict.fromkeys(cluster_df["tokenized_cluster_name_text"].astype(str).head(5))
                ),
                "sample_normalized_names": " | ".join(
                    dict.fromkeys(cluster_df["cluster_name_text"].astype(str).head(5))
                ),
                "sample_original_names": " | ".join(
                    dict.fromkeys(cluster_df["name"].astype(str).head(5))
                ),
            }
        )

    summary_df = pd.DataFrame(summary_rows).sort_values(
        ["keyword", "item_count", "median_price"], ascending=[True, False, True]
    )

    front_columns = ["keyword", *token_columns, "cluster_product_name"]
    return summary_df[front_columns + [column for column in summary_df.columns if column not in front_columns]]


def build_token_stage_cluster_tree(item_df, summary_df, token_columns):
    tree_rows = []
    if item_df.empty or summary_df.empty:
        return tree_rows

    for keyword, keyword_summary_df in summary_df.groupby("keyword", sort=True):
        keyword_item_df = item_df[item_df["keyword"] == keyword]
        clusters = []
        for _, summary_row in keyword_summary_df.iterrows():
            mask = keyword_item_df["cluster_product_name"] == summary_row["cluster_product_name"]
            for token_column in token_columns:
                mask &= keyword_item_df[token_column] == summary_row[token_column]
            cluster_item_df = keyword_item_df[mask]
            clusters.append(
                {
                    "cluster_product_name": summary_row["cluster_product_name"],
                    "token_path": {column: summary_row[column] for column in token_columns if summary_row[column]},
                    "item_count": int(summary_row["item_count"]),
                    "price_summary": {
                        "min": int(summary_row["min_price"]),
                        "median": float(summary_row["median_price"]),
                        "average": float(summary_row["average_price"]),
                        "max": int(summary_row["max_price"]),
                    },
                    "items": cluster_item_df[
                        ["platform", "pid", "name", "price_numeric", "status", "link"]
                    ].head(TOKEN_STAGE_TREE_ITEM_LIMIT).to_dict("records"),
                }
            )

        tree_rows.append(
            {
                "keyword": keyword,
                "item_count": len(keyword_item_df),
                "cluster_count": len(keyword_summary_df),
                "clusters": sorted(clusters, key=lambda item: item["item_count"], reverse=True),
            }
        )

    return tree_rows


def build_keyword_token_stage_clusters(source_df):
    item_frames = []
    token_column_count = 0

    for _, keyword_df in source_df.groupby("keyword", sort=True):
        keyword_item_df, keyword_token_columns = add_token_stage_columns(keyword_df)
        item_frames.append(keyword_item_df)
        token_column_count = max(token_column_count, len(keyword_token_columns))

    item_df = pd.concat(item_frames, ignore_index=True) if item_frames else pd.DataFrame()
    token_columns = [f"c{idx}" for idx in range(1, token_column_count + 1)]
    for token_column in token_columns:
        if token_column not in item_df.columns:
            item_df[token_column] = ""
    item_df[token_columns] = item_df[token_columns].fillna("")

    summary_df = summarize_token_stage_clusters(item_df, token_columns)
    tree_rows = build_token_stage_cluster_tree(item_df, summary_df, token_columns)
    return item_df, summary_df, tree_rows



def load_drop_name_keywords(path: Path | None = None) -> list[str]:
    csv_path = path or DEFAULT_BLACKLIST_KEYWORDS_PATH
    keywords: list[str] = []
    if csv_path.exists():
        with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
            for row in csv.DictReader(csv_file):
                keyword = str(row.get("keyword") or "").strip()
                if keyword and keyword.lower() != "keyword":
                    keywords.append(keyword)
    return keywords or list(DEFAULT_DROP_NAME_KEYWORDS)


def build_drop_name_keyword_matchers(keywords: Sequence[str] | None = None):
    return build_drop_name_keywords(keywords or load_drop_name_keywords())


def _quantile(values: Sequence[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(float(value) for value in values)
    if len(ordered) == 1:
        return ordered[0]
    position = (len(ordered) - 1) * q
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def compute_keyword_price_bounds(
    prices: Sequence[float],
    *,
    low_median_ratio: float = LOW_PRICE_MEDIAN_RATIO,
) -> dict[str, float] | None:
    valid_prices = [float(price) for price in prices if price and float(price) > 0]
    if len(valid_prices) < 2:
        return None

    q1 = _quantile(valid_prices, 0.25)
    median_price = _quantile(valid_prices, 0.5)
    q3 = _quantile(valid_prices, 0.75)
    iqr = q3 - q1
    iqr_lower_bound = max(0.0, q1 - 1.5 * iqr)
    median_ratio_lower_bound = median_price * low_median_ratio
    lower_bound = max(iqr_lower_bound, median_ratio_lower_bound)
    upper_bound = q3 + 1.5 * iqr
    return {
        "q1": q1,
        "median_price": median_price,
        "q3": q3,
        "iqr": iqr,
        "lower_bound": lower_bound,
        "upper_bound": upper_bound,
    }


def classify_price_outlier(price: float, bounds: Mapping[str, float] | None) -> str:
    if bounds is None:
        return ""
    if price < bounds["lower_bound"]:
        return "low"
    if price > bounds["upper_bound"]:
        return "high"
    return ""


def evaluate_item_filters(
    *,
    name: str,
    price: int | float | None,
    drop_matchers: Sequence[Mapping[str, str]] | None = None,
    keyword_price_bounds: Mapping[str, float] | None = None,
) -> DropDecision:
    if price is None or float(price) <= 0:
        return DropDecision(True, DROP_REASON_INVALID_PRICE, str(price or ""), "required_fields")

    matched = matched_drop_keywords(name, drop_matchers)
    if matched:
        return DropDecision(
            True,
            DROP_REASON_NAME_BLACKLIST,
            " | ".join(matched),
            "name_blacklist",
        )

    outlier_type = classify_price_outlier(float(price), keyword_price_bounds)
    if outlier_type == "low":
        bounds = keyword_price_bounds or {}
        detail = (
            f"price={int(float(price))}, "
            f"lower_bound={float(bounds.get('lower_bound', 0)):.0f}, "
            f"median={float(bounds.get('median_price', 0)):.0f}"
        )
        return DropDecision(True, DROP_REASON_PRICE_OUTLIER_LOW, detail, "price_outlier")
    if outlier_type == "high":
        bounds = keyword_price_bounds or {}
        detail = (
            f"price={int(float(price))}, "
            f"upper_bound={float(bounds.get('upper_bound', 0)):.0f}, "
            f"median={float(bounds.get('median_price', 0)):.0f}"
        )
        return DropDecision(True, DROP_REASON_PRICE_OUTLIER_HIGH, detail, "price_outlier")

    return DropDecision(False)


def resolve_cluster_route(raw_tokens: Sequence[str], cluster_name_text: str) -> ClusterRoute:
    if is_accessory_product(raw_tokens, cluster_name_text):
        return "accessory"
    if should_use_canonical_cluster_name(raw_tokens):
        return "canonical"
    return "token"


def build_single_cluster_fields(keyword: str, name: str) -> ClusterFields:
    cluster_name_text = cluster_normalized_name(name)
    if not cluster_name_text:
        cluster_name_text = str(name or "").strip()

    vocabulary = build_keyword_token_vocabulary([cluster_name_text])
    raw_tokens = tuple(tokenize_cluster_name(cluster_name_text, vocabulary))
    tokenized_cluster_name_text = " ".join(raw_tokens)
    row = {
        "keyword": keyword,
        "cluster_name_text": cluster_name_text,
        "_raw_tokens": list(raw_tokens),
    }
    cluster_product_name = build_cluster_product_name(row, [])
    cluster_route = resolve_cluster_route(raw_tokens, cluster_name_text)
    return ClusterFields(
        cluster_name_text=cluster_name_text,
        tokenized_cluster_name_text=tokenized_cluster_name_text,
        cluster_product_name=cluster_product_name,
        cluster_route=cluster_route,
        raw_tokens=raw_tokens,
    )


def apply_token_stage_clustering(records: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        return []

    source_df = pd.DataFrame([dict(record) for record in records])
    if source_df.empty:
        return []

    item_frames: list[pd.DataFrame] = []
    token_column_count = 0
    for _, keyword_df in source_df.groupby("keyword", sort=True):
        keyword_item_df, keyword_token_columns = add_token_stage_columns(keyword_df)
        item_frames.append(keyword_item_df)
        token_column_count = max(token_column_count, len(keyword_token_columns))

    item_df = pd.concat(item_frames, ignore_index=True) if item_frames else pd.DataFrame()
    token_columns = [f"c{idx}" for idx in range(1, token_column_count + 1)]
    for token_column in token_columns:
        if token_column not in item_df.columns:
            item_df[token_column] = ""
    if token_columns:
        item_df[token_columns] = item_df[token_columns].fillna("")

    return item_df.to_dict("records")
