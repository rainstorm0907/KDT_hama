package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatAnalysisResult;
import com.used.service.chatbot.dto.ChatMessageRequest;
import com.used.service.chatbot.dto.ChatMessageResponse;
import com.used.service.chatbot.dto.RecommendedItemDto;
import com.used.service.chatbot.entity.ChatHistory;
import com.used.service.chatbot.repository.ChatHistoryRepository;
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
            ChatMessageResponse response = personalProductContextService.handle(userId, userMessage);
            saveAndLog(userId, userMessage, response.getAnswer(), response.getIntent(), response.getResponseType());
            return response;
        }

        var templateAnswer = chatbotTemplateService.findAnswer(userMessage);
        if (templateAnswer.isPresent()) {
            ChatbotTemplateService.TemplateAnswer template = templateAnswer.get();
            logGeminiSkipped();
            logAnalysis(template.getIntent(), "", null, null, null, null, null, null);
            saveAndLog(userId, userMessage, template.getAnswer(), template.getIntent(), template.getResponseType());
            return ChatMessageResponse.builder()
                    .answer(template.getAnswer())
                    .intent(template.getIntent())
                    .responseType(template.getResponseType())
                    .keyword("")
                    .items(List.of())
                    .build();
        }

        if (isLaunchPriceQuestion(userMessage)) {
            String answer = "하마는 중고 거래 매물의 현재가, 최저가, 유사 상품 평균가를 기준으로 가격을 비교합니다. 제조사 출시가나 정가는 공식 데이터가 없어 정확히 안내하기 어렵습니다. 대신 지금 등록된 중고 매물 기준으로 가격이 적절한지 비교해드릴 수 있습니다.";
            saveAndLog(userId, userMessage, answer, "PRICE_INFO_LIMIT", "GUIDE");
            return simpleResponse(answer, "PRICE_INFO_LIMIT", "GUIDE", "");
        }

        if (isPriceAdviceQuestion(userMessage)) {
            String answer = priceAdviceService.makePriceAdvice(request.getItemId());
            saveAndLog(userId, userMessage, answer, "PRICE_ADVICE", "DB_PRICE_ADVICE");
            return simpleResponse(answer, "PRICE_ADVICE", "DB_PRICE_ADVICE", "");
        }

        ChatAnalysisResult analysis = geminiClientService.analyzeMessage(userMessage);
        String intent = safeIntent(analysis.getIntent());
        String keyword = safeKeyword(analysis.getKeyword());
        String gameName = resolveGameName(userMessage, analysis.getGameName());
        String performanceLevel = analysis.getPerformanceLevel();

        if ("FAQ".equals(intent) || "UNKNOWN".equals(intent)) {
            var faqAnswer = faqService.findAnswer(userMessage);
            if (faqAnswer.isPresent()) {
                String answer = faqAnswer.get();
                logAnalysis("FAQ", "", null, null, null, null, null, null);
                saveAndLog(userId, userMessage, answer, "FAQ", "FAQ");
                return simpleResponse(answer, "FAQ", "FAQ", "");
            }
        }

        logAnalysis(intent, keyword, analysis.getMinPrice(), analysis.getMaxPrice(), analysis.getProductType(), analysis.getUseCase(), gameName, performanceLevel);

        if ("GREETING".equals(intent)) {
            String answer = "안녕하세요. 하마 챗봇입니다. 상품 검색, 가격 비교, 찜 목록과 최근 본 상품 비교, 사이트 사용 방법을 도와드릴게요.";
            saveAndLog(userId, userMessage, answer, intent, "RULE");
            return simpleResponse(answer, intent, "RULE", "");
        }

        if ("ITEM_COUNT".equals(intent)) {
            long count = recommendationService.countAvailableItems();
            String answer = count > 0
                    ? "현재 판매중으로 조회 가능한 상품은 " + count + "개입니다. 검색어를 입력하면 관련 상품을 추천해드릴 수 있습니다."
                    : "현재 판매중으로 조회 가능한 상품이 없습니다. 크롤링 데이터 적재 상태를 확인해 주세요.";
            saveAndLog(userId, userMessage, answer, intent, "RULE");
            return simpleResponse(answer, intent, "RULE", "");
        }

        if ("WISHLIST_LIST".equals(intent)) {
            String answer = "찜 목록은 마이페이지에서 확인할 수 있습니다. 챗봇에서는 '찜 목록 상품 비교해줘'처럼 요청하면 저장된 상품을 가격 기준으로 비교해드릴 수 있습니다.";
            saveAndLog(userId, userMessage, answer, intent, "RULE");
            return simpleResponse(answer, intent, "RULE", keyword);
        }

        if ("PERSONAL_RECOMMEND".equals(intent)) {
            List<RecommendedItemDto> items = recommendationService.recommendPersonalized(userId);
            String answer = items.isEmpty()
                    ? "개인 추천에 사용할 상품 데이터가 아직 부족합니다. 상품을 검색하거나 상세 페이지를 몇 개 열어본 뒤 다시 요청해 주세요."
                    : "최근 검색과 상품 데이터를 기준으로 볼 만한 상품을 정리했습니다.";
            saveAndLog(userId, userMessage, answer, intent, "DB_PERSONAL_RECOMMEND");
            return itemResponse(answer, intent, "DB_PERSONAL_RECOMMEND", "", items);
        }

        if ("PRODUCT_RECOMMEND".equals(intent)) {
            if (keyword.isBlank()) {
                String answer = "추천할 상품명을 파악하지 못했습니다. 예를 들어 '아이폰 13 추천해줘', '롤 가능한 컴퓨터 추천해줘'처럼 상품명이나 용도를 포함해 주세요.";
                saveAndLog(userId, userMessage, answer, intent, "GUIDE");
                return simpleResponse(answer, intent, "GUIDE", "");
            }

            searchLogService.saveSearchKeyword(userId, keyword);
            List<RecommendedItemDto> items = recommendationService.recommendByAnalysisResult(userId, analysis);
            String answer = makeRecommendationAnswer(keyword, analysis.getMinPrice(), analysis.getMaxPrice(), analysis.getUseCase(), gameName, performanceLevel, items);

            saveAndLog(userId, userMessage, answer, intent, "DB_RECOMMEND");
            return itemResponse(answer, intent, "DB_RECOMMEND", keyword, items);
        }

        if ("PRICE_COMPARE".equals(intent)) {
            if (request.getItemId() != null || isPriceAdviceQuestion(userMessage)) {
                String answer = priceAdviceService.makePriceAdvice(request.getItemId());
                saveAndLog(userId, userMessage, answer, "PRICE_ADVICE", "DB_PRICE_ADVICE");
                return simpleResponse(answer, "PRICE_ADVICE", "DB_PRICE_ADVICE", keyword);
            }

            if (keyword.isBlank()) {
                String answer = "가격 비교할 상품명을 파악하지 못했습니다. 예를 들어 '아이폰 14 가격 비교해줘'처럼 상품명을 함께 입력해 주세요.";
                saveAndLog(userId, userMessage, answer, intent, "GUIDE");
                return simpleResponse(answer, intent, "GUIDE", "");
            }

            searchLogService.saveSearchKeyword(userId, keyword);
            List<RecommendedItemDto> items = recommendationService.recommendByAnalysisResult(userId, analysis);
            String answer = makePriceCompareAnswer(keyword, items);
            saveAndLog(userId, userMessage, answer, intent, "DB_PRICE_COMPARE");
            return itemResponse(answer, intent, "DB_PRICE_COMPARE", keyword, items);
        }

        if ("PRICE_ALERT_GUIDE".equals(intent)) {
            String answer = "상품 상세 화면의 알림 버튼을 누르면 해당 상품을 알림 목록에 저장할 수 있습니다. 마이페이지 알림 탭에서 저장한 상품을 확인할 수 있습니다.";
            saveAndLog(userId, userMessage, answer, intent, "GUIDE");
            return simpleResponse(answer, intent, "GUIDE", "");
        }

        if ("SEARCH_HELP".equals(intent)) {
            String answer = "상품명이나 모델명을 구체적으로 입력하면 더 정확히 검색됩니다. 예를 들어 '아이폰 14', '갤럭시 S23', 'RTX 4060 본체'처럼 입력해 보세요.";
            saveAndLog(userId, userMessage, answer, intent, "GUIDE");
            return simpleResponse(answer, intent, "GUIDE", "");
        }

        String defaultAnswer = "하마 챗봇은 중고 상품 검색, 가격 비교, 상품 추천, 사이트 사용법에 관한 질문만 처리할 수 있습니다. 상품명이나 비교 조건을 포함해서 다시 질문해 주세요.";
        saveAndLog(userId, userMessage, defaultAnswer, intent, "DEFAULT");
        return simpleResponse(defaultAnswer, intent, "DEFAULT", keyword);
    }

    private String makeRecommendationAnswer(String keyword, Long minPrice, Long maxPrice, String useCase, String gameName, String performanceLevel, List<RecommendedItemDto> items) {
        boolean isGaming = "gaming".equalsIgnoreCase(useCase);
        if (items.isEmpty()) {
            if (isGaming) {
                return "'" + keyword + "' 관련 상품 중 " + normalizeGameLabel(gameName) + " 플레이 조건에 맞는 추천 상품을 찾지 못했습니다. 상품 데이터가 부족하거나 검색 조건이 너무 좁을 수 있습니다.";
            }
            return "'" + keyword + "' 관련 추천 상품을 찾지 못했습니다. 상품 데이터가 아직 없거나 검색어가 너무 구체적일 수 있습니다.";
        }

        if (isGaming) {
            String specGuide = gameSpecGuideService.makeGuide(gameName, performanceLevel);
            String summary = "'" + keyword + "' 관련 상품 중 " + normalizeGameLabel(gameName) + " 플레이 후보를 " + performanceLevelToKorean(performanceLevel) + " 기준으로 정리했습니다.";
            return specGuide == null || specGuide.isBlank() ? summary : specGuide + "\n\n" + summary;
        }

        if (minPrice != null && maxPrice != null) {
            return "'" + keyword + "' 관련 상품 중 " + String.format("%,d원", minPrice) + "부터 " + String.format("%,d원", maxPrice) + "까지의 상품을 정리했습니다.";
        }

        if (maxPrice != null && maxPrice > 0) {
            return "'" + keyword + "' 관련 상품 중 " + String.format("%,d원", maxPrice) + " 이하 후보를 정리했습니다.";
        }

        return "'" + keyword + "' 관련 상품 중 가격, 검색어 연관성, 최신성을 기준으로 추천 상품을 정리했습니다.";
    }

    private String makePriceCompareAnswer(String keyword, List<RecommendedItemDto> items) {
        if (items.isEmpty()) {
            return "'" + keyword + "' 관련 가격 비교 상품을 찾지 못했습니다. 상품 데이터가 부족하거나 검색어가 너무 구체적일 수 있습니다.";
        }

        Long minPrice = items.stream().map(RecommendedItemDto::getCurrentPrice).filter(price -> price != null && price > 0).min(Long::compareTo).orElse(null);
        Long maxPrice = items.stream().map(RecommendedItemDto::getCurrentPrice).filter(price -> price != null && price > 0).max(Long::compareTo).orElse(null);
        if (minPrice == null || maxPrice == null) {
            return "'" + keyword + "' 관련 상품을 찾았지만 가격 정보가 부족합니다.";
        }
        return "'" + keyword + "' 관련 상품의 현재가 범위는 " + String.format("%,d원", minPrice) + "부터 " + String.format("%,d원", maxPrice) + "까지입니다. 가격뿐 아니라 상태와 구성품도 함께 비교해 주세요.";
    }

    private ChatMessageResponse simpleResponse(String answer, String intent, String responseType, String keyword) {
        return itemResponse(answer, intent, responseType, keyword, List.of());
    }

    private ChatMessageResponse itemResponse(String answer, String intent, String responseType, String keyword, List<RecommendedItemDto> items) {
        return ChatMessageResponse.builder()
                .answer(answer)
                .intent(intent)
                .responseType(responseType)
                .keyword(keyword)
                .items(items)
                .build();
    }

    private void saveAndLog(Long userId, String userMessage, String answer, String intent, String responseType) {
        logUserMessage(userMessage);
        logBotAnswer(answer);
        saveHistory(userId, userMessage, answer, intent, responseType);
    }

    private void logGeminiSkipped() {
        System.out.println("1. 제미나이 분석 필요: N");
        System.out.println("2. 제미나이 호출 여부: N");
    }

    private void saveHistory(Long userId, String userMessage, String botResponse, String intent, String responseType) {
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

    private void logAnalysis(String intent, String keyword, Long minPrice, Long maxPrice, String productType, String useCase, String gameName, String performanceLevel) {
        System.out.println("3. 챗봇 분석 결과: intent=" + intent
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
        return intent == null || intent.isBlank() ? "UNKNOWN" : intent.trim().toUpperCase();
    }

    private String safeKeyword(String keyword) {
        return keyword == null ? "" : keyword.trim();
    }

    private String resolveGameName(String userMessage, String analyzedGameName) {
        if (analyzedGameName != null && !analyzedGameName.isBlank()) {
            return analyzedGameName.trim();
        }
        String normalized = userMessage == null ? "" : userMessage.replaceAll("\\s+", "").toLowerCase();
        if (normalized.contains("롤") || normalized.contains("lol")) return "롤";
        if (normalized.contains("배그") || normalized.contains("pubg")) return "배그";
        if (normalized.contains("사이버펑크") || normalized.contains("cyberpunk")) return "사이버펑크";
        if (normalized.contains("발로란트") || normalized.contains("valorant")) return "발로란트";
        return null;
    }

    private String normalizeGameLabel(String gameName) {
        return gameName == null || gameName.isBlank() ? "게임" : gameName;
    }

    private String performanceLevelToKorean(String performanceLevel) {
        if (performanceLevel == null || performanceLevel.isBlank()) return "일반 사양";
        return switch (performanceLevel.toUpperCase()) {
            case "LOW" -> "가벼운 사양";
            case "MID" -> "중간 사양";
            case "HIGH" -> "높은 사양";
            case "EXTREME" -> "최상급 사양";
            default -> "일반 사양";
        };
    }

    private boolean isPriceAdviceQuestion(String message) {
        if (message == null || message.isBlank()) return false;
        String normalized = message.replaceAll("\\s+", "");
        return normalized.contains("왜비싸")
                || normalized.contains("비싼")
                || normalized.contains("싼거")
                || normalized.contains("가격괜찮")
                || normalized.contains("살래말래")
                || normalized.contains("살까")
                || normalized.contains("말까")
                || normalized.contains("판단")
                || normalized.contains("적정가")
                || normalized.contains("가격어때");
    }

    private boolean isLaunchPriceQuestion(String message) {
        if (message == null || message.isBlank()) return false;
        String normalized = message.replaceAll("\\s+", "");
        return normalized.contains("출시가")
                || normalized.contains("정가")
                || normalized.contains("새상품가격")
                || normalized.contains("중고말고")
                || normalized.contains("원래가격");
    }
}
