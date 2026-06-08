package com.used.service.chatbot.repository;


import com.used.service.chatbot.entity.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {

    List<ChatHistory> findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long userId,
            LocalDateTime createdAt
    );
}

