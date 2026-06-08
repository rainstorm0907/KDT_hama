package com.used.service.chatbot.service;

import com.used.service.chatbot.entity.ChatFaq;
import com.used.service.chatbot.repository.ChatFaqRepository;
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
                || isSynonymMatched(normalizedMessage, normalizedPattern);
    }

    private boolean isSynonymMatched(String message, String pattern) {
        if (containsAny(pattern, "알림", "가격알림")) {
            return containsAny(message, "알림", "가격알림", "등록", "설정", "종");
        }

        if (containsAny(pattern, "찜", "관심")) {
            return containsAny(message, "찜", "하트", "관심", "저장")
                    && containsAny(message, "방법", "어떻게", "확인", "목록");
        }

        if (containsAny(pattern, "가격비교", "비교")) {
            return containsAny(message, "가격", "비교", "평균", "최저가", "살래말래");
        }

        if (containsAny(pattern, "검색")) {
            return containsAny(message, "검색", "찾기", "상품찾기")
                    && containsAny(message, "방법", "어떻게", "사용");
        }

        if (containsAny(pattern, "서비스", "하마", "소개")) {
            return containsAny(message, "하마", "서비스", "사이트")
                    && containsAny(message, "뭐", "소개", "설명", "기능");
        }

        return false;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) {
                return true;
            }
        }
        return false;
    }

    private String normalize(String text) {
        if (text == null) {
            return "";
        }
        return text.toLowerCase()
                .replaceAll("\\s+", "")
                .replace("?", "")
                .replace(".", "")
                .replace(",", "")
                .replace("!", "")
                .replace("~", "")
                .trim();
    }
}
