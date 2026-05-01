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
    public ChatMessageResponse handleMessage(Long userId, ChatMessageRequest request) {
        String userMessage = request.getMessage().trim();

        // 1. FAQ 우선 검색
        // 가격 알림, 찜 방법, 시세, 검색, 사이트 설명 같은 고정 질문은 Gemini 호출 없이 처리
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

        // 2. GeminiClientService 내부에서 먼저 룰 기반 분석을 하고,
        // UNKNOWN일 때만 Gemini API를 호출하도록 수정된 구조 기준
        ChatAnalysisResult analysis = geminiClientService.analyzeMessage(userMessage);

        String intent = safeIntent(analysis.getIntent());
        String keyword = safeKeyword(analysis.getKeyword());
        Long maxPrice = analysis.getMaxPrice();

        System.out.println("챗봇 분석 결과 intent = " + intent);
        System.out.println("챗봇 분석 결과 keyword = " + keyword);
        System.out.println("챗봇 분석 결과 maxPrice = " + maxPrice);

        // 3. 인사 처리
        if ("GREETING".equals(intent)) {
            String answer = "안녕하세요! 중고거래 가격 비교 서비스 하마입니다. 상품 검색, 가격 비교, 찜, 시세, 가격 알림에 대해 물어보실 수 있어요.";

            saveHistory(userId, userMessage, answer, intent, "RULE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("RULE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        // 4. 현재 등록 상품 수 안내
        if ("ITEM_COUNT".equals(intent)) {
            String answer;

            if (recommendationService.hasAvailableItems()) {
                answer = "현재 등록된 상품 데이터가 있습니다. 찾고 싶은 상품명을 입력하면 관련 상품을 추천해드릴 수 있습니다.";
            } else {
                answer = "현재 등록된 상품 데이터는 준비 중입니다. 상품 데이터가 수집되면 등록된 상품 수와 추천 결과를 안내해드릴 수 있습니다.";
            }

            saveHistory(userId, userMessage, answer, intent, "RULE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("RULE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        // 5. 찜 목록 조회 안내
        // Wishlists + Items 조회 기능을 붙이기 전까지는 준비 중 응답
        if ("WISHLIST_LIST".equals(intent)) {
            String answer = "현재 찜 목록 조회 기능은 준비 중입니다. 상품 데이터와 찜 데이터가 연결되면 찜한 상품 목록을 보여드릴 수 있습니다.";

            saveHistory(userId, userMessage, answer, intent, "RULE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("RULE")
                    .keyword(keyword)
                    .items(List.of())
                    .build();
        }

        // 6. 상품 추천
        // 예: "아이폰 추천해줘"
        // 예: "아이폰 중에 30만원 이하인 제품 찾아줘"
        if ("PRODUCT_RECOMMEND".equals(intent)) {
            if (!recommendationService.hasAvailableItems()) {
                String answer = "아직 등록된 상품 데이터가 없습니다. 상품 데이터가 수집되면 조건에 맞는 상품을 추천해드릴 수 있습니다.";

                saveHistory(userId, userMessage, answer, intent, "DB_RECOMMEND");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("DB_RECOMMEND")
                        .keyword(keyword)
                        .items(List.of())
                        .build();
            }

            List<RecommendedItemDto> items;

            if (maxPrice != null && maxPrice > 0) {
                items = recommendationService.recommendByKeywordAndMaxPrice(userId, keyword, maxPrice);
            } else {
                items = recommendationService.recommendByKeyword(userId, keyword);
            }

            String answer = makeRecommendationAnswer(keyword, maxPrice, items);

            saveHistory(userId, userMessage, answer, intent, "DB_RECOMMEND");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("DB_RECOMMEND")
                    .keyword(keyword)
                    .items(items)
                    .build();
        }

        // 7. 가격 비교
        if ("PRICE_COMPARE".equals(intent)) {
            if (!recommendationService.hasAvailableItems()) {
                String answer = "아직 등록된 상품 데이터가 없습니다. 상품 데이터가 수집되면 시세와 가격 비교 결과를 보여드릴 수 있습니다.";

                saveHistory(userId, userMessage, answer, intent, "DB_PRICE_COMPARE");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("DB_PRICE_COMPARE")
                        .keyword(keyword)
                        .items(List.of())
                        .build();
            }

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

        // 8. 가격 알림 안내
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

        // 9. 검색 도움말
        if ("SEARCH_HELP".equals(intent)) {
            String answer = "검색창에 상품명을 입력하면 여러 중고거래 플랫폼의 상품을 한곳에서 비교할 수 있습니다. 예를 들어 '아이폰 14', '갤럭시 S23', '에어팟 프로'처럼 입력하면 됩니다.";

            saveHistory(userId, userMessage, answer, intent, "GUIDE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("GUIDE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        // 10. 기본 응답
        // 여기서 Gemini를 다시 호출하지 않음
        String defaultAnswer = """
                아직 그 질문은 정확히 이해하지 못했어요.
                하마에서는 상품 검색, 가격 비교, 찜, 시세, 가격 알림 관련 질문을 도와드릴 수 있습니다.
                예를 들어 '아이폰 13 저렴한 상품 찾아줘', '찜 하는 방법 알려줘', '가격 알림은 어떻게 설정해?'처럼 물어보실 수 있어요.
                """;

        saveHistory(userId, userMessage, defaultAnswer, intent, "DEFAULT");

        return ChatMessageResponse.builder()
                .answer(defaultAnswer)
                .intent(intent)
                .responseType("DEFAULT")
                .keyword(keyword)
                .items(List.of())
                .build();
    }

    private String makeRecommendationAnswer(
            String keyword,
            Long maxPrice,
            List<RecommendedItemDto> items
    ) {
        if (keyword == null || keyword.isBlank()) {
            return "추천할 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 13 추천해줘'처럼 물어보실 수 있습니다.";
        }

        if (items.isEmpty()) {
            if (maxPrice != null && maxPrice > 0) {
                return "'" + keyword + "' 관련 상품 중 "
                        + String.format("%,d", maxPrice)
                        + "원 이하 조건에 맞는 상품을 찾지 못했습니다. 상품 데이터가 아직 없거나 조건에 맞는 상품이 없을 수 있습니다.";
            }

            return "'" + keyword + "' 관련 추천 상품을 찾지 못했습니다. 상품 데이터가 아직 없거나 검색어가 너무 넓을 수 있습니다.";
        }

        if (maxPrice != null && maxPrice > 0) {
            return "'" + keyword + "' 관련 상품 중 "
                    + String.format("%,d", maxPrice)
                    + "원 이하 상품을 가격이 낮은 순서로 정리했습니다.";
        }

        return "'" + keyword + "' 관련 상품 중 가격, 선호도, 최신성을 기준으로 추천 상품을 정리했습니다.";
    }

    private String makePriceCompareAnswer(String keyword, List<RecommendedItemDto> items) {
        if (keyword == null || keyword.isBlank()) {
            return "시세를 확인할 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 14 시세 알려줘'처럼 물어보실 수 있습니다.";
        }

        if (items.isEmpty()) {
            return "'" + keyword + "' 관련 시세 비교 대상 상품을 찾지 못했습니다. 상품 데이터가 수집되면 가격 비교 결과를 보여드릴 수 있습니다.";
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