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

        // 1. 기본 포함 매칭
        if (normalizedMessage.contains(normalizedPattern)
                || normalizedPattern.contains(normalizedMessage)) {
            return true;
        }

        // 2. FAQ 패턴별 동의어/유사 표현 매칭
        return isSynonymMatched(normalizedMessage, normalizedPattern);
    }

    private boolean isSynonymMatched(String message, String pattern) {
        // 가격 알림
        if (pattern.equals("가격알림")
                || pattern.equals("알림")
                || pattern.equals("목표가격")
                || pattern.equals("희망가격")) {
            return containsAny(message,
                    "가격알림",
                    "알림설정",
                    "목표가격",
                    "희망가격",
                    "가격내려가면",
                    "내려가면알림",
                    "알려줘"
            );
        }

        // 찜 사용법
        if (pattern.equals("찜")
                || pattern.equals("찜하는방법")
                || pattern.equals("찜방법")
                || pattern.equals("관심상품")) {
            return containsAny(message, "찜", "관심상품", "관심", "저장")
                    && containsAny(message, "방법", "어떻게", "사용법", "하는법", "어케", "등록");
        }

        // 시세
        if (pattern.equals("시세")
                || pattern.equals("가격변동")
                || pattern.equals("가격기록")) {
            return containsAny(message,
                    "시세",
                    "가격변동",
                    "가격기록",
                    "가격추이",
                    "가격흐름",
                    "얼마정도",
                    "가격대"
            );
        }

        // 검색
        if (pattern.equals("검색")
                || pattern.equals("검색방법")
                || pattern.equals("상품검색")) {
            return containsAny(message, "검색", "찾는법", "찾아", "조회")
                    && containsAny(message, "방법", "어떻게", "하는법", "어케", "사용");
        }

        // 사이트 설명
        if (pattern.equals("무슨사이트")
                || pattern.equals("사이트설명")
                || pattern.equals("이사이트")
                || pattern.equals("서비스설명")
                || pattern.equals("하마")) {
            return containsAny(message, "사이트", "서비스", "하마")
                    && containsAny(message, "설명", "소개", "뭐", "무엇", "어떤", "알려", "대해서");
        }

        // 가격 비교
        if (pattern.equals("가격비교")
                || pattern.equals("비교")) {
            return containsAny(message, "가격비교", "비교", "더싼", "저렴한", "최저가");
        }

        // 상품 추천
        if (pattern.equals("상품추천")
                || pattern.equals("추천")) {
            return containsAny(message, "추천", "골라", "괜찮은", "가성비", "저렴한", "싼");
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

        return text
                .toLowerCase()
                .replaceAll("\\s+", "")
                .replace("?", "")
                .replace(".", "")
                .replace(",", "")
                .replace("!", "")
                .replace("~", "")
                .trim();
    }
}