package com.used.service.chatbot.repository;

import com.used.service.chatbot.entity.RecommendedItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendedItemRepository extends JpaRepository<RecommendedItem, Long> {

    boolean existsByUserIdAndItemIdAndRecommendType(
            Long userId,
            Long itemId,
            String recommendType
    );
}
