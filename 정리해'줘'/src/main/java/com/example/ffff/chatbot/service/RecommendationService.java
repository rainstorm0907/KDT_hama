package com.example.ffff.chatbot.service;

import com.example.ffff.chatbot.dto.ChatAnalysisResult;
import com.example.ffff.chatbot.dto.RecommendedItemDto;
import com.example.ffff.chatbot.entity.RecommendedItem;
import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.chatbot.repository.RecommendedItemRepository;
import com.example.ffff.chatbot.repository.projection.RecommendedItemProjection;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecommendationService {

    private static final String RECOMMEND_TYPE_CHATBOT = "CHATBOT_RECOMMEND";

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
        String productType = normalizeText(analysis.getProductType());
        String useCase = normalizeText(analysis.getUseCase());
        String performanceLevel = normalizePerformanceLevel(analysis.getPerformanceLevel());

        if (keyword.isBlank()) {
            return List.of();
        }

        System.out.println("[추천 검색 조건] "
                + "keyword=" + keyword
                + ", minPrice=" + minPrice
                + ", maxPrice=" + maxPrice
                + ", productType=" + productType
                + ", useCase=" + useCase
                + ", performanceLevel=" + performanceLevel);

        List<RecommendedItemProjection> results =
                itemRepository.findItemsByCondition(
                        keyword,
                        minPrice,
                        maxPrice,
                        productType,
                        useCase,
                        performanceLevel,
                        10
                );

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

        List<RecommendedItemProjection> results =
                itemRepository.findRecommendedItems(userId, safeKeyword, 10);

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

        List<RecommendedItemProjection> results =
                itemRepository.findItemsByKeywordAndMaxPrice(safeKeyword, maxPrice, 10);

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
        return itemRepository.countBySaleStatus("ON_SALE");
    }

    @Transactional
    public List<RecommendedItemDto> recommendPersonalized(Long userId) {
        if (userId == null) {
            return List.of();
        }

        List<RecommendedItemProjection> results =
                itemRepository.findPersonalRecommendedItems(userId, 10);

        saveRecommendedItems(userId, results);

        return results.stream()
                .map(this::toDto)
                .toList();
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
            return "현재가가 기록된 최저가 수준이라 가격 메리트가 큰 상품입니다.";
        }

        if (item.getScore() != null && item.getScore() >= 100) {
            return "검색어, 선호 태그, 가격 조건이 잘 맞는 상품입니다.";
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
        boolean hasGpu = containsAny(normalizedTitle, "rtx", "gtx", "rx ", "그래픽", "그래픽카드");
        boolean hasMemory16 = containsAny(normalizedTitle, "16g", "16gb", "32g", "32gb");
        boolean hasDesktopHint = containsAny(normalizedTitle, "본체", "데스크탑", "pc", "컴퓨터");

        if ("LOW".equals(performanceLevel)) {
            if (hasGpu && hasMemory16) {
                return targetGame + "용으로 충분한 그래픽 성능과 16GB급 메모리를 기대할 수 있는 상품입니다.";
            }
            if (hasGpu) {
                return targetGame + "처럼 가벼운 게임을 돌리기 좋은 외장 그래픽 탑재 후보입니다.";
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
            return targetGame + " 권장 사양과 비교해볼 만한 후보입니다. 그래픽카드 모델을 확인해 주세요.";
        }

        if ("HIGH".equals(performanceLevel) || "EXTREME".equals(performanceLevel)) {
            if (containsAny(normalizedTitle, "rtx 4070", "rtx4070", "rtx 4080", "rtx4080", "rtx 4090", "rtx4090")) {
                return targetGame + " 고옵션 플레이를 기대할 수 있는 고성능 그래픽카드 후보입니다.";
            }
            if (containsAny(normalizedTitle, "rtx", "4060", "3070", "3080")) {
                return targetGame + " 고사양 플레이 후보로 볼 만합니다. 옵션 타협 여부를 함께 확인해 주세요.";
            }
            return targetGame + " 고사양 조건과 비교가 필요한 상품입니다. CPU와 GPU 세부 모델 확인이 필요합니다.";
        }

        if (hasGpu) {
            return "게임용으로 볼 만한 외장 그래픽 탑재 상품입니다.";
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
                && item.getCurrentPrice() <= item.getLowestPrice() * 1.05;
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
}
