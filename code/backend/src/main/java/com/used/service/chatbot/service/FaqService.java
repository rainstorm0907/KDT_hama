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

        // 1. 湲곕낯 ?ы븿 留ㅼ묶
        if (normalizedMessage.contains(normalizedPattern)
                || normalizedPattern.contains(normalizedMessage)) {
            return true;
        }

        // 2. FAQ ?⑦꽩蹂??숈쓽???좎궗 ?쒗쁽 留ㅼ묶
        return isSynonymMatched(normalizedMessage, normalizedPattern);
    }

    private boolean isSynonymMatched(String message, String pattern) {
        // 媛寃??뚮┝
        if (pattern.equals("媛寃⑹븣由?)
                || pattern.equals("?뚮┝")
                || pattern.equals("紐⑺몴媛寃?)
                || pattern.equals("?щ쭩媛寃?)) {
            return containsAny(message,
                    "媛寃⑹븣由?,
                    "?뚮┝?ㅼ젙",
                    "紐⑺몴媛寃?,
                    "?щ쭩媛寃?,
                    "媛寃⑸궡?ㅺ?硫?,
                    "?대젮媛硫댁븣由?,
                    "?뚮젮以?
            );
        }

        // 李??ъ슜踰?
        if (pattern.equals("李?)
                || pattern.equals("李쒗븯?붾갑踰?)
                || pattern.equals("李쒕갑踰?)
                || pattern.equals("愿?ъ긽??)) {
            return containsAny(message, "李?, "愿?ъ긽??, "愿??, "???)
                    && containsAny(message, "諛⑸쾿", "?대뼸寃?, "?ъ슜踰?, "?섎뒗踰?, "?댁?", "?깅줉");
        }

        // ?쒖꽭
        if (pattern.equals("?쒖꽭")
                || pattern.equals("媛寃⑸???)
                || pattern.equals("媛寃⑷린濡?)) {
            return containsAny(message,
                    "?쒖꽭",
                    "媛寃⑸???,
                    "媛寃⑷린濡?,
                    "媛寃⑹텛??,
                    "媛寃⑺쓲由?,
                    "?쇰쭏?뺣룄",
                    "媛寃⑸?"
            );
        }

        // 寃??
        if (pattern.equals("寃??)
                || pattern.equals("寃?됰갑踰?)
                || pattern.equals("?곹뭹寃??)) {
            return containsAny(message, "寃??, "李얜뒗踰?, "李얠븘", "議고쉶")
                    && containsAny(message, "諛⑸쾿", "?대뼸寃?, "?섎뒗踰?, "?댁?", "?ъ슜");
        }

        // ?ъ씠???ㅻ챸
        if (pattern.equals("臾댁뒯?ъ씠??)
                || pattern.equals("?ъ씠?몄꽕紐?)
                || pattern.equals("?댁궗?댄듃")
                || pattern.equals("?쒕퉬?ㅼ꽕紐?)
                || pattern.equals("?섎쭏")) {
            return containsAny(message, "?ъ씠??, "?쒕퉬??, "?섎쭏")
                    && containsAny(message, "?ㅻ챸", "?뚭컻", "萸?, "臾댁뾿", "?대뼡", "?뚮젮", "??댁꽌");
        }

        // 媛寃?鍮꾧탳
        if (pattern.equals("媛寃⑸퉬援?)
                || pattern.equals("鍮꾧탳")) {
            return containsAny(message, "媛寃⑸퉬援?, "鍮꾧탳", "?붿떬", "??댄븳", "理쒖?媛");
        }

        // ?곹뭹 異붿쿇
        if (pattern.equals("?곹뭹異붿쿇")
                || pattern.equals("異붿쿇")) {
            return containsAny(message, "異붿쿇", "怨⑤씪", "愿쒖갖?", "媛?깅퉬", "??댄븳", "??);
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
