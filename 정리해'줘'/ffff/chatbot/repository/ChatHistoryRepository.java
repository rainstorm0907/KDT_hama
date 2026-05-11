package com.example.ffff.chatbot.repository;


import com.example.ffff.chatbot.entity.ChatHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatHistoryRepository extends JpaRepository<ChatHistory, Long> {
}