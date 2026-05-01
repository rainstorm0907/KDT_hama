package com.example.ffff.chatbot.service;


import com.example.ffff.chatbot.entity.ChatFaq;
import com.example.ffff.chatbot.repository.ChatFaqRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FaqService {

    private final ChatFaqRepository chatFaqRepository;

    public Optional<String> findAnswer(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return Optional.empty();
        }

        String normalizedMessage = normalize(userMessage);
        List<ChatFaq> faqs = chatFaqRepository.findAll();

        return faqs.stream()
                .filter(faq -> isMatched(normalizedMessage, faq.getQuestionPattern()))
                .max(Comparator.comparingInt(faq -> normalize(faq.getQuestionPattern()).length()))
                .map(ChatFaq::getAnswerText);
    }

    private boolean isMatched(String normalizedMessage, String pattern) {
        if (pattern == null || pattern.isBlank()) {
            return false;
        }

        String normalizedPattern = normalize(pattern);

        return normalizedMessage.contains(normalizedPattern)
                || normalizedPattern.contains(normalizedMessage)
                || containsKeyword(normalizedMessage, normalizedPattern);
    }

    private boolean containsKeyword(String message, String pattern) {
        String[] keywords = pattern.split("\\s+");

        for (String keyword : keywords) {
            if (keyword.length() >= 2 && message.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }

        return text
                .toLowerCase()
                .replaceAll("\\s+", "")
                .replace("?", "")
                .replace(".", "")
                .replace(",", "")
                .replace("!", "")
                .trim();
    }
}