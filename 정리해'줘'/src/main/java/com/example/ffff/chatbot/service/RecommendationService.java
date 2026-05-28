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
                .map(this::toDto)
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
        return itemRepository.countByIsDeleted("N");
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
        return RecommendedItemDto.builder()
                .itemId(item.getItemId())
                .title(item.getTitle())
                .currentPrice(item.getCurrentPrice())
                .lowestPrice(item.getLowestPrice())
                .categoryName(item.getCategoryName())
                .thumbnailUrl(item.getThumbnailUrl())
                .itemUrl(item.getItemUrl())
                .score(item.getScore())
                .recommendReason(makeReason(item))
                .build();
    }

    private String makeReason(RecommendedItemProjection item) {
        if (item.getLowestPrice() != null
                && item.getLowestPrice() > 0
                && item.getCurrentPrice() != null
                && item.getCurrentPrice() <= item.getLowestPrice() * 1.05) {
            return "역대 최저가에 가까운 가격의 상품입니다.";
        }

        if (item.getScore() != null && item.getScore() >= 100) {
            return "검색어, 선호 태그, 가격 조건이 잘 맞는 상품입니다.";
        }

        return "검색어와 관련성이 높은 상품입니다.";
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