from __future__ import annotations

import logging
from collections.abc import Callable, Mapping, Sequence
from typing import Any, Literal

from pydantic import BaseModel, Field

from product_matching import (
    CategoryCorrelationResult,
    ProductMatchCandidate,
    ProductMatchIndex,
    TitleTokenProfile,
    normalize_title,
    split_keyword_values,
)


logger = logging.getLogger(__name__)

ProductStatus = Literal["판매중", "예약중", "판매완료"]


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
    matched_keywords: list[str] = Field(default_factory=list)
    classification_method: str = "unclassified"
    graphKeywords: list[str] = Field(default_factory=list)


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
    ) -> None:
        self.match_index = match_index or self._build_keyword_index(keyword_catalog or [])
        self.model_classifier = model_classifier

    def run_pipeline(self, raw_item: Mapping[str, Any]) -> HamaProduct:
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
        graph_keywords = self._generate_graph_keywords(
            category=category,
            matched_keywords=matched_keywords,
            candidates=evidence_candidates,
            source_keyword=source_keyword,
            normalized_title=normalized_title,
        )

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
            matched_keywords=matched_keywords,
            classification_method=method,
            graphKeywords=graph_keywords,
        )

    def _normalize_title(self, raw_title: str) -> str:
        return normalize_title(raw_title)

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
    ) -> None:
        self.keyword_list = HamaDataPipeline._unique_values(keyword_list or [])
        self.min_verify_confidence = min_verify_confidence
        self.model_classifier = model_classifier

    def run_pipeline(self, keyword: str) -> list[ProcessedItem]:
        source_keyword = HamaDataPipeline._clean_text(keyword)
        if not source_keyword:
            logger.info("[HamaCollectionPipeline] empty keyword skipped")
            return []

        logger.info("[HamaCollectionPipeline] start keyword=%s", source_keyword)
        joongna_list = self._fetch_joongna_data(source_keyword)
        bunjang_list = self._fetch_bunjang_data(source_keyword)
        verified_items = self._verify_and_clean_data(joongna_list, bunjang_list)

        match_index = ProductMatchIndex.from_rows(
            [self._raw_item_to_match_row(item) for item in [*joongna_list, *verified_items]]
        )
        item_pipeline = HamaDataPipeline(
            match_index=match_index,
            model_classifier=self.model_classifier,
        )

        processed_items = [
            item_pipeline.run_pipeline(self._raw_item_to_pipeline_input(item))
            for item in [*joongna_list, *verified_items]
        ]
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

        reference_index = ProductMatchIndex.from_rows(
            [self._raw_item_to_match_row(item) for item in joongna_list]
        )
        verified_items: list[RawItem] = []
        for item in bunjang_list:
            profile = TitleTokenProfile.from_title(item.title)
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
