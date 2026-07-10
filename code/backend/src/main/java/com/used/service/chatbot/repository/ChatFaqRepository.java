package com.used.service.chatbot.repository;


import com.used.service.chatbot.entity.ChatFaq;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatFaqRepository extends JpaRepository<ChatFaq, Long> {
}
