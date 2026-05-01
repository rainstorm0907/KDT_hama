package com.example.ffff.chatbot.service;


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

    private final ItemRepository itemRepository;
    private final RecommendedItemRepository recommendedItemRepository;

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

    private void saveRecommendedItems(Long userId, List<RecommendedItemProjection> results) {
        for (RecommendedItemProjection item : results) {
            RecommendedItem recommendedItem = new RecommendedItem();
            recommendedItem.setUserId(userId);
            recommendedItem.setItemId(item.getItemId());
            recommendedItem.setScore(item.getScore());
            recommendedItem.setRecommendType("CHATBOT_RECOMMEND");

            try {
                recommendedItemRepository.save(recommendedItem);
            } catch (Exception ignored) {
                // 중복 추천 저장 등은 1차 MVP에서는 무시
            }
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
}