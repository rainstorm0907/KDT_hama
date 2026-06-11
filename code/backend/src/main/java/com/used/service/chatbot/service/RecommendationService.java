package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatAnalysisResult;
import com.used.service.chatbot.dto.RecommendedItemDto;
import com.used.service.chatbot.entity.Item;
import com.used.service.chatbot.entity.RecommendedItem;
import com.used.service.chatbot.repository.ItemRepository;
import com.used.service.chatbot.repository.RecommendedItemRepository;
import com.used.service.chatbot.repository.projection.RecommendedItemProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String RECOMMEND_TYPE_CHATBOT = "CHATBOT_RECOMMEND";
    private static final String ON_SALE = "판매중";

    private final ItemRepository itemRepository;
    private final RecommendedItemRepository recommendedItemRepository;
    private final OpenSearchProductService openSearchProductService;

    @Transactional
    public List<RecommendedItemDto> recommendByAnalysisResult(Long userId, ChatAnalysisResult analysis) {
        if (analysis == null) return List.of();

        String keyword = normalizeKeyword(analysis.getKeyword());
        Long minPrice = normalizePrice(analysis.getMinPrice());
        Long maxPrice = normalizePrice(analysis.getMaxPrice());
        if (keyword.isBlank()) return List.of();

        System.out.println("[추천 검색 조건] keyword=" + keyword
                + ", minPrice=" + minPrice
                + ", maxPrice=" + maxPrice
                + ", productType=" + normalizeText(analysis.getProductType())
                + ", useCase=" + normalizeText(analysis.getUseCase())
                + ", performanceLevel=" + normalizePerformanceLevel(analysis.getPerformanceLevel()));

        List<RecommendedItemDto> openSearchResults = openSearchProductService.search(analysis, 10);
        if (!openSearchResults.isEmpty()) {
            saveRecommendedItemDtos(userId, openSearchResults);
            return openSearchResults;
        }

        List<RecommendedItemProjection> results = findScoredItems(keyword, minPrice, maxPrice, analysis, 10);
        saveRecommendedItems(userId, results);
        return results.stream().map(item -> toDto(item, analysis)).toList();
    }

    @Transactional
    public List<RecommendedItemDto> recommendByKeyword(Long userId, String keyword) {
        String safeKeyword = normalizeKeyword(keyword);
        if (safeKeyword.isBlank()) return List.of();
        List<RecommendedItemProjection> results = findScoredItems(safeKeyword, null, null, null, 10);
        saveRecommendedItems(userId, results);
        return results.stream().map(this::toDto).toList();
    }

    @Transactional
    public List<RecommendedItemDto> recommendByKeywordAndMaxPrice(Long userId, String keyword, Long maxPrice) {
        String safeKeyword = normalizeKeyword(keyword);
        if (safeKeyword.isBlank() || maxPrice == null || maxPrice <= 0) return List.of();
        List<RecommendedItemProjection> results = findScoredItems(safeKeyword, null, maxPrice, null, 10);
        saveRecommendedItems(userId, results);
        return results.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public boolean hasAvailableItems() {
        return countAvailableItems() > 0;
    }

    @Transactional(readOnly = true)
    public long countAvailableItems() {
        return itemRepository.countBySaleStatus(ON_SALE);
    }

    @Transactional
    public List<RecommendedItemDto> recommendPersonalized(Long userId) {
        if (userId == null) return List.of();
        List<RecommendedItemProjection> results = itemRepository
                .findAvailableItems(ON_SALE, PageRequest.of(0, 30))
                .stream()
                .map(item -> (RecommendedItemProjection) new ItemProjectionAdapter(item, scorePriceAndFreshness(item)))
                .sorted(Comparator.comparing(RecommendedItemProjection::getScore).reversed())
                .limit(10)
                .toList();
        saveRecommendedItems(userId, results);
        return results.stream().map(this::toDto).toList();
    }

    private List<RecommendedItemProjection> findScoredItems(String keyword, Long minPrice, Long maxPrice, ChatAnalysisResult analysis, int limit) {
        return itemRepository
                .findRecommendationCandidates(keyword, minPrice, maxPrice, ON_SALE, PageRequest.of(0, 150))
                .stream()
                .map(item -> (RecommendedItemProjection) new ItemProjectionAdapter(item, scoreItem(item, keyword, analysis)))
                .filter(item -> item.getScore() > 0)
                .sorted(Comparator
                        .comparing(RecommendedItemProjection::getScore).reversed()
                        .thenComparing(item -> item.getCurrentPrice() == null ? Long.MAX_VALUE : item.getCurrentPrice()))
                .limit(limit)
                .toList();
    }

    private int scoreItem(Item item, String keyword, ChatAnalysisResult analysis) {
        String normalizedKeyword = normalizeText(keyword);
        String title = normalizeText(item.getTitle());
        String canonicalName = normalizeText(item.getCanonicalName());
        String matchedKeywords = normalizeText(item.getMatchedKeywords());
        String categoryName = normalizeText(item.getCategoryName());
        String allText = title + " " + canonicalName + " " + matchedKeywords + " " + categoryName;

        if (!matchesProductType(allText, analysis)) {
            return -100;
        }

        int score = 0;
        if (!normalizedKeyword.isBlank()) {
            if (canonicalName.equals(normalizedKeyword)) score += 120;
            else if (canonicalName.contains(normalizedKeyword)) score += 100;

            if (title.equals(normalizedKeyword)) score += 90;
            else if (title.contains(normalizedKeyword)) score += 70;

            if (matchedKeywords.contains(normalizedKeyword)) score += 60;
            if (categoryName.contains(normalizedKeyword)) score += 35;
        }

        score += scoreUseCase(item, analysis);
        score += scorePerformanceLevel(item, analysis);
        score += scorePriceAndFreshness(item);
        return score;
    }

    private boolean matchesProductType(String allText, ChatAnalysisResult analysis) {
        String productType = analysis == null ? "" : normalizeText(analysis.getProductType());
        if (productType.isBlank()) return true;

        return switch (productType) {
            case "desktop" -> containsAny(allText, "컴퓨터", "데스크탑", "데스크톱", "본체", "게이밍pc", "pc")
                    && !containsAny(allText, "그래픽카드", "rtx", "gtx", "gpu", "그래픽 카드만", "노트북");
            case "laptop" -> containsAny(allText, "노트북", "맥북", "그램", "갤럭시북", "레노버", "thinkpad");
            case "smartphone" -> containsAny(allText, "아이폰", "갤럭시", "스마트폰", "핸드폰", "휴대폰", "iphone", "galaxy");
            case "game_console" -> containsAny(allText, "스위치", "닌텐도", "ps5", "ps4", "플스", "xbox", "steamdeck", "스팀덱");
            default -> true;
        };
    }

    private int scoreUseCase(Item item, ChatAnalysisResult analysis) {
        String useCase = analysis == null ? "" : normalizeText(analysis.getUseCase());
        String title = normalizeText(item.getTitle());
        if (!"gaming".equals(useCase)) return 0;
        if (containsAny(title, "rtx", "gtx", "rx ", "게이밍", "그래픽", "gpu")) return 40;
        return 0;
    }

    private int scorePerformanceLevel(Item item, ChatAnalysisResult analysis) {
        String performanceLevel = analysis == null ? "" : normalizePerformanceLevel(analysis.getPerformanceLevel());
        String title = normalizeText(item.getTitle());
        return switch (performanceLevel) {
            case "LOW" -> containsAny(title, "gtx 1050", "gtx1050", "gtx 1060", "gtx1060", "gtx 1660", "rtx 2060", "rtx 3060", "rtx 4060") ? 25 : 0;
            case "MID" -> containsAny(title, "gtx 1660", "rtx 2060", "rtx 3060", "rtx 4060", "rtx 4070") ? 30 : 0;
            case "HIGH" -> containsAny(title, "rtx 3060", "rtx 3070", "rtx 3080", "rtx 4060", "rtx 4070", "rtx 4080") ? 35 : 0;
            case "EXTREME" -> containsAny(title, "rtx 4080", "rtx4080", "rtx 4090", "rtx4090") ? 40 : 0;
            default -> 0;
        };
    }

    private int scorePriceAndFreshness(Item item) {
        int score = 0;
        if (item.getLowestPrice() != null && item.getLowestPrice() > 0 && item.getCurrentPrice() != null) {
            if (item.getCurrentPrice() <= item.getLowestPrice()) score += 30;
            else if (item.getCurrentPrice() <= Math.round(item.getLowestPrice() * 1.05)) score += 20;
            else if (item.getCurrentPrice() <= Math.round(item.getLowestPrice() * 1.10)) score += 10;
        }
        if (item.getCrawledAt() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (item.getCrawledAt().isAfter(now.minusDays(1))) score += 15;
            else if (item.getCrawledAt().isAfter(now.minusDays(3))) score += 10;
            else if (item.getCrawledAt().isAfter(now.minusDays(7))) score += 5;
        }
        return score;
    }

    private void saveRecommendedItems(Long userId, List<RecommendedItemProjection> results) {
        if (userId == null || results == null || results.isEmpty()) return;
        for (RecommendedItemProjection item : results) {
            if (item == null || item.getItemId() == null) continue;
            boolean exists = recommendedItemRepository.existsByUserIdAndItemIdAndRecommendType(userId, item.getItemId(), RECOMMEND_TYPE_CHATBOT);
            if (exists) continue;
            RecommendedItem recommendedItem = new RecommendedItem();
            recommendedItem.setUserId(userId);
            recommendedItem.setItemId(item.getItemId());
            recommendedItem.setScore(item.getScore());
            recommendedItem.setRecommendType(RECOMMEND_TYPE_CHATBOT);
            recommendedItemRepository.save(recommendedItem);
        }
    }

    private void saveRecommendedItemDtos(Long userId, List<RecommendedItemDto> results) {
        if (userId == null || results == null || results.isEmpty()) return;
        for (RecommendedItemDto item : results) {
            if (item == null || item.getItemId() == null) continue;
            boolean exists = recommendedItemRepository.existsByUserIdAndItemIdAndRecommendType(
                    userId, item.getItemId(), RECOMMEND_TYPE_CHATBOT);
            if (exists) continue;
            RecommendedItem recommendedItem = new RecommendedItem();
            recommendedItem.setUserId(userId);
            recommendedItem.setItemId(item.getItemId());
            recommendedItem.setScore(item.getScore());
            recommendedItem.setRecommendType(RECOMMEND_TYPE_CHATBOT);
            recommendedItemRepository.save(recommendedItem);
        }
    }

    private RecommendedItemDto toDto(RecommendedItemProjection item) {
        return toDto(item, null);
    }

    private RecommendedItemDto toDto(RecommendedItemProjection item, ChatAnalysisResult analysis) {
        return RecommendedItemDto.builder()
                .itemId(item.getItemId())
                .title(item.getTitle())
                .currentPrice(item.getCurrentPrice())
                .lowestPrice(item.getLowestPrice())
                .categoryName(item.getCategoryName())
                .thumbnailUrl(item.getThumbnailUrl())
                .itemUrl(item.getItemUrl())
                .score(item.getScore())
                .recommendReason(makeReason(item, analysis))
                .build();
    }

    private String makeReason(RecommendedItemProjection item, ChatAnalysisResult analysis) {
        String useCase = analysis == null ? "" : normalizeText(analysis.getUseCase());
        String gameName = analysis == null ? "" : normalizeKeyword(analysis.getGameName());

        if ("gaming".equals(useCase)) {
            return gameName.isBlank()
                    ? "게이밍 용도로 볼 만한 상품입니다. CPU, GPU, RAM 구성을 함께 확인해 주세요."
                    : gameName + " 플레이 후보로 볼 만합니다. 옵션 타협 여부와 부품 구성을 함께 확인해 주세요.";
        }

        if (isLowestPriceLevel(item)) {
            return "현재가가 기록된 최저가 수준이라 가격 메리트가 큰 상품입니다.";
        }

        if (item.getScore() != null && item.getScore() >= 100) {
            return "검색어와 상품명, 카테고리 조건이 잘 맞는 상품입니다.";
        }

        return "검색 조건과 연관성이 있는 상품입니다.";
    }

    private boolean isLowestPriceLevel(RecommendedItemProjection item) {
        return item.getLowestPrice() != null
                && item.getLowestPrice() > 0
                && item.getCurrentPrice() != null
                && item.getCurrentPrice() <= Math.round(item.getLowestPrice() * 1.05);
    }

    private boolean containsAny(String value, String... keywords) {
        if (value == null || value.isBlank()) return false;
        for (String keyword : keywords) {
            if (value.contains(normalizeText(keyword))) return true;
        }
        return false;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) return "";
        return keyword.replace("\"", "").replace("'", "").trim();
    }

    private String normalizeText(String value) {
        if (value == null) return "";
        return value.trim().toLowerCase();
    }

    private String normalizePerformanceLevel(String performanceLevel) {
        if (performanceLevel == null || performanceLevel.isBlank()) return "";
        String normalized = performanceLevel.trim().toUpperCase();
        return switch (normalized) {
            case "LOW", "MID", "HIGH", "EXTREME", "UNKNOWN" -> normalized;
            default -> "";
        };
    }

    private Long normalizePrice(Long price) {
        return price == null || price <= 0 ? null : price;
    }

    private static class ItemProjectionAdapter implements RecommendedItemProjection {
        private final Item item;
        private final Integer score;

        private ItemProjectionAdapter(Item item, Integer score) {
            this.item = item;
            this.score = score == null ? 0 : score;
        }

        @Override public Long getItemId() { return item.getItemId(); }
        @Override public String getTitle() { return item.getTitle(); }
        @Override public Long getCurrentPrice() { return item.getCurrentPrice(); }
        @Override public Long getLowestPrice() { return item.getLowestPrice(); }
        @Override public String getCategoryName() { return item.getCategoryName(); }
        @Override public String getThumbnailUrl() { return item.getThumbnailUrl(); }
        @Override public String getItemUrl() { return item.getItemUrl(); }
        @Override public Integer getScore() { return score; }
    }
}
