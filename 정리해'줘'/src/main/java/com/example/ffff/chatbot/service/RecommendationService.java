package com.example.ffff.chatbot.service;

import com.example.ffff.chatbot.dto.ChatAnalysisResult;
import com.example.ffff.chatbot.dto.RecommendedItemDto;
import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.entity.RecommendedItem;
import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.chatbot.repository.RecommendedItemRepository;
import com.example.ffff.chatbot.repository.projection.RecommendedItemProjection;
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

    @Transactional
    public List<RecommendedItemDto> recommendByAnalysisResult(
            Long userId,
            ChatAnalysisResult analysis
    ) {
        if (analysis == null) {
            return List.of();
        }

        String keyword = normalizeKeyword(analysis.getKeyword());
        Long minPrice = normalizePrice(analysis.getMinPrice());
        Long maxPrice = normalizePrice(analysis.getMaxPrice());

        if (keyword.isBlank()) {
            return List.of();
        }

        System.out.println("[추천 검색 조건] "
                + "keyword=" + keyword
                + ", minPrice=" + minPrice
                + ", maxPrice=" + maxPrice
                + ", productType=" + normalizeText(analysis.getProductType())
                + ", useCase=" + normalizeText(analysis.getUseCase())
                + ", performanceLevel=" + normalizePerformanceLevel(analysis.getPerformanceLevel()));

        List<RecommendedItemProjection> results = findScoredItems(keyword, minPrice, maxPrice, analysis, 10);

        saveRecommendedItems(userId, results);

        return results.stream()
                .map(item -> toDto(item, analysis))
                .toList();
    }

    @Transactional
    public List<RecommendedItemDto> recommendByKeyword(Long userId, String keyword) {
        String safeKeyword = normalizeKeyword(keyword);

        if (safeKeyword.isBlank()) {
            return List.of();
        }

        List<RecommendedItemProjection> results = findScoredItems(safeKeyword, null, null, null, 10);

        saveRecommendedItems(userId, results);

        return results.stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<RecommendedItemDto> recommendByKeywordAndMaxPrice(
            Long userId,
            String keyword,
            Long maxPrice
    ) {
        String safeKeyword = normalizeKeyword(keyword);

        if (safeKeyword.isBlank() || maxPrice == null || maxPrice <= 0) {
            return List.of();
        }

        List<RecommendedItemProjection> results = findScoredItems(safeKeyword, null, maxPrice, null, 10);

        saveRecommendedItems(userId, results);

        return results.stream()
                .map(this::toDto)
                .toList();
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
        if (userId == null) {
            return List.of();
        }

        List<RecommendedItemProjection> results = itemRepository
                .findAvailableItems(ON_SALE, PageRequest.of(0, 30))
                .stream()
                .map(item -> (RecommendedItemProjection) new ItemProjectionAdapter(item, scorePriceAndFreshness(item)))
                .sorted(Comparator.comparing(RecommendedItemProjection::getScore).reversed())
                .limit(10)
                .toList();

        saveRecommendedItems(userId, results);

        return results.stream()
                .map(this::toDto)
                .toList();
    }

    private List<RecommendedItemProjection> findScoredItems(
            String keyword,
            Long minPrice,
            Long maxPrice,
            ChatAnalysisResult analysis,
            int limit
    ) {
        return itemRepository
                .findRecommendationCandidates(
                        keyword,
                        minPrice,
                        maxPrice,
                        ON_SALE,
                        PageRequest.of(0, 120)
                )
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

        int score = 0;

        if (!normalizedKeyword.isBlank()) {
            if (canonicalName.equals(normalizedKeyword)) {
                score += 120;
            } else if (canonicalName.contains(normalizedKeyword)) {
                score += 100;
            }

            if (title.equals(normalizedKeyword)) {
                score += 90;
            } else if (title.contains(normalizedKeyword)) {
                score += 70;
            }

            if (matchedKeywords.contains(normalizedKeyword)) {
                score += 60;
            }

            if (categoryName.contains(normalizedKeyword)) {
                score += 35;
            }
        }

        score += scoreProductType(item, analysis);
        score += scoreUseCase(item, analysis);
        score += scorePerformanceLevel(item, analysis);
        score += scorePriceAndFreshness(item);

        return score;
    }

    private int scoreProductType(Item item, ChatAnalysisResult analysis) {
        String productType = analysis == null ? "" : normalizeText(analysis.getProductType());
        String title = normalizeText(item.getTitle());
        String category = normalizeText(item.getCategoryName());

        return switch (productType) {
            case "desktop" -> containsAny(title + " " + category, "컴퓨터", "데스크탑", "본체", "pc") ? 80 : -80;
            case "laptop" -> containsAny(title + " " + category, "노트북", "랩탑", "맥북", "그램") ? 80 : -80;
            case "smartphone" -> containsAny(title + " " + category, "아이폰", "갤럭시", "스마트폰", "휴대폰", "핸드폰") ? 80 : -80;
            case "game_console" -> containsAny(title + " " + category, "스위치", "닌텐도", "ps5", "ps4", "xbox", "플스") ? 80 : -80;
            default -> 0;
        };
    }

    private int scoreUseCase(Item item, ChatAnalysisResult analysis) {
        String useCase = analysis == null ? "" : normalizeText(analysis.getUseCase());
        String title = normalizeText(item.getTitle());

        if (!"gaming".equals(useCase)) {
            return 0;
        }

        if (containsAny(title, "rtx", "gtx", "rx ", "게이밍", "그래픽", "gpu")) {
            return 40;
        }

        return 0;
    }

    private int scorePerformanceLevel(Item item, ChatAnalysisResult analysis) {
        String performanceLevel = analysis == null ? "" : normalizePerformanceLevel(analysis.getPerformanceLevel());
        String title = normalizeText(item.getTitle());

        return switch (performanceLevel) {
            case "LOW" -> containsAny(title, "gtx 1050", "gtx1050", "gtx 1060", "gtx1060", "gtx 1660", "gtx1660", "rtx 2060", "rtx2060", "rtx 3060", "rtx3060", "rtx 4060", "rtx4060") ? 25 : 0;
            case "MID" -> containsAny(title, "gtx 1660", "gtx1660", "rtx 2060", "rtx2060", "rtx 3060", "rtx3060", "rtx 4060", "rtx4060", "rtx 4070", "rtx4070") ? 30 : 0;
            case "HIGH" -> containsAny(title, "rtx 3060", "rtx3060", "rtx 3070", "rtx3070", "rtx 3080", "rtx3080", "rtx 4060", "rtx4060", "rtx 4070", "rtx4070", "rtx 4080", "rtx4080") ? 35 : 0;
            case "EXTREME" -> containsAny(title, "rtx 4080", "rtx4080", "rtx 4090", "rtx4090") ? 40 : 0;
            default -> 0;
        };
    }

    private int scorePriceAndFreshness(Item item) {
        int score = 0;

        if (item.getLowestPrice() != null
                && item.getLowestPrice() > 0
                && item.getCurrentPrice() != null) {
            if (item.getCurrentPrice() <= item.getLowestPrice()) {
                score += 30;
            } else if (item.getCurrentPrice() <= Math.round(item.getLowestPrice() * 1.05)) {
                score += 20;
            } else if (item.getCurrentPrice() <= Math.round(item.getLowestPrice() * 1.10)) {
                score += 10;
            }
        }

        if (item.getCrawledAt() != null) {
            LocalDateTime now = LocalDateTime.now();

            if (item.getCrawledAt().isAfter(now.minusDays(1))) {
                score += 15;
            } else if (item.getCrawledAt().isAfter(now.minusDays(3))) {
                score += 10;
            } else if (item.getCrawledAt().isAfter(now.minusDays(7))) {
                score += 5;
            }
        }

        return score;
    }

    private void saveRecommendedItems(Long userId, List<RecommendedItemProjection> results) {
        if (userId == null || results == null || results.isEmpty()) {
            return;
        }

        for (RecommendedItemProjection item : results) {
            if (item == null || item.getItemId() == null) {
                continue;
            }

            boolean alreadyExists =
                    recommendedItemRepository.existsByUserIdAndItemIdAndRecommendType(
                            userId,
                            item.getItemId(),
                            RECOMMEND_TYPE_CHATBOT
                    );

            if (alreadyExists) {
                continue;
            }

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
        String title = normalizeText(item.getTitle());
        String useCase = analysis == null ? "" : normalizeText(analysis.getUseCase());
        String productType = analysis == null ? "" : normalizeText(analysis.getProductType());
        String performanceLevel = analysis == null
                ? ""
                : normalizePerformanceLevel(analysis.getPerformanceLevel());
        String gameName = analysis == null ? "" : normalizeKeyword(analysis.getGameName());

        if ("gaming".equals(useCase) && isComputerProduct(productType, title)) {
            return makeGamingReason(item, title, performanceLevel, gameName);
        }

        if (isLowestPriceLevel(item)) {
            return "현재가가 최근 최저가에 가까워 가격 메리트가 있는 상품입니다.";
        }

        if (item.getScore() != null && item.getScore() >= 100) {
            return "검색어, 선호 태그, 가격 조건과 잘 맞는 상품입니다.";
        }

        return "검색어와 관련성이 높은 상품입니다.";
    }

    private String makeGamingReason(
            RecommendedItemProjection item,
            String normalizedTitle,
            String performanceLevel,
            String gameName
    ) {
        String targetGame = gameName.isBlank() ? "요청한 게임" : gameName;
        boolean hasGpu = containsAny(normalizedTitle, "rtx", "gtx", "rx ", "그래픽", "gpu");
        boolean hasMemory16 = containsAny(normalizedTitle, "16g", "16gb", "32g", "32gb");
        boolean hasDesktopHint = containsAny(normalizedTitle, "본체", "데스크탑", "pc", "컴퓨터");

        if ("LOW".equals(performanceLevel)) {
            if (hasGpu && hasMemory16) {
                return targetGame + "용으로 충분한 그래픽 성능과 16GB급 메모리를 기대할 수 있는 상품입니다.";
            }
            if (hasGpu) {
                return targetGame + "처럼 가벼운 게임을 돌리기 좋은 그래픽 구성이 보이는 후보입니다.";
            }
            if (hasDesktopHint) {
                return targetGame + " 입문용으로 볼 만한 데스크탑 후보입니다. 구매 전 RAM과 그래픽 사양을 확인해 주세요.";
            }
            return targetGame + " 플레이 조건과 관련성이 높은 상품입니다. 상세 사양 확인을 추천합니다.";
        }

        if ("MID".equals(performanceLevel)) {
            if (containsAny(normalizedTitle, "rtx 3060", "rtx3060", "rtx 2060", "rtx2060", "1660", "4060")) {
                return targetGame + " 중간 옵션용으로 볼 만한 그래픽카드가 포함된 상품입니다.";
            }
            if (hasGpu && hasMemory16) {
                return targetGame + "용으로 그래픽카드와 메모리 구성이 무난한 후보입니다.";
            }
            return targetGame + " 권장 사양과 비교해 볼 만한 후보입니다. 그래픽카드 모델을 확인해 주세요.";
        }

        if ("HIGH".equals(performanceLevel) || "EXTREME".equals(performanceLevel)) {
            if (containsAny(normalizedTitle, "rtx 4070", "rtx4070", "rtx 4080", "rtx4080", "rtx 4090", "rtx4090")) {
                return targetGame + " 고옵션 플레이를 기대할 수 있는 고성능 그래픽카드 후보입니다.";
            }
            if (containsAny(normalizedTitle, "rtx", "4060", "3070", "3080")) {
                return targetGame + " 고사양 플레이 후보로 볼 만합니다. 옵션 타협 여부를 함께 확인해 주세요.";
            }
            return targetGame + " 고사양 조건과 비교가 필요한 상품입니다. CPU와 GPU 모델 확인이 필요합니다.";
        }

        if (hasGpu) {
            return "게임용으로 볼 만한 그래픽 구성이 있는 상품입니다.";
        }

        return "요청한 게임 조건과 관련성이 높은 컴퓨터 후보입니다.";
    }

    private boolean isComputerProduct(String productType, String normalizedTitle) {
        return "desktop".equals(productType)
                || "laptop".equals(productType)
                || containsAny(normalizedTitle, "컴퓨터", "pc", "본체", "데스크탑", "노트북");
    }

    private boolean isLowestPriceLevel(RecommendedItemProjection item) {
        return item.getLowestPrice() != null
                && item.getLowestPrice() > 0
                && item.getCurrentPrice() != null
                && item.getCurrentPrice() <= Math.round(item.getLowestPrice() * 1.05);
    }

    private boolean containsAny(String value, String... keywords) {
        if (value == null || value.isBlank()) {
            return false;
        }

        for (String keyword : keywords) {
            if (value.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null) {
            return "";
        }

        return keyword
                .replace("\"", "")
                .replace("'", "")
                .trim();
    }

    private String normalizeText(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase();
    }

    private String normalizePerformanceLevel(String performanceLevel) {
        if (performanceLevel == null || performanceLevel.isBlank()) {
            return "";
        }

        String normalized = performanceLevel.trim().toUpperCase();

        return switch (normalized) {
            case "LOW", "MID", "HIGH", "EXTREME", "UNKNOWN" -> normalized;
            default -> "";
        };
    }

    private Long normalizePrice(Long price) {
        if (price == null || price <= 0) {
            return null;
        }

        return price;
    }

    private static class ItemProjectionAdapter implements RecommendedItemProjection {

        private final Item item;
        private final Integer score;

        private ItemProjectionAdapter(Item item, Integer score) {
            this.item = item;
            this.score = score == null ? 0 : score;
        }

        @Override
        public Long getItemId() {
            return item.getItemId();
        }

        @Override
        public String getTitle() {
            return item.getTitle();
        }

        @Override
        public Long getCurrentPrice() {
            return item.getCurrentPrice();
        }

        @Override
        public Long getLowestPrice() {
            return item.getLowestPrice();
        }

        @Override
        public String getCategoryName() {
            return item.getCategoryName();
        }

        @Override
        public String getThumbnailUrl() {
            return item.getThumbnailUrl();
        }

        @Override
        public String getItemUrl() {
            return item.getItemUrl();
        }

        @Override
        public Integer getScore() {
            return score;
        }
    }
}
