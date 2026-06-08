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
    private final SearchLogService searchLogService;
    private final PriceAdviceService priceAdviceService;
    private final GameSpecGuideService gameSpecGuideService;
    private final PersonalProductContextService personalProductContextService;
    private final ChatbotTemplateService chatbotTemplateService;

    @Transactional
    public ChatMessageResponse handleMessage(Long userId, ChatMessageRequest request) {
        String userMessage = request.getMessage().trim();

        if (personalProductContextService.supports(userMessage)) {
            ChatMessageResponse response =
                    personalProductContextService.handle(userId, userMessage);

            logUserMessage(userMessage);
            logBotAnswer(response.getAnswer());
            saveHistory(userId, userMessage, response.getAnswer(), response.getIntent(), response.getResponseType());

            return response;
        }

        var templateAnswer = chatbotTemplateService.findAnswer(userMessage);

        if (templateAnswer.isPresent()) {
            ChatbotTemplateService.TemplateAnswer template = templateAnswer.get();
            String answer = template.getAnswer();

            System.out.println("1. 제미나이 분석 필요: N");
            System.out.println("2. 제미나이 호출 여부: N");

            logAnalysis(template.getIntent(), "", null, null, null, null, null, null);
            logUserMessage(userMessage);
            logBotAnswer(answer);

            saveHistory(userId, userMessage, answer, template.getIntent(), template.getResponseType());

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(template.getIntent())
                    .responseType(template.getResponseType())
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        var faqAnswer = faqService.findAnswer(userMessage);

        if (isLaunchPriceQuestion(userMessage)) {
            String answer = """
                    현재 하마는 중고거래 매물의 현재가, 유사 상품 평균가, 거래완료 평균가를 중심으로 비교합니다.
                    제조사 출시가나 정가는 별도 공식 데이터가 없어 정확히 안내하기 어렵습니다.
                    대신 지금 등록된 중고 매물 기준으로 가격이 적절한지는 비교해드릴 수 있습니다.
                    """;

            logUserMessage(userMessage);
            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, "PRICE_INFO_LIMIT", "GUIDE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent("PRICE_INFO_LIMIT")
                    .responseType("GUIDE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        if (isPriceAdviceQuestion(userMessage)) {
            String answer = priceAdviceService.makePriceAdvice(request.getItemId());

            logUserMessage(userMessage);
            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, "PRICE_ADVICE", "DB_PRICE_ADVICE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent("PRICE_ADVICE")
                    .responseType("DB_PRICE_ADVICE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        if (faqAnswer.isPresent()) {
            String answer = faqAnswer.get();

            System.out.println("1. 제미나이 분석 필요: N");
            System.out.println("2. 제미나이 호출 여부: N");

            logAnalysis("FAQ", "", null, null, null, null, null, null);
            logUserMessage(userMessage);
            logBotAnswer(answer);

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

        String gameName = resolveGameName(userMessage, analysis.getGameName());
        String performanceLevel = analysis.getPerformanceLevel();

        logAnalysis(
                intent,
                keyword,
                analysis.getMinPrice(),
                analysis.getMaxPrice(),
                analysis.getProductType(),
                analysis.getUseCase(),
                gameName,
                performanceLevel
        );

        logUserMessage(userMessage);

        if ("GREETING".equals(intent)) {
            String answer = "안녕하세요! 중고거래 가격 비교 서비스 하마입니다. 상품 검색, 가격 비교, 찜, 시세, 가격 알림에 대해 물어보실 수 있어요.";

            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, intent, "RULE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("RULE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        if ("ITEM_COUNT".equals(intent)) {
            long count = recommendationService.countAvailableItems();

            String answer = count > 0
                    ? "현재 등록된 상품은 총 " + count + "개입니다. 찾고 싶은 상품명을 입력하면 관련 상품을 추천해드릴 수 있습니다."
                    : "현재 등록된 상품 데이터는 준비 중입니다. 상품 데이터가 수집되면 추천 결과를 안내해드릴 수 있습니다.";

            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, intent, "RULE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("RULE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        if ("WISHLIST_LIST".equals(intent)) {
            String answer = "현재 찜 목록 조회 기능은 준비 중입니다. 상품 데이터와 찜 데이터가 연결되면 찜한 상품 목록을 보여드릴 수 있습니다.";

            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, intent, "RULE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("RULE")
                    .keyword(keyword)
                    .items(List.of())
                    .build();
        }

        if ("PERSONAL_RECOMMEND".equals(intent)) {
            if (!recommendationService.hasAvailableItems()) {
                String answer = "아직 등록된 상품 데이터가 없습니다. 상품 데이터가 수집되면 검색 기록과 클릭 기록을 바탕으로 맞춤 상품을 추천해드릴 수 있습니다.";

                logBotAnswer(answer);
                saveHistory(userId, userMessage, answer, intent, "DB_PERSONAL_RECOMMEND");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("DB_PERSONAL_RECOMMEND")
                        .keyword("")
                        .items(List.of())
                        .build();
            }

            List<RecommendedItemDto> items =
                    recommendationService.recommendPersonalized(userId);

            String answer = items.isEmpty()
                    ? "아직 맞춤 추천에 사용할 검색 기록이나 클릭 기록이 부족합니다. 관심 있는 상품을 검색하거나 상품을 확인하면 더 정확한 추천을 받을 수 있습니다."
                    : "최근 검색 기록과 확인한 상품을 바탕으로 맞춤 상품을 추천해드릴게요.";

            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, intent, "DB_PERSONAL_RECOMMEND");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("DB_PERSONAL_RECOMMEND")
                    .keyword("")
                    .items(items)
                    .build();
        }

        if ("PRODUCT_RECOMMEND".equals(intent)) {
            if (keyword == null || keyword.isBlank()) {
                String answer = "찾고 싶은 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 13 보여줘', '아이폰 중에 30만원 이하 상품 보여줘'처럼 물어보실 수 있습니다.";

                logBotAnswer(answer);
                saveHistory(userId, userMessage, answer, intent, "GUIDE");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("GUIDE")
                        .keyword("")
                        .items(List.of())
                        .build();
            }

            searchLogService.saveSearchKeyword(userId, keyword);

            if (!recommendationService.hasAvailableItems()) {
                String answer = "아직 등록된 상품 데이터가 없습니다. 상품 데이터가 수집되면 조건에 맞는 상품을 추천해드릴 수 있습니다.";

                logBotAnswer(answer);
                saveHistory(userId, userMessage, answer, intent, "DB_RECOMMEND");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("DB_RECOMMEND")
                        .keyword(keyword)
                        .items(List.of())
                        .build();
            }

            List<RecommendedItemDto> items =
                    recommendationService.recommendByAnalysisResult(userId, analysis);

            /*
             * 중요:
             * 여기서 Gemini를 다시 호출하지 않는다.
             * analyzeMessage() 단계에서 이미 Gemini 분석이 끝났기 때문에,
             * 검색 결과가 없다고 다시 analyzeMessageWithGemini()를 호출하면
             * keyword가 빈 값으로 덮이거나 조건이 흔들릴 수 있다.
             */

            String answer = makeRecommendationAnswer(
                    keyword,
                    analysis.getMinPrice(),
                    analysis.getMaxPrice(),
                    analysis.getUseCase(),
                    gameName,
                    performanceLevel,
                    items
            );

            logBotAnswer(answer);
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
            if (keyword == null || keyword.isBlank()) {
                String answer = "시세를 확인할 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 14 시세 알려줘'처럼 물어보실 수 있습니다.";

                logBotAnswer(answer);
                saveHistory(userId, userMessage, answer, intent, "GUIDE");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("GUIDE")
                        .keyword("")
                        .items(List.of())
                        .build();
            }

            if (!recommendationService.hasAvailableItems()) {
                String answer = "아직 등록된 상품 데이터가 없습니다. 상품 데이터가 수집되면 시세와 가격 비교 결과를 보여드릴 수 있습니다.";

                logBotAnswer(answer);
                saveHistory(userId, userMessage, answer, intent, "DB_PRICE_COMPARE");

                return ChatMessageResponse.builder()
                        .answer(answer)
                        .intent(intent)
                        .responseType("DB_PRICE_COMPARE")
                        .keyword(keyword)
                        .items(List.of())
                        .build();
            }

            searchLogService.saveSearchKeyword(userId, keyword);

            List<RecommendedItemDto> items =
                    recommendationService.recommendByAnalysisResult(userId, analysis);

            String answer = makePriceCompareAnswer(keyword, items);

            logBotAnswer(answer);
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

            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, intent, "GUIDE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("GUIDE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        if ("SEARCH_HELP".equals(intent)) {
            String answer = "검색창에 상품명을 입력하면 여러 중고거래 플랫폼의 상품을 한곳에서 비교할 수 있습니다. 예를 들어 '아이폰 14', '갤럭시 S23', '에어팟 프로'처럼 입력하면 됩니다.";

            logBotAnswer(answer);
            saveHistory(userId, userMessage, answer, intent, "GUIDE");

            return ChatMessageResponse.builder()
                    .answer(answer)
                    .intent(intent)
                    .responseType("GUIDE")
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        String defaultAnswer = """
                아직 그 질문은 정확히 이해하지 못했어요.
                하마에서는 상품 검색, 가격 비교, 찜, 시세, 가격 알림 관련 질문을 도와드릴 수 있습니다.
                예를 들어 '아이폰 13 저렴한 상품 찾아줘', '찜 하는 방법 알려줘', '가격 알림은 어떻게 설정해?'처럼 물어보실 수 있어요.
                """;

        logBotAnswer(defaultAnswer);
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
            Long minPrice,
            Long maxPrice,
            String useCase,
            String gameName,
            String performanceLevel,
            List<RecommendedItemDto> items
    ) {
        if (keyword == null || keyword.isBlank()) {
            return "찾고 싶은 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 13 보여줘', '배그 가능한 컴퓨터 보여줘'처럼 물어보실 수 있습니다.";
        }

        boolean isGaming = "gaming".equalsIgnoreCase(useCase);
        boolean isStudent = "student".equalsIgnoreCase(useCase);

        if (items.isEmpty()) {
            if (isGaming) {
                return "'" + keyword + "' 관련 상품 중 "
                        + normalizeGameLabel(gameName)
                        + " 플레이 후보를 "
                        + performanceLevelToKorean(performanceLevel)
                        + " 기준으로 찾지 못했습니다. 현재 상품 제목에 사양 정보가 부족하거나 조건에 맞는 상품이 없을 수 있습니다.";
            }

            if (isStudent) {
                return "'" + keyword + "' 관련 상품 중 학생용으로 추천할 만한 상품을 찾지 못했습니다. 상품 데이터가 아직 부족하거나 조건에 맞는 상품이 없을 수 있습니다.";
            }

            if (minPrice != null && maxPrice != null) {
                return "'" + keyword + "' 관련 상품 중 "
                        + String.format("%,d", minPrice)
                        + "원 이상 "
                        + String.format("%,d", maxPrice)
                        + "원 이하 조건에 맞는 상품을 찾지 못했습니다.";
            }

            if (maxPrice != null && maxPrice > 0) {
                return "'" + keyword + "' 관련 상품 중 "
                        + String.format("%,d", maxPrice)
                        + "원 이하 조건에 맞는 상품을 찾지 못했습니다.";
            }

            return "조건에 맞는 추천 상품을 찾지 못했습니다. 상품명이 아직 수집되지 않았거나 검색 범위가 너무 넓을 수 있습니다.";
        }

        if (isGaming) {
            String specGuide = gameSpecGuideService.makeGuide(gameName, performanceLevel);

            if (specGuide != null && !specGuide.isBlank()) {
                return specGuide + "\n\n"
                        + "아래는 "
                        + normalizeGameLabel(gameName)
                        + " 플레이용으로 볼 만한 중고 "
                        + keyword
                        + " 후보입니다.";
            }

            return "'" + keyword + "' 관련 상품 중 "
                    + normalizeGameLabel(gameName)
                    + " 플레이 후보를 "
                    + performanceLevelToKorean(performanceLevel)
                    + " 기준으로 정리했습니다.";
        }

        if (isStudent) {
            return "'" + keyword + "' 관련 상품 중 학생용으로 쓰기 적당한 후보를 가격과 추천 기준으로 정리했습니다.";
        }

        if (minPrice != null && maxPrice != null) {
            return "'" + keyword + "' 관련 상품 중 "
                    + String.format("%,d", minPrice)
                    + "원 이상 "
                    + String.format("%,d", maxPrice)
                    + "원 이하 상품을 추천순으로 정리했습니다.";
        }

        if (maxPrice != null && maxPrice > 0) {
            return "'" + keyword + "' 관련 상품 중 "
                    + String.format("%,d", maxPrice)
                    + "원 이하 상품을 가격과 추천 기준으로 정리했습니다.";
        }

        return "'" + keyword + "' 관련 상품 중 가격, 선호도, 최신성을 기준으로 추천 상품을 정리했습니다.";
    }

    private String makePriceCompareAnswer(String keyword, List<RecommendedItemDto> items) {
        if (keyword == null || keyword.isBlank()) {
            return "시세를 확인할 상품명을 함께 입력해 주세요. 예를 들어 '아이폰 14 시세 알려줘'처럼 물어보실 수 있습니다.";
        }

        if (items.isEmpty()) {
            return "시세 비교 대상 상품을 찾지 못했습니다. 상품명이 아직 수집되지 않았거나 검색 범위가 너무 넓을 수 있습니다.";
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

    private String normalizeGameLabel(String gameName) {
        if (gameName == null || gameName.isBlank()) {
            return "게임";
        }

        return gameName;
    }

    private String performanceLevelToKorean(String performanceLevel) {
        if (performanceLevel == null || performanceLevel.isBlank()) {
            return "게임용";
        }

        return switch (performanceLevel.toUpperCase()) {
            case "LOW" -> "낮은 사양";
            case "MID" -> "중간 사양";
            case "HIGH" -> "높은 사양";
            case "VERY_HIGH" -> "고사양";
            case "ULTRA" -> "상급 사양";
            case "EXTREME" -> "최상급 사양";
            default -> "게임용";
        };
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

        try {
            chatHistoryRepository.save(history);
        } catch (RuntimeException exception) {
            System.err.println("[chatbot] failed to save chat history: " + exception.getMessage());
        }
    }

    private void logAnalysis(
            String intent,
            String keyword,
            Long minPrice,
            Long maxPrice,
            String productType,
            String useCase,
            String gameName,
            String performanceLevel
    ) {
        System.out.println("3. 챗봇 분석 결과: "
                + "intent=" + intent
                + ", keyword=" + keyword
                + ", minPrice=" + minPrice
                + ", maxPrice=" + maxPrice
                + ", productType=" + productType
                + ", useCase=" + useCase
                + ", gameName=" + gameName
                + ", performanceLevel=" + performanceLevel);
    }

    private void logUserMessage(String userMessage) {
        System.out.println("4. 사용자 채팅: " + userMessage);
    }

    private void logBotAnswer(String answer) {
        System.out.println("5. 챗봇 답변: " + answer.replaceAll("\\s+", " ").trim());
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

    private String resolveGameName(String userMessage, String analyzedGameName) {
        if (analyzedGameName != null && !analyzedGameName.isBlank()) {
            return analyzedGameName.trim();
        }

        if (userMessage == null || userMessage.isBlank()) {
            return null;
        }

        String normalized = userMessage
                .replaceAll("\\s+", "")
                .toLowerCase();

        if (normalized.contains("래프트")
                || normalized.contains("raft")) {
            return "래프트";
        }

        if (normalized.contains("배그")
                || normalized.contains("배틀그라운드")
                || normalized.contains("pubg")) {
            return "배그";
        }

        if (normalized.contains("러스트")
                || normalized.contains("rust")) {
            return "러스트";
        }

        if (normalized.contains("롤")
                || normalized.contains("리그오브레전드")
                || normalized.contains("lol")) {
            return "롤";
        }

        if (normalized.contains("오버워치")
                || normalized.contains("overwatch")) {
            return "오버워치";
        }

        if (normalized.contains("발로란트")
                || normalized.contains("valorant")) {
            return "발로란트";
        }

        if (normalized.contains("마인크래프트")
                || normalized.contains("minecraft")) {
            return "마인크래프트";
        }

        return null;
    }

    private boolean isPriceAdviceQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String normalized = message.replaceAll("\\s+", "");

        return normalized.contains("구매해도")
                || normalized.contains("사도돼")
                || normalized.contains("사도되")
                || normalized.contains("살만해")
                || normalized.contains("괜찮은가격")
                || normalized.contains("비싼가")
                || normalized.contains("비싼")
                || normalized.contains("비싸")
                || normalized.contains("왜케비")
                || normalized.contains("왜이렇게비")
                || normalized.contains("가격이높")
                || normalized.contains("가격높")
                || normalized.contains("싼가")
                || normalized.contains("적정가")
                || normalized.contains("살래말래")
                || normalized.contains("가격괜찮");
    }

    private boolean isLaunchPriceQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String normalized = message.replaceAll("\\s+", "");

        return normalized.contains("출시가")
                || normalized.contains("정가")
                || normalized.contains("출고가")
                || normalized.contains("발매가")
                || normalized.contains("새제품가격")
                || normalized.contains("신품가격")
                || normalized.contains("중고말고");
    }
}
