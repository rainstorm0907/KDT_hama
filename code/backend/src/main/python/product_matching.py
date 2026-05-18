from __future__ import annotations

import re
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any


def normalize_title(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    text = re.sub(r"[^0-9a-z가-힣\s]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize_title(value: Any) -> list[str]:
    tokens: list[str] = []
    for token in normalize_title(value).split(" "):
        cleaned_token = re.sub(r"^[^\w가-힣]+|[^\w가-힣]+$", "", token)
        if cleaned_token:
            tokens.append(cleaned_token)
    return tokens


def jaccard_similarity(left_tokens: set[str], right_tokens: set[str]) -> float:
    if not left_tokens and not right_tokens:
        return 0.0
    union_count = len(left_tokens | right_tokens)
    return len(left_tokens & right_tokens) / union_count if union_count else 0.0


def split_keyword_values(values: Iterable[Any]) -> list[str]:
    keywords: list[str] = []
    seen: set[str] = set()
    for value in values:
        for keyword in re.split(r"[,/|]", str(value or "")):
            cleaned_keyword = keyword.strip()
            if not cleaned_keyword or cleaned_keyword in seen:
                continue
            keywords.append(cleaned_keyword)
            seen.add(cleaned_keyword)
    return keywords


@dataclass(frozen=True)
class TitleTokenProfile:
    normalized_title: str
    tokens: tuple[str, ...]
    token_set: frozenset[str]

    @classmethod
    def from_title(cls, title: Any) -> TitleTokenProfile:
        tokens = tuple(tokenize_title(title))
        return cls(
            normalized_title=normalize_title(title),
            tokens=tokens,
            token_set=frozenset(tokens),
        )


@dataclass(frozen=True)
class ProductMatchCandidate:
    category: str
    cluster_id: str = ""
    representative_name: str = ""
    similarity: float = 0.0
    matched_tokens: tuple[str, ...] = ()
    tree_path_ids: str = ""
    matched_keywords: tuple[str, ...] = ()
    source_platform: str = ""
    source_pid: str = ""
    verified: bool = False


@dataclass(frozen=True)
class CategoryCorrelationResult:
    category: str
    confidence: float
    method: str
    evidence: tuple[ProductMatchCandidate, ...] = ()


@dataclass(frozen=True)
class _MatchEntry:
    platform: str
    pid: str
    name: str
    category: str
    profile: TitleTokenProfile
    matched_keywords: tuple[str, ...] = ()
    cluster_id: str = ""
    representative_name: str = ""
    tree_path_ids: str = ""
    verified: bool = False


@dataclass
class ProductMatchIndex:
    entries: list[_MatchEntry] = field(default_factory=list)
    token_to_entry_ids: dict[str, list[int]] = field(default_factory=dict)

    @classmethod
    def from_rows(cls, rows: Sequence[Mapping[str, Any]]) -> ProductMatchIndex:
        entries: list[_MatchEntry] = []
        for row in rows:
            entry = _entry_from_row(row)
            if entry is not None:
                entries.append(entry)

        token_to_entry_ids: dict[str, list[int]] = defaultdict(list)
        for entry_id, entry in enumerate(entries):
            for token in entry.profile.token_set:
                token_to_entry_ids[token].append(entry_id)

        return cls(entries=entries, token_to_entry_ids=dict(token_to_entry_ids))

    def match(
        self,
        profile: TitleTokenProfile,
        *,
        platform: str = "",
        limit: int = 5,
        min_shared_tokens: int = 1,
    ) -> list[ProductMatchCandidate]:
        if not profile.token_set:
            return []

        candidate_ids = self._candidate_entry_ids(profile.token_set)
        candidates: list[ProductMatchCandidate] = []
        for entry_id in candidate_ids:
            entry = self.entries[entry_id]
            shared_tokens = profile.token_set & entry.profile.token_set
            if len(shared_tokens) < min_shared_tokens:
                continue

            similarity = jaccard_similarity(set(profile.token_set), set(entry.profile.token_set))
            if platform and platform == entry.platform:
                similarity += 0.05
            if entry.verified:
                similarity += 0.05
            similarity = min(1.0, similarity)

            candidates.append(
                ProductMatchCandidate(
                    category=entry.category,
                    cluster_id=entry.cluster_id,
                    representative_name=entry.representative_name or entry.name,
                    similarity=similarity,
                    matched_tokens=_ordered_shared_tokens(profile.tokens, shared_tokens),
                    tree_path_ids=entry.tree_path_ids,
                    matched_keywords=entry.matched_keywords,
                    source_platform=entry.platform,
                    source_pid=entry.pid,
                    verified=entry.verified,
                )
            )

        return sorted(
            candidates,
            key=lambda candidate: (
                candidate.verified,
                candidate.similarity,
                len(candidate.matched_tokens),
                bool(candidate.cluster_id),
            ),
            reverse=True,
        )[:limit]

    def correlate_category(
        self,
        candidates: Sequence[ProductMatchCandidate],
        *,
        source_keyword: str = "",
    ) -> CategoryCorrelationResult:
        if not candidates:
            if source_keyword:
                return CategoryCorrelationResult(source_keyword, 0.55, "source_keyword")
            return CategoryCorrelationResult("미분류", 0.0, "unclassified")

        best_similarity = max(candidate.similarity for candidate in candidates)
        strong_threshold = max(0.35, best_similarity * 0.75)
        strong_candidates = [
            candidate
            for candidate in candidates
            if candidate.similarity >= strong_threshold
        ]
        if source_keyword and not strong_candidates:
            return CategoryCorrelationResult(source_keyword, 0.55, "source_keyword")

        category_scores: Counter[str] = Counter()
        category_evidence: dict[str, list[ProductMatchCandidate]] = defaultdict(list)
        for candidate in strong_candidates:
            if not candidate.category:
                continue
            weight = candidate.similarity * candidate.similarity
            if candidate.verified:
                weight += 0.1
            if source_keyword and candidate.category == source_keyword:
                weight += 0.25
            category_scores[candidate.category] += weight
            category_evidence[candidate.category].append(candidate)

        if not category_scores:
            if source_keyword:
                return CategoryCorrelationResult(source_keyword, 0.55, "source_keyword")
            return CategoryCorrelationResult("미분류", 0.0, "unclassified")

        category, score = category_scores.most_common(1)[0]
        evidence = tuple(category_evidence[category][:3])
        confidence = min(0.99, max(candidate.similarity for candidate in evidence) + min(0.25, score / 10))
        method = "joongna_correlation" if any(candidate.verified for candidate in evidence) else "title_correlation"
        return CategoryCorrelationResult(category, round(confidence, 4), method, evidence)

    def _candidate_entry_ids(self, token_set: frozenset[str]) -> set[int]:
        candidate_ids: set[int] = set()
        for token in token_set:
            candidate_ids.update(self.token_to_entry_ids.get(token, []))
        return candidate_ids


def _entry_from_row(row: Mapping[str, Any]) -> _MatchEntry | None:
    name = _clean_text(row.get("name") or row.get("representative_name") or row.get("derived_product_name"))
    if not name:
        return None

    category = _choose_category(row)
    if not category:
        return None

    matched_keywords = tuple(
        split_keyword_values(
            [
                row.get("matched_keywords"),
                row.get("canonical_name"),
                row.get("keyword"),
                row.get("category"),
            ]
        )
    )
    representative_name = _clean_text(row.get("representative_name") or row.get("derived_product_name"))

    return _MatchEntry(
        platform=_clean_text(row.get("platform")),
        pid=_clean_text(row.get("pid")),
        name=name,
        category=category,
        profile=TitleTokenProfile.from_title(name),
        matched_keywords=matched_keywords or (category,),
        cluster_id=_clean_text(row.get("cluster_id") or row.get("cluster_l2_id")),
        representative_name=representative_name,
        tree_path_ids=_clean_text(row.get("tree_path_ids")),
        verified=_is_verified_row(row),
    )


def _choose_category(row: Mapping[str, Any]) -> str:
    for key in ("category", "canonical_name", "keyword"):
        value = _clean_text(row.get(key))
        if value:
            return value
    keywords = split_keyword_values([row.get("matched_keywords")])
    return keywords[0] if keywords else ""


def _is_verified_row(row: Mapping[str, Any]) -> bool:
    platform = _clean_text(row.get("platform"))
    label = _clean_text(row.get("label"))
    label_meaning = _clean_text(row.get("label_meaning"))
    return platform == "중고나라" or label == "1" or "positive" in label_meaning


def _ordered_shared_tokens(tokens: Sequence[str], shared_tokens: set[str] | frozenset[str]) -> tuple[str, ...]:
    return tuple(token for token in tokens if token in shared_tokens)


def _clean_text(value: Any) -> str:
    return str(value or "").strip()
