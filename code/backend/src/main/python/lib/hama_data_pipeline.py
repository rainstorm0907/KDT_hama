from __future__ import annotations

import logging
import re
import csv
from collections import Counter
from collections.abc import Callable, Mapping, Sequence
from pathlib import Path
from statistics import median
from typing import Any, Literal

import ahocorasick  # type: ignore[import-not-found]
from pydantic import BaseModel, Field

from lib._paths import PYTHON_DIR
from lib.keyword_preprocessing import (
    DEFAULT_BLACKLIST_KEYWORDS_PATH,
    DropDecision,
    apply_token_stage_clustering,
    build_drop_name_keyword_matchers,
    build_single_cluster_fields,
    compact_search_text,
    compute_keyword_price_bounds,
    evaluate_item_filters,
    load_drop_name_keywords,
    normalize_search_text,
)
from lib.product_matching import (
    CategoryCorrelationResult,
    ProductMatchCandidate,
    ProductMatchIndex,
    TitleTokenProfile,
    split_keyword_values,
)


logger = logging.getLogger(__name__)

ProductStatus = Literal["판매중", "예약중", "판매완료"]
DEFAULT_CONFIG_DIR = PYTHON_DIR / "config"
DEFAULT_PRODUCT_TOKEN_DICTIONARY_PATH = DEFAULT_CONFIG_DIR / "product_token_dictionary.csv"
DEFAULT_CATEGORY_RULES_PATH = DEFAULT_CONFIG_DIR / "category_rules.csv"
DEFAULT_TOKEN_EXCLUDE_LIST_PATH = DEFAULT_CONFIG_DIR / "token_exclude_list.csv"


class PriceHistoryPoint(BaseModel):
    label: str
    price: int


class RawItem(BaseModel):
    platform: str
    pid: str
    title: str
    price: int | None = None
    url: str = ""
    date: str = ""
    status: str = "판매중"
    image_url: str | None = None
    description: str = ""
    source_keyword: str = ""
    raw: dict[str, Any] = Field(default_factory=dict)


class ProcessedItem(BaseModel):
    platform: str
    pid: str
    name: str
    price: int
    status: ProductStatus
    imageUrl: str | None = None
    images: list[str] = Field(default_factory=list)
    link: str = ""
    date: str = ""
    description: str = ""
    category: str = ""
    priceHistory: list[PriceHistoryPoint | dict[str, int | str]] = Field(default_factory=list)

    raw_title: str = ""
    normalized_title: str = ""
    source_keyword: str = ""
    category_confidence: float = 0.0
    matched_keywords: dict[str, str] = Field(default_factory=dict)
    classification_method: str = "unclassified"
    graphKeywords: list[str] = Field(default_factory=list)
    cluster_name_text: str = ""
    tokenized_cluster_name_text: str = ""
    cluster_product_name: str = ""
    cluster_route: str = ""


HamaProduct = ProcessedItem


CategoryModelClassifier = Callable[[str], tuple[str, float]]


class HamaDataPipeline:
    """중고 거래 원천 데이터를 Hama 표준 상품 모델로 변환하는 파이프라인입니다."""

    def __init__(
        self,
        *,
        keyword_catalog: Sequence[str] | None = None,
        match_index: ProductMatchIndex | None = None,
        model_classifier: CategoryModelClassifier | None = None,
        product_token_dictionary_path: str | Path | None = None,
        category_rules_path: str | Path | None = None,
        blacklist_keywords_path: str | Path | None = None,
        keyword_price_bounds: Mapping[str, float] | None = None,
    ) -> None:
        self.match_index = match_index or self._build_keyword_index(keyword_catalog or [])
        self.model_classifier = model_classifier
        self.product_token_dictionary_path = Path(
            product_token_dictionary_path or DEFAULT_PRODUCT_TOKEN_DICTIONARY_PATH
        )
        self.category_rules = self._load_category_rules(Path(category_rules_path or DEFAULT_CATEGORY_RULES_PATH))
        self.product_name_automaton = self._build_product_name_automaton(self.product_token_dictionary_path)
        self.drop_name_matchers = build_drop_name_keyword_matchers(
            load_drop_name_keywords(Path(blacklist_keywords_path or DEFAULT_BLACKLIST_KEYWORDS_PATH))
        )
        self.keyword_price_bounds = dict(keyword_price_bounds or {})

    def evaluate_preprocessing_filters(self, raw_item: Mapping[str, Any]) -> DropDecision:
        name = self._clean_text(raw_item.get("name") or raw_item.get("raw_title"))
        price = raw_item.get("price")
        return evaluate_item_filters(
            name=name,
            price=price,
            drop_matchers=self.drop_name_matchers,
            keyword_price_bounds=self.keyword_price_bounds or None,
        )

    def run_pipeline(
        self,
        raw_item: Mapping[str, Any],
        *,
        drop_on_filter: bool = False,
    ) -> HamaProduct | None:
        if drop_on_filter:
            drop_decision = self.evaluate_preprocessing_filters(raw_item)
            if drop_decision.should_drop:
                logger.info(
                    "[HamaDataPipeline] drop pid=%s stage=%s reason=%s detail=%s",
                    raw_item.get("pid"),
                    drop_decision.stage,
                    drop_decision.reason,
                    drop_decision.detail,
                )
                return None
        raw_title = self._clean_text(raw_item.get("raw_title") or raw_item.get("name"))
        source_keyword = self._clean_text(raw_item.get("source_keyword") or raw_item.get("keyword"))
        platform = self._clean_text(raw_item.get("platform"))

        logger.info("[HamaDataPipeline] start platform=%s pid=%s", platform, raw_item.get("pid"))
        normalized_title = self._normalize_title(raw_title)
        token_profile = TitleTokenProfile.from_title(normalized_title)
        match_candidates = self._match_keywords_trie(token_profile, platform=platform)
        correlation = self._classify_category_by_correlation(match_candidates, source_keyword)

        category = correlation.category
        confidence = correlation.confidence
        method = correlation.method
        evidence_candidates = list(correlation.evidence)
        if category == "미분류":
            category, confidence = self._classify_category_model(normalized_title)
            method = "model_stub"

        matched_keywords = self._collect_matched_keywords(
            source_keyword=source_keyword,
            candidates=evidence_candidates,
        )
        product_name_match = self._match_product_name(normalized_title)
        category, confidence, method = self._assign_category_from_product_name(
            matched_keywords=product_name_match,
            source_keyword=source_keyword,
            fallback_category=category,
            fallback_confidence=confidence,
            fallback_method=method,
        )
        graph_keywords = self._generate_graph_keywords(
            category=category,
            matched_keywords=[*matched_keywords, *product_name_match.values()],
            candidates=evidence_candidates,
            source_keyword=source_keyword,
            normalized_title=normalized_title,
        )
        item_name = self._clean_text(raw_item.get("name"))
        cluster_fields = build_single_cluster_fields(source_keyword or item_name, item_name)

        logger.info(
            "[HamaDataPipeline] done pid=%s category=%s confidence=%.2f method=%s matched=%s",
            raw_item.get("pid"),
            category,
            confidence,
            method,
            matched_keywords,
        )

        return HamaProduct(
            platform=self._clean_text(raw_item.get("platform")),
            pid=self._clean_text(raw_item.get("pid")),
            name=self._clean_text(raw_item.get("name")),
            price=int(raw_item.get("price") or 0),
            status=raw_item.get("status") or "판매완료",
            imageUrl=raw_item.get("imageUrl"),
            images=list(raw_item.get("images") or []),
            link=self._clean_text(raw_item.get("link")),
            date=self._clean_text(raw_item.get("date")),
            description=self._clean_text(raw_item.get("description")),
            category=category,
            priceHistory=list(raw_item.get("priceHistory") or []),
            raw_title=raw_title,
            normalized_title=normalized_title,
            source_keyword=source_keyword,
            category_confidence=confidence,
            matched_keywords=product_name_match,
            classification_method=method,
            graphKeywords=graph_keywords,
            cluster_name_text=cluster_fields.cluster_name_text,
            tokenized_cluster_name_text=cluster_fields.tokenized_cluster_name_text,
            cluster_product_name=cluster_fields.cluster_product_name,
            cluster_route=cluster_fields.cluster_route,
        )

    def _normalize_title(self, raw_title: str) -> str:
        return normalize_search_text(raw_title)

    def _match_keywords_trie(
        self,
        token_profile: TitleTokenProfile,
        *,
        platform: str,
    ) -> list[ProductMatchCandidate]:
        # token_to_entry_ids 인덱스로 후보를 좁혀 트리/토큰 기반 매칭 결과를 가져옵니다.
        return self.match_index.match(token_profile, platform=platform)

    def _classify_category_by_correlation(
        self,
        candidates: Sequence[ProductMatchCandidate],
        source_keyword: str,
    ) -> CategoryCorrelationResult:
        return self.match_index.correlate_category(candidates, source_keyword=source_keyword)

    def _classify_category_model(self, normalized_title: str) -> tuple[str, float]:
        if self.model_classifier is not None:
            return self.model_classifier(normalized_title)

        logger.info("[HamaDataPipeline] model classifier is not connected. title=%s", normalized_title)
        return "미분류", 0.0

    def _match_product_name(self, product_name: str) -> dict[str, str]:
        compact_title = self._compact_match_text(product_name)
        if not compact_title:
            return {}

        best_matches: dict[str, tuple[int, int, str]] = {}
        for end_index, (field_name, canonical_value, token_length) in self.product_name_automaton.iter(compact_title):
            start_index = end_index - token_length + 1
            current = best_matches.get(field_name)
            if current is None or token_length > current[0] or (
                token_length == current[0] and start_index < current[1]
            ):
                best_matches[field_name] = (token_length, start_index, canonical_value)

        ordered_fields = ("brand", "model", "detail", "spec", "option")
        return {
            field_name: best_matches[field_name][2]
            for field_name in ordered_fields
            if field_name in best_matches
        }

    @classmethod
    def _build_product_name_automaton(cls, dictionary_path: Path) -> ahocorasick.Automaton:
        automaton = ahocorasick.Automaton()
        for row in cls._read_enabled_csv_rows(dictionary_path):
            field_name = cls._clean_text(row.get("field_name"))
            canonical_value = cls._clean_text(row.get("canonical_value"))
            if not field_name or not canonical_value:
                continue

            aliases = cls._split_csv_list(row.get("aliases"))
            for alias in cls._unique_values([canonical_value, *aliases]):
                normalized_alias = cls._compact_match_text(alias)
                if normalized_alias:
                    automaton.add_word(
                        normalized_alias,
                        (field_name, canonical_value, len(normalized_alias)),
                    )
        automaton.make_automaton()
        return automaton

    @staticmethod
    def _compact_match_text(value: Any) -> str:
        return compact_search_text(value)

    def _assign_category_from_product_name(
        self,
        *,
        matched_keywords: Mapping[str, str],
        source_keyword: str,
        fallback_category: str,
        fallback_confidence: float,
        fallback_method: str,
    ) -> tuple[str, float, str]:
        matched_values = {self._compact_match_text(value) for value in matched_keywords.values()}
        source_tokens = set(TitleTokenProfile.from_title(source_keyword).token_set)
        source_values = {self._compact_match_text(token) for token in source_tokens}
        category = self._infer_product_category(matched_values)

        if category:
            return category, max(fallback_confidence, 0.9), "product_name_trie"

        category = self._infer_product_category(source_values)
        if category:
            return category, max(fallback_confidence, 0.75), "source_keyword_correlation"

        return fallback_category, fallback_confidence, fallback_method

    def _infer_product_category(self, tokens: set[str]) -> str:
        matched_categories: set[str] = set()
        for token in tokens:
            matched_categories.update(self.category_rules.get(token, set()))
        if len(matched_categories) == 1:
            return next(iter(matched_categories))
        return ""

    def _generate_graph_keywords(
        self,
        *,
        category: str,
        matched_keywords: Sequence[str],
        candidates: Sequence[ProductMatchCandidate],
        source_keyword: str,
        normalized_title: str,
    ) -> list[str]:
        del normalized_title
        candidate_keywords: list[str] = []
        for candidate in candidates[:3]:
            candidate_keywords.extend(
                [
                    candidate.representative_name,
                    candidate.cluster_id,
                    candidate.tree_path_ids,
                    *candidate.matched_tokens,
                ]
            )
        return self._unique_values([category, source_keyword, *matched_keywords, *candidate_keywords])

    @staticmethod
    def _collect_matched_keywords(
        *,
        source_keyword: str,
        candidates: Sequence[ProductMatchCandidate],
    ) -> list[str]:
        values: list[str] = [source_keyword]
        for candidate in candidates:
            values.extend(candidate.matched_keywords)
            values.extend(candidate.matched_tokens)
            if candidate.representative_name:
                values.append(candidate.representative_name)
        return HamaDataPipeline._unique_values(values)

    @staticmethod
    def _build_keyword_index(keyword_catalog: Sequence[str]) -> ProductMatchIndex:
        rows = [
            {
                "name": keyword,
                "keyword": keyword,
                "canonical_name": keyword,
            }
            for keyword in split_keyword_values(keyword_catalog)
        ]
        return ProductMatchIndex.from_rows(rows)

    @classmethod
    def _load_category_rules(cls, rules_path: Path) -> dict[str, set[str]]:
        category_rules: dict[str, set[str]] = {}
        for row in cls._read_enabled_csv_rows(rules_path):
            category = cls._clean_text(row.get("category"))
            tokens = cls._split_csv_list(row.get("tokens"))
            if not category or not tokens:
                continue
            for token in tokens:
                normalized_token = cls._compact_match_text(token)
                if normalized_token:
                    category_rules.setdefault(normalized_token, set()).add(category)
        return category_rules

    @classmethod
    def _load_token_exclusions(cls, exclusions_path: Path) -> set[str]:
        excluded_tokens: set[str] = set()
        for row in cls._read_enabled_csv_rows(exclusions_path):
            for token in cls._split_csv_list(row.get("tokens") or row.get("token")):
                normalized_token = cls._compact_match_text(token)
                if normalized_token:
                    excluded_tokens.add(normalized_token)
        return excluded_tokens

    @staticmethod
    def _read_enabled_csv_rows(path: Path) -> list[dict[str, str]]:
        if not path.exists():
            logger.warning("[HamaDataPipeline] config csv not found path=%s", path)
            return []

        with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
            rows: list[dict[str, str]] = []
            for row in csv.DictReader(csv_file):
                enabled = HamaDataPipeline._clean_text(row.get("enabled") or "1").lower()
                if enabled in {"0", "false", "n", "no", "비활성"}:
                    continue
                rows.append({key: str(value or "") for key, value in row.items() if key is not None})
            return rows

    @staticmethod
    def _split_csv_list(value: Any) -> list[str]:
        values: list[str] = []
        for token in re.split(r"[,/|;]", str(value or "")):
            cleaned_token = token.strip()
            if cleaned_token:
                values.append(cleaned_token)
        return values

    @staticmethod
    def _clean_text(value: Any) -> str:
        return str(value or "").strip()

    @staticmethod
    def _unique_values(values: Sequence[str]) -> list[str]:
        unique: list[str] = []
        seen: set[str] = set()
        for value in values:
            cleaned_value = str(value or "").strip()
            if not cleaned_value or cleaned_value in seen:
                continue
            unique.append(cleaned_value)
            seen.add(cleaned_value)
        return unique


class HamaCollectionPipeline:
    """관리자 keyword_list를 순회하며 기준/검증 데이터를 수집하고 정제하는 상위 파이프라인입니다."""

    def __init__(
        self,
        *,
        keyword_list: Sequence[str] | None = None,
        min_verify_confidence: float = 0.35,
        model_classifier: CategoryModelClassifier | None = None,
        product_token_dictionary_path: str | Path | None = None,
        category_rules_path: str | Path | None = None,
        token_exclude_list_path: str | Path | None = None,
        blacklist_keywords_path: str | Path | None = None,
    ) -> None:
        self.keyword_list = HamaDataPipeline._unique_values(keyword_list or [])
        self.min_verify_confidence = min_verify_confidence
        self.model_classifier = model_classifier
        self.product_token_dictionary_path = product_token_dictionary_path
        self.category_rules_path = category_rules_path
        self.blacklist_keywords_path = Path(blacklist_keywords_path or DEFAULT_BLACKLIST_KEYWORDS_PATH)
        self.drop_name_matchers = build_drop_name_keyword_matchers(
            load_drop_name_keywords(self.blacklist_keywords_path)
        )
        self.token_exclude_tokens = HamaDataPipeline._load_token_exclusions(
            Path(token_exclude_list_path or DEFAULT_TOKEN_EXCLUDE_LIST_PATH)
        )

    def run_pipeline(self, keyword: str) -> list[ProcessedItem]:
        source_keyword = HamaDataPipeline._clean_text(keyword)
        if not source_keyword:
            logger.info("[HamaCollectionPipeline] empty keyword skipped")
            return []

        logger.info("[HamaCollectionPipeline] start keyword=%s", source_keyword)
        joongna_list = self._fetch_joongna_data(source_keyword)
        bunjang_list = self._fetch_bunjang_data(source_keyword)
        verified_items = self._verify_and_clean_data(joongna_list, bunjang_list)
        filtered_items = self._apply_keyword_final_filters(
            [*joongna_list, *verified_items],
            source_keyword=source_keyword,
        )

        keyword_prices = [float(item.price) for item in filtered_items if item.price and item.price > 0]
        keyword_price_bounds = compute_keyword_price_bounds(keyword_prices)

        match_index = ProductMatchIndex.from_rows(
            [self._raw_item_to_match_row(item) for item in filtered_items]
        )
        item_pipeline = HamaDataPipeline(
            match_index=match_index,
            model_classifier=self.model_classifier,
            product_token_dictionary_path=self.product_token_dictionary_path,
            category_rules_path=self.category_rules_path,
            blacklist_keywords_path=self.blacklist_keywords_path,
            keyword_price_bounds=keyword_price_bounds,
        )

        processed_items = self._to_processed_items(filtered_items, item_pipeline)
        processed_items = self._enrich_with_batch_clusters(processed_items, source_keyword)
        logger.info(
            "[HamaCollectionPipeline] done keyword=%s joongna=%d bunjang_verified=%d processed=%d",
            source_keyword,
            len(joongna_list),
            len(verified_items),
            len(processed_items),
        )
        return processed_items

    def run_all(self) -> list[ProcessedItem]:
        processed_items: list[ProcessedItem] = []
        for keyword in self.keyword_list:
            processed_items.extend(self.run_pipeline(keyword))
        return processed_items

    def _to_processed_items(
        self,
        raw_items: Sequence[RawItem],
        item_pipeline: HamaDataPipeline,
    ) -> list[ProcessedItem]:
        processed_items: list[ProcessedItem] = []
        for item in raw_items:
            processed = item_pipeline.run_pipeline(self._raw_item_to_pipeline_input(item))
            if processed is not None:
                processed_items.append(processed)
        return processed_items

    def _apply_keyword_final_filters(
        self,
        raw_items: Sequence[RawItem],
        *,
        source_keyword: str,
    ) -> list[RawItem]:
        kept_items: list[RawItem] = []
        for item in raw_items:
            drop_decision = evaluate_item_filters(
                name=item.title,
                price=item.price,
                drop_matchers=self.drop_name_matchers,
            )
            if drop_decision.should_drop:
                logger.info(
                    "[HamaCollectionPipeline] drop keyword=%s pid=%s stage=%s reason=%s",
                    source_keyword,
                    item.pid,
                    drop_decision.stage,
                    drop_decision.reason,
                )
                continue
            kept_items.append(item)

        keyword_prices = [float(item.price) for item in kept_items if item.price and item.price > 0]
        keyword_price_bounds = compute_keyword_price_bounds(keyword_prices)

        filtered_items: list[RawItem] = []
        for item in kept_items:
            drop_decision = evaluate_item_filters(
                name=item.title,
                price=item.price,
                drop_matchers=self.drop_name_matchers,
                keyword_price_bounds=keyword_price_bounds,
            )
            if drop_decision.should_drop and drop_decision.stage == "price_outlier":
                logger.info(
                    "[HamaCollectionPipeline] drop price-outlier keyword=%s pid=%s detail=%s",
                    source_keyword,
                    item.pid,
                    drop_decision.detail,
                )
                continue
            filtered_items.append(item)
        return filtered_items

    def _enrich_with_batch_clusters(
        self,
        processed_items: Sequence[ProcessedItem],
        source_keyword: str,
    ) -> list[ProcessedItem]:
        if not processed_items:
            return []

        records = [
            {
                "keyword": source_keyword,
                "platform": item.platform,
                "pid": item.pid,
                "name": item.name,
                "price_numeric": item.price,
                "status": item.status,
                "link": item.link,
                "date": item.date,
            }
            for item in processed_items
        ]
        clustered_records = apply_token_stage_clustering(records)
        cluster_by_key = {
            (record["platform"], record["pid"], int(record.get("price_numeric") or 0)): record
            for record in clustered_records
        }

        enriched_items: list[ProcessedItem] = []
        for item in processed_items:
            cluster_record = cluster_by_key.get((item.platform, item.pid, item.price))
            if not cluster_record:
                enriched_items.append(item)
                continue
            enriched_items.append(
                item.model_copy(
                    update={
                        "cluster_name_text": str(cluster_record.get("cluster_name_text") or item.cluster_name_text),
                        "tokenized_cluster_name_text": str(
                            cluster_record.get("tokenized_cluster_name_text") or item.tokenized_cluster_name_text
                        ),
                        "cluster_product_name": str(
                            cluster_record.get("cluster_product_name") or item.cluster_product_name
                        ),
                        "cluster_route": str(cluster_record.get("cluster_route") or item.cluster_route),
                    }
                )
            )
        return enriched_items

    def _fetch_joongna_data(self, keyword: str) -> list[RawItem]:
        logger.info("[HamaCollectionPipeline] fetch joongna baseline keyword=%s", keyword)
        # TODO: 기존 중고나라 크롤러 또는 저장된 CSV 로더를 연결합니다.
        return []

    def _fetch_bunjang_data(self, keyword: str) -> list[RawItem]:
        logger.info("[HamaCollectionPipeline] fetch bunjang target keyword=%s", keyword)
        # TODO: 기존 번개장터 API 크롤러 또는 저장된 CSV 로더를 연결합니다.
        return []

    def _verify_and_clean_data(
        self,
        joongna_list: Sequence[RawItem],
        bunjang_list: Sequence[RawItem],
    ) -> list[RawItem]:
        logger.info(
            "[HamaCollectionPipeline] verify bunjang with joongna baseline joongna=%d bunjang=%d",
            len(joongna_list),
            len(bunjang_list),
        )
        if not joongna_list:
            return list(bunjang_list)

        reference_prices = self._valid_reference_prices(joongna_list)
        reference_price = median(reference_prices) if reference_prices else None
        min_price = int(reference_price * 0.35) if reference_price else None
        max_price = int(reference_price * 2.5) if reference_price else None
        core_tokens = self._extract_core_title_tokens(joongna_list)

        logger.info(
            "[HamaCollectionPipeline] verify baseline price=%s range=(%s,%s) core_tokens=%s",
            reference_price,
            min_price,
            max_price,
            core_tokens,
        )

        reference_index = ProductMatchIndex.from_rows(
            [self._raw_item_to_match_row(item) for item in joongna_list]
        )
        verified_items: list[RawItem] = []
        for item in bunjang_list:
            if not self._is_price_in_reference_range(item, min_price=min_price, max_price=max_price):
                logger.info(
                    "[HamaCollectionPipeline] drop price-outlier bunjang pid=%s price=%s range=(%s,%s)",
                    item.pid,
                    item.price,
                    min_price,
                    max_price,
                )
                continue

            profile = TitleTokenProfile.from_title(item.title)
            if not self._has_relevant_title_tokens(
                profile,
                core_tokens=core_tokens,
                excluded_tokens=self.token_exclude_tokens,
            ):
                logger.info(
                    "[HamaCollectionPipeline] drop irrelevant-title bunjang pid=%s title=%s core_tokens=%s",
                    item.pid,
                    item.title,
                    core_tokens,
                )
                continue

            candidates = reference_index.match(profile, platform=item.platform)
            correlation = reference_index.correlate_category(
                candidates,
                source_keyword=item.source_keyword,
            )
            if correlation.confidence < self.min_verify_confidence:
                logger.info(
                    "[HamaCollectionPipeline] drop low-confidence bunjang pid=%s confidence=%.2f",
                    item.pid,
                    correlation.confidence,
                )
                continue
            verified_items.append(item)
        return verified_items

    @staticmethod
    def _valid_reference_prices(items: Sequence[RawItem]) -> list[int]:
        return sorted(int(item.price) for item in items if item.price and item.price > 0)

    def _extract_core_title_tokens(self, items: Sequence[RawItem], *, limit: int = 8) -> set[str]:
        token_counts: Counter[str] = Counter()
        title_count = 0
        for item in items:
            profile = TitleTokenProfile.from_title(item.title)
            if not profile.token_set:
                continue
            title_count += 1
            token_counts.update(token for token in profile.token_set if self._is_signal_token(token))

        if not token_counts:
            return set()

        min_frequency = 2 if title_count >= 3 else 1
        return {
            token
            for token, count in token_counts.most_common(limit)
            if count >= min_frequency
        }

    @staticmethod
    def _is_price_in_reference_range(
        item: RawItem,
        *,
        min_price: int | None,
        max_price: int | None,
    ) -> bool:
        if min_price is None or max_price is None:
            return True
        if item.price is None or item.price <= 0:
            return False
        return min_price <= item.price <= max_price

    @staticmethod
    def _has_relevant_title_tokens(
        profile: TitleTokenProfile,
        *,
        core_tokens: set[str],
        excluded_tokens: set[str],
    ) -> bool:
        if not core_tokens:
            return True

        item_tokens = set(profile.token_set)
        matched_core_tokens = item_tokens & core_tokens
        excluded_match_count = len({HamaDataPipeline._compact_match_text(token) for token in item_tokens} & excluded_tokens)
        if matched_core_tokens:
            return excluded_match_count < 3
        return False

    def _is_signal_token(self, token: str) -> bool:
        if len(token) < 2:
            return False
        if HamaDataPipeline._compact_match_text(token) in self.token_exclude_tokens:
            return False
        if token.isdigit():
            return len(token) >= 3
        return True

    @staticmethod
    def _raw_item_to_match_row(item: RawItem) -> dict[str, Any]:
        return {
            "platform": item.platform,
            "pid": item.pid,
            "name": item.title,
            "keyword": item.source_keyword,
            "canonical_name": item.source_keyword,
            "matched_keywords": item.source_keyword,
        }

    @staticmethod
    def _raw_item_to_pipeline_input(item: RawItem) -> dict[str, Any]:
        image_url = item.image_url
        return {
            "platform": item.platform,
            "pid": item.pid,
            "name": item.title,
            "raw_title": item.title,
            "price": item.price or 0,
            "status": item.status,
            "description": item.description,
            "imageUrl": image_url,
            "images": [image_url] if image_url else [],
            "link": item.url,
            "date": item.date,
            "keyword": item.source_keyword,
            "source_keyword": item.source_keyword,
        }
