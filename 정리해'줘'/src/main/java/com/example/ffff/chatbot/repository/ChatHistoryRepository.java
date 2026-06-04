package com.example.ffff.chatbot.repository;


import com.example.ffff.chatbot.entity.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {

    List<ChatHistory> findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(
            Long userId,
            LocalDateTime createdAt
    );
}
