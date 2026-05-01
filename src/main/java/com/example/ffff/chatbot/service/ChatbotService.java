package com.example.ffff.chatbot.service;


import com.example.ffff.chatbot.dto.ChatAnalysisResult;
import com.example.ffff.chatbot.dto.ChatMessageRequest;
import com.example.ffff.chatbot.dto.ChatMessageResponse;
import com.example.ffff.chatbot.dto.RecommendedItemDto;
import com.example.ffff.chatbot.entity.ChatHistory;
import com.example.ffff.chatbot.repository.ChatHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final FaqService faqService;
    private final GeminiClientService geminiClientService;
    private final RecommendationService recommendationService;
    private final ChatHistoryRepository chatHistoryRepository;

    @Transactional
    public ChatMessageResponse handleMessage(ChatMessageRequest request) {
        Long userId = request.getUserId();
        String userMessage = request.getMessage().trim();

        var faqAnswer = faqService.findAnswer(userMessage);

        if (faqAnswer.isPresent()) {
            String answer = faqAnswer.get();

            saveHistory(userId, userMessage, answer, "FAQ", "FAQ");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent("FAQ")
                    .responseType("FAQ")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        ChatAnalysisResult analysis = geminiClientService.analyzeMessage(userMessage);

        String intent = safeIntent(analysis.getIntent());
        String keyword = safeKeyword(analysis.getKeyword());

        if ("PRODUCT_RECOMMEND".equals(intent)) {
            List<RecommendedItemDto> items =
                    recommendationService.recommendByKeyword(userId, keyword);

            String answer = makeRecommendationAnswer(keyword, items);

            saveHistory(userId, userMessage, answer, intent, "DB_RECOMMEND");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("DB_RECOMMEND")
                    .keyword(keyword)
                    .items(items)
                    .build();
        }

        if ("PRICE_COMPARE".equals(intent)) {
            List<RecommendedItemDto> items =
                    recommendationService.recommendByKeyword(userId, keyword);

            String answer = makePriceCompareAnswer(keyword, items);

            saveHistory(userId, userMessage, answer, intent, "DB_PRICE_COMPARE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("DB_PRICE_COMPARE")
                    .keyword(keyword)
                    .items(items)
                    .build();
        }

        if ("PRICE_ALERT_GUIDE".equals(intent)) {
            String answer = """
                    가격 알림은 상품을 찜한 뒤 목표 가격을 설정하면 사용할 수 있습니다.
                    해당 상품의 현재 가격이 목표 가격 이하로 내려가면 알림 대상으로 처리할 수 있습니다.
                    """;

            saveHistory(userId, userMessage, answer, intent, "GUIDE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("GUIDE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        String aiAnswer = geminiClientService.generateGeneralAnswer(userMessage);

        saveHistory(userId, userMessage, aiAnswer, intent, "AI");

        return ChatMessageResponse.builder()
                .answer(aiAnswer)
                .intent(intent)
                .responseType("AI")
                .keyword(keyword)
                .items(List.of())
                .build();
    }

    private String makeRecommendationAnswer(String keyword, List<RecommendedItemDto> items) {
        if (items.isEmpty()) {
            return "'" + keyword + "' 관련 추천 상품을 찾지 못했습니다. 검색어를 조금 더 구체적으로 입력해 주세요.";
        }

        return "'" + keyword + "' 관련 상품 중 가격, 선호도, 최신성을 기준으로 추천 상품을 정리했습니다.";
    }

    private String makePriceCompareAnswer(String keyword, List<RecommendedItemDto> items) {
        if (items.isEmpty()) {
            return "'" + keyword + "' 관련 시세 비교 대상 상품을 찾지 못했습니다.";
        }

        Long minPrice = items.stream()
                .map(RecommendedItemDto::getCurrentPrice)
                .filter(price -> price != null && price > 0)
                .min(Long::compareTo)
                .orElse(null);

        Long maxPrice = items.stream()
                .map(RecommendedItemDto::getCurrentPrice)
                .filter(price -> price != null && price > 0)
                .max(Long::compareTo)
                .orElse(null);

        if (minPrice == null || maxPrice == null) {
            return "'" + keyword + "' 관련 상품을 찾았습니다. 가격 정보가 있는 상품 위주로 확인해 주세요.";
        }

        return "'" + keyword + "' 관련 상품의 현재 가격대는 약 "
                + String.format("%,d", minPrice)
                + "원 ~ "
                + String.format("%,d", maxPrice)
                + "원입니다. 아래 상품들을 기준으로 비교해 보세요.";
    }

    private void saveHistory(
            Long userId,
            String userMessage,
            String botResponse,
            String intent,
            String responseType
    ) {
        ChatHistory history = new ChatHistory();
        history.setUserId(userId);
        history.setUserMessage(userMessage);
        history.setBotResponse(botResponse);
        history.setIntent(intent);
        history.setResponseType(responseType);

        chatHistoryRepository.save(history);
    }

    private String safeIntent(String intent) {
        if (intent == null || intent.isBlank()) {
            return "UNKNOWN";
        }

        return intent.trim().toUpperCase();
    }

    private String safeKeyword(String keyword) {
        if (keyword == null) {
            return "";
        }

        return keyword.trim();
    }
}