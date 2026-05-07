package com.example.ffff.chatbot.service;

import com.example.ffff.chatbot.dto.ChatAnalysisResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GeminiClientService {

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final GamePerformanceResolver gamePerformanceResolver;

    @Value("${gemini.model}")
    private String model;

    public String testConnection() {
        return generateText("한국어로 'Gemini API 연결 성공'이라고만 답해줘.", 64);
    }

    public ChatAnalysisResult analyzeMessage(String message) {
        ChatAnalysisResult quickResult = fallbackAnalyze(message);

        if (isClearDirectSearch(message, quickResult)
                || isSimpleDirectProductSearch(message, quickResult)) {

            quickResult.setUseCase(null);
            quickResult.setGameName(null);
            quickResult.setPerformanceLevel(null);

            System.out.println("1. 제미나이 분석 필요: N");
            System.out.println("2. 제미나이 호출 여부: N");

            return quickResult;
        }

        boolean needGemini = shouldUseGeminiForSearch(message, quickResult)
                || "UNKNOWN".equals(safeIntent(quickResult.getIntent()));

        System.out.println("1. 제미나이 분석 필요: " + (needGemini ? "Y" : "N"));

        if (!needGemini) {
            System.out.println("2. 제미나이 호출 여부: N");
            return quickResult;
        }

        System.out.println("2. 제미나이 호출 여부: Y");

        ChatAnalysisResult geminiResult = analyzeMessageWithGemini(message);

        if ("UNKNOWN".equals(safeIntent(geminiResult.getIntent()))) {
            return quickResult;
        }

        if (isClearDirectSearch(message, geminiResult)
                || isSimpleDirectProductSearch(message, geminiResult)) {

            geminiResult.setUseCase(null);
            geminiResult.setGameName(null);
            geminiResult.setPerformanceLevel(null);
        }

        return geminiResult;
    }

    public ChatAnalysisResult analyzeMessageWithGemini(String message) {
        String prompt = """
                너는 중고거래 가격 비교 서비스의 검색 조건 분석기다.

                사용자의 메시지를 분석해서 반드시 JSON만 출력해라.
                설명 문장, 마크다운, 코드블록은 출력하지 마라.

                intent 값은 아래 중 하나만 사용해라.
                FAQ, GREETING, ITEM_COUNT, WISHLIST_LIST,
                PRODUCT_RECOMMEND, PERSONAL_RECOMMEND,
                PRICE_COMPARE, PRICE_ALERT_GUIDE,
                SEARCH_HELP, UNKNOWN

                keyword는 DB 상품 검색에 사용할 핵심 상품명이다.
                절대 사용자 문장 전체를 keyword로 넣지 마라.

                예:
                - "아이폰 14 추천" → keyword: "아이폰 14", productType: "smartphone", useCase: null
                - "아이폰 13 30만원 이하" → keyword: "아이폰 13", productType: "smartphone", maxPrice: 300000
                - "아이폰 상품들 중에 중학교 1학년이 사용할만한 폰" → keyword: "아이폰", productType: "smartphone", useCase: "student"
                - "노트북 50만원에서 100만원 사이" → keyword: "노트북", productType: "laptop", minPrice: 500000, maxPrice: 1000000
                - "컴퓨터 30만원 아래" → keyword: "컴퓨터", productType: "desktop", maxPrice: 300000

                - "롤 가능한 컴퓨터 보여줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "롤", performanceLevel: "LOW"
                - "배그 가능한 컴퓨터 보여줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "배그", performanceLevel: "MID"
                - "배그 풀옵 가능한 컴퓨터 보여줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "배그", performanceLevel: "EXTREME"
                - "에이펙스레전드 가능한 컴퓨터 보여줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "에이펙스레전드", performanceLevel: "MID"
                - "에이팩스레전드 가능한 컴퓨터 보여줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "에이펙스레전드", performanceLevel: "MID"
                - "에이펙스레전드 144hz 가능한 컴퓨터 보여줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "에이펙스레전드", performanceLevel: "HIGH"
                - "사이버펑크 가능한 컴퓨터 추천해줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "사이버펑크", performanceLevel: "HIGH"
                - "사이버펑크 풀옵 컴퓨터 추천해줘" → keyword: "컴퓨터", productType: "desktop", useCase: "gaming", gameName: "사이버펑크", performanceLevel: "EXTREME"

                가격 규칙:
                - "30만원 이하", "30만원 아래", "30만원까지"는 maxPrice = 300000
                - "50만원 이상", "50만원부터"는 minPrice = 500000
                - "50만원에서 100만원 사이", "50만원 이상 100만원 이하"는 minPrice = 500000, maxPrice = 1000000
                - 가격 조건이 없으면 null

                productType 규칙:
                - 컴퓨터, 데스크탑, 본체, PC → "desktop"
                - 노트북, 랩탑 → "laptop"
                - 스마트폰, 휴대폰, 아이폰, 갤럭시 → "smartphone"
                - 그 외는 null

                useCase 규칙:
                - 롤, 배그, 게임, 게이밍, 잘 돌아가는, 가능한, 플레이 → "gaming"
                - 중학생, 중학교, 초등학생, 고등학생, 학생, 입문용, 처음 쓰는, 사용할만한, 쓸만한, 자녀, 아이 → "student"
                - 사무용, 문서작업 → "office"
                - 코딩, 개발 → "coding"
                - 영상편집, 디자인 → "creative"
                - 단순히 "추천", "보여줘", "상품", "제품"만 있는 경우 useCase는 null
                - 그 외는 null

                게임명 / 성능 등급 규칙:
                - 롤, 리그오브레전드 → gameName: "롤", performanceLevel: "LOW"
                - 메이플, 피파, 서든, 스타크래프트, 발로란트 → performanceLevel: "LOW"
                - 배그, 배틀그라운드 → gameName: "배그", performanceLevel: "MID"
                - 에이펙스, 에이펙스레전드, 에이팩스, 에이팩스레전드, apex → gameName: "에이펙스레전드", performanceLevel: "MID"
                - 오버워치, 로스트아크 → performanceLevel: "MID"
                - 사이버펑크, 사이버펑크2077, GTA, GTA5, 엘든링, 디아블로4, 레데리, 레드데드, 스타필드, 최신 AAA 게임, 고사양 게임 → performanceLevel: "HIGH"
                - QHD, 144Hz, 높은프레임, 고프레임, 쾌적, 상옵, 고옵 → performanceLevel: "HIGH"
                - 4K, 레이트레이싱, RT, 풀옵션, 풀옵, 울트라옵션, 울트라, 최상옵, 극상옵, 오버드라이브 → performanceLevel: "EXTREME"

                performanceLevel은 아래 중 하나만 사용해라.
                LOW, MID, HIGH, EXTREME, UNKNOWN

                excludeAccessory는 항상 true로 둔다.
                tradeStatus는 항상 "SALE"로 둔다.

                출력 형식:
                {
                  "intent": "PRODUCT_RECOMMEND",
                  "keyword": "컴퓨터",
                  "minPrice": null,
                  "maxPrice": null,
                  "productType": "desktop",
                  "useCase": "gaming",
                  "gameName": "사이버펑크",
                  "performanceLevel": "HIGH",
                  "excludeAccessory": true,
                  "tradeStatus": "SALE"
                }

                사용자 메시지:
                %s
                """.formatted(message);

        try {
            String resultText = generateText(prompt, 256);

            ChatAnalysisResult result =
                    objectMapper.readValue(cleanJson(resultText), ChatAnalysisResult.class);

            applyFallbackValues(message, result);

            return result;

        } catch (Exception e) {
            ChatAnalysisResult errorResult = new ChatAnalysisResult();
            errorResult.setIntent("UNKNOWN");
            errorResult.setKeyword("");
            errorResult.setMinPrice(null);
            errorResult.setMaxPrice(null);
            errorResult.setProductType(null);
            errorResult.setUseCase(null);
            errorResult.setGameName(null);
            errorResult.setPerformanceLevel(null);
            errorResult.setExcludeAccessory(true);
            errorResult.setTradeStatus("SALE");

            return errorResult;
        }
    }

    public boolean shouldUseGeminiForSearch(String message, ChatAnalysisResult result) {
        if (isClearDirectSearch(message, result)
                || isSimpleDirectProductSearch(message, result)) {
            return false;
        }

        if (message == null || message.isBlank()) {
            return false;
        }

        if (result == null) {
            return true;
        }

        String intent = safeIntent(result.getIntent());

        if (!"PRODUCT_RECOMMEND".equals(intent)
                && !"PRICE_COMPARE".equals(intent)
                && !"UNKNOWN".equals(intent)) {
            return false;
        }

        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", "");

        boolean hasUseCaseExpression = containsAny(
                normalized,
                "롤",
                "배그",
                "배틀그라운드",
                "에이펙스",
                "에이펙스레전드",
                "에이팩스",
                "에이팩스레전드",
                "apex",
                "사이버펑크",
                "사이버펑크2077",
                "엘든링",
                "gta",
                "레데리",
                "레드데드",
                "스타필드",
                "앨런웨이크",
                "게임",
                "게이밍",
                "가능",
                "잘돌아",
                "돌아가는",
                "플레이",
                "고사양",
                "최신게임",
                "aaa",
                "144hz",
                "qhd",
                "4k",
                "울트라",
                "풀옵",
                "레이트레이싱",
                "사무용",
                "대학생",
                "중학생",
                "중학교",
                "초등학생",
                "고등학생",
                "학생",
                "입문용",
                "처음쓰",
                "처음사용",
                "사용할만한",
                "쓸만한",
                "부모님",
                "자녀",
                "선물",
                "코딩",
                "개발용",
                "영상편집",
                "디자인",
                "가성비",
                "괜찮은",
                "좋은"
        );

        boolean hasPriceRangeExpression = containsAny(
                normalized,
                "사이",
                "부터",
                "에서",
                "이상",
                "이하"
        ) && countPriceExpressions(message) >= 2;

        String keyword = result.getKeyword();

        boolean keywordLooksLikeSentence =
                keyword != null
                        && keyword.trim().contains(" ")
                        && keyword.trim().length() >= 8
                        && containsAny(keyword.replaceAll("\\s+", ""),
                        "가능",
                        "가성비",
                        "잘돌아",
                        "대학생",
                        "중학생",
                        "중학교",
                        "학생",
                        "사용할만한",
                        "쓸만한",
                        "입문용",
                        "부모님",
                        "자녀",
                        "선물",
                        "사무용");

        return hasUseCaseExpression || hasPriceRangeExpression || keywordLooksLikeSentence;
    }

    public String generateGeneralAnswer(String message) {
        String prompt = """
                너는 중고거래 가격 비교 서비스의 챗봇이다.

                서비스 설명:
                이 서비스는 여러 중고거래 플랫폼의 상품을 한곳에서 검색하고,
                가격 비교, 찜, 가격 알림, 시세 확인을 도와주는 서비스다.

                답변 규칙:
                - 한국어로 답변해라.
                - 2~3문장으로만 답변해라.
                - 문장을 중간에 끊지 말고 완성해라.
                - 마지막 문장은 완결된 문장으로 끝내라.
                - 서비스 기능과 관련된 방향으로 안내해라.
                - 확실하지 않은 내용은 단정하지 마라.

                사용자 질문:
                %s
                """.formatted(message);

        return generateText(prompt, 768);
    }

    private String generateText(String prompt, int maxOutputTokens) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "maxOutputTokens", maxOutputTokens
                )
        );

        try {
            JsonNode response = geminiWebClient.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(20))
                    .block();

            return extractText(response);

        } catch (WebClientResponseException.TooManyRequests e) {
            return "{}";

        } catch (WebClientResponseException.ServiceUnavailable e) {
            return "{}";

        } catch (WebClientResponseException.NotFound e) {
            return "{}";

        } catch (WebClientResponseException e) {
            return "{}";

        } catch (Exception e) {
            return "{}";
        }
    }

    private String extractText(JsonNode response) {
        if (response == null) {
            return "{}";
        }

        JsonNode candidates = response.path("candidates");

        if (candidates.isArray() && !candidates.isEmpty()) {
            JsonNode firstCandidate = candidates.get(0);

            JsonNode parts = firstCandidate
                    .path("content")
                    .path("parts");

            StringBuilder result = new StringBuilder();

            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    String text = part.path("text").asText();

                    if (text != null && !text.isBlank()) {
                        result.append(text);
                    }
                }
            }

            String finalText = result.toString().trim();

            if (!finalText.isBlank()) {
                return finalText
                        .replace("\u00A0", " ")
                        .replace("\u200B", "")
                        .replace("\u200C", "")
                        .replace("\u200D", "")
                        .replace("\uFEFF", "")
                        .trim();
            }
        }

        return "{}";
    }

    private String cleanJson(String text) {
        if (text == null || text.isBlank()) {
            return "{}";
        }

        int start = text.indexOf("{");
        int end = text.lastIndexOf("}");

        if (start >= 0 && end > start) {
            return text.substring(start, end + 1)
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();
        }

        return text
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }

    private ChatAnalysisResult fallbackAnalyze(String message) {
        ChatAnalysisResult result = new ChatAnalysisResult();

        if (message == null || message.isBlank()) {
            result.setIntent("UNKNOWN");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        String lower = message.toLowerCase();
        String normalized = lower.replaceAll("\\s+", "");
        Long minPrice = extractMinPrice(message);
        Long maxPrice = extractMaxPrice(message);
        String keyword = extractKeywordByRule(message);

        if (containsAny(normalized, "안녕", "하이", "반가워", "hello", "hi")) {
            result.setIntent("GREETING");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (isSiteInfoQuestion(normalized)) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (isPersonalRecommendQuestion(normalized)) {
            result.setIntent("PERSONAL_RECOMMEND");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "찜목록", "내찜", "관심상품", "관심목록")
                || (normalized.contains("찜") && containsAny(normalized, "목록", "보여", "조회", "확인"))
                || (normalized.contains("관심") && containsAny(normalized, "목록", "보여", "조회", "확인"))) {
            result.setIntent("WISHLIST_LIST");
            result.setKeyword(keyword);
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "가격알림", "알림설정", "목표가격", "희망가격")) {
            result.setIntent("PRICE_ALERT_GUIDE");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (normalized.contains("찜") && containsAny(normalized, "방법", "어떻게", "사용법", "하는법", "어케")) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "검색방법", "검색하는법", "검색어떻게", "검색도움")
                || (normalized.contains("검색") && containsAny(normalized, "방법", "어떻게", "하는법", "도움"))) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (isItemCountQuestion(normalized, keyword)) {
            result.setIntent("ITEM_COUNT");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (!keyword.isBlank()
                && (
                containsAny(normalized,
                        "추천", "골라", "괜찮은", "저렴한", "싼", "가성비",
                        "찾아", "보여", "조회", "검색",
                        "제품", "매물", "상품", "게시물", "게시글",
                        "등록된상품", "등록상품", "구매", "사려고", "살려고")
                        || isLikelyProductKeyword(keyword)
        )) {
            result.setIntent("PRODUCT_RECOMMEND");
            result.setKeyword(keyword);
            result.setMinPrice(minPrice);
            result.setMaxPrice(maxPrice);
            result.setProductType(guessProductType(message, keyword));
            result.setUseCase(guessUseCase(message));
            result.setGameName(gamePerformanceResolver.resolveGameName(message));
            result.setPerformanceLevel(gamePerformanceResolver.resolveByMessage(message));
            result.setExcludeAccessory(true);
            result.setTradeStatus("SALE");
            return result;
        }

        if (containsAny(normalized, "시세", "가격비교", "가격대", "얼마", "최저가")) {
            result.setIntent("PRICE_COMPARE");
            result.setKeyword(keyword);
            result.setMinPrice(minPrice);
            result.setMaxPrice(maxPrice);
            result.setProductType(guessProductType(message, keyword));
            result.setUseCase(guessUseCase(message));
            result.setGameName(gamePerformanceResolver.resolveGameName(message));
            result.setPerformanceLevel(gamePerformanceResolver.resolveByMessage(message));
            result.setExcludeAccessory(true);
            result.setTradeStatus("SALE");
            return result;
        }

        result.setIntent("UNKNOWN");
        result.setKeyword("");
        result.setMinPrice(null);
        result.setMaxPrice(null);
        return result;
    }

    private void applyFallbackValues(String message, ChatAnalysisResult result) {
        if (result == null) {
            return;
        }

        String intent = safeIntent(result.getIntent());

        if ("UNKNOWN".equals(intent) || intent.isBlank()) {
            result.setIntent("PRODUCT_RECOMMEND");
        }

        Long ruleMinPrice = extractMinPrice(message);
        Long ruleMaxPrice = extractMaxPrice(message);

        if (result.getMinPrice() == null) {
            result.setMinPrice(ruleMinPrice);
        }

        if (result.getMaxPrice() == null) {
            result.setMaxPrice(ruleMaxPrice);
        }

        String keyword = cleanKeyword(result.getKeyword());

        if (keyword.isBlank()) {
            keyword = extractKeywordByRule(message);
        }

        if (keyword.isBlank()) {
            keyword = extractKnownProductKeyword(message);
        }

        if (keyword.isBlank()) {
            keyword = "상품";
        }

        result.setKeyword(keyword);

        String productType = result.getProductType();

        if (productType == null || productType.isBlank()) {
            result.setProductType(guessProductType(message, keyword));
        }

        String useCase = result.getUseCase();

        if (useCase == null || useCase.isBlank()) {
            result.setUseCase(guessUseCase(message));
        }

        String gameName = result.getGameName();

        if (gameName == null || gameName.isBlank()) {
            result.setGameName(gamePerformanceResolver.resolveGameName(message));
        }

        String performanceLevel = result.getPerformanceLevel();

        if (performanceLevel == null || performanceLevel.isBlank()) {
            result.setPerformanceLevel(gamePerformanceResolver.resolveByMessage(message));
        }

        if (result.getExcludeAccessory() == null) {
            result.setExcludeAccessory(true);
        }

        if (result.getTradeStatus() == null || result.getTradeStatus().isBlank()) {
            result.setTradeStatus("SALE");
        }
    }

    private Long extractMinPrice(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        List<Long> prices = extractAllPrices(message);
        String normalized = message.replaceAll("\\s+", "");

        if (prices.size() >= 2 && containsAny(normalized, "사이", "에서", "부터")) {
            return prices.get(0);
        }

        if (containsAny(normalized, "이상", "부터")) {
            return prices.isEmpty() ? null : prices.get(0);
        }

        return null;
    }

    private Long extractMaxPrice(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        List<Long> prices = extractAllPrices(message);
        String normalized = message.replaceAll("\\s+", "");

        if (prices.isEmpty()) {
            return null;
        }

        if (prices.size() >= 2 && containsAny(normalized, "사이", "에서", "부터")) {
            return prices.get(1);
        }

        if (containsAny(normalized, "이하", "미만", "아래", "까지", "예산", "안쪽")) {
            return prices.get(prices.size() - 1);
        }

        if (prices.size() == 1 && !containsAny(normalized, "이상", "부터")) {
            return prices.get(0);
        }

        return null;
    }

    private List<Long> extractAllPrices(String message) {
        String text = message
                .replace(",", "")
                .toLowerCase()
                .trim();

        java.util.ArrayList<Long> prices = new java.util.ArrayList<>();

        Pattern manwonPattern = Pattern.compile("(\\d{1,4})\\s*만원");
        Matcher manwonMatcher = manwonPattern.matcher(text);

        while (manwonMatcher.find()) {
            long value = Long.parseLong(manwonMatcher.group(1));

            if (value >= 1 && value <= 5000) {
                prices.add(value * 10_000);
            }
        }

        Pattern wonPattern = Pattern.compile("(\\d{4,})\\s*원");
        Matcher wonMatcher = wonPattern.matcher(text);

        while (wonMatcher.find()) {
            prices.add(Long.parseLong(wonMatcher.group(1)));
        }

        return prices;
    }

    private int countPriceExpressions(String message) {
        return extractAllPrices(message).size();
    }

    private String guessProductType(String message, String keyword) {
        String text = ((message == null ? "" : message) + " " + (keyword == null ? "" : keyword))
                .toLowerCase()
                .replaceAll("\\s+", "");

        if (containsAny(text, "노트북", "랩탑")) {
            return "laptop";
        }

        if (containsAny(text, "컴퓨터", "데스크탑", "본체", "pc")) {
            return "desktop";
        }

        if (containsAny(text, "아이폰", "갤럭시", "스마트폰", "휴대폰")) {
            return "smartphone";
        }

        return null;
    }

    private String guessUseCase(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String normalized = message.toLowerCase().replaceAll("\\s+", "");

        if (containsAny(normalized,
                "롤", "배그", "배틀그라운드",
                "에이펙스", "에이팩스",
                "사이버펑크",
                "게임", "게이밍")) {
            return "gaming";
        }

        if (containsAny(normalized,
                "중학생", "중학교",
                "초등학생", "고등학생",
                "학생", "자녀")) {
            return "student";
        }

        if (containsAny(normalized, "사무용", "문서작업", "업무용")) {
            return "office";
        }

        if (containsAny(normalized, "코딩", "개발용", "프로그래밍")) {
            return "coding";
        }

        if (containsAny(normalized, "영상편집", "디자인", "포토샵")) {
            return "creative";
        }

        return null;
    }

    private boolean isPersonalRecommendQuestion(String normalized) {
        return containsAny(normalized,
                "나한테추천",
                "나에게추천",
                "내추천",
                "맞춤추천",
                "개인추천",
                "추천해줄만한",
                "추천할만한",
                "내가좋아할만한",
                "좋아할만한상품",
                "나한테맞는",
                "나에게맞는");
    }

    private boolean isItemCountQuestion(String normalized, String keyword) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }

        boolean countOrExistQuestion =
                normalized.contains("상품")
                        && containsAny(normalized, "개수", "몇개", "등록", "올라와", "있어", "있나요", "데이터");

        if (!countOrExistQuestion) {
            return false;
        }

        return keyword == null || keyword.isBlank();
    }

    private boolean isLikelyProductKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return false;
        }

        String normalizedKeyword = keyword.replaceAll("\\s+", "").toLowerCase();

        if (containsAny(normalizedKeyword,
                "아이폰", "갤럭시", "에어팟", "맥북", "아이패드",
                "애플워치", "닌텐도", "플스", "노트북", "모니터",
                "키보드", "마우스", "카메라", "컴퓨터", "데스크탑", "본체", "pc")) {
            return true;
        }

        return normalizedKeyword.matches(".*\\d+.*");
    }

    private boolean isSiteInfoQuestion(String normalized) {
        return containsAny(normalized,
                "무슨사이트",
                "어떤사이트",
                "사이트설명",
                "서비스설명",
                "뭐하는사이트",
                "뭐하는서비스",
                "이사이트",
                "하마설명",
                "하마가뭐",
                "하마는뭐",
                "어떤서비스",
                "서비스소개")
                || (
                containsAny(normalized, "사이트", "서비스", "하마")
                        && containsAny(normalized, "설명", "소개", "뭐", "무엇", "알려", "대해서")
        );
    }

    private String extractKeywordByRule(String message) {
        if (message == null) {
            return "";
        }

        String productKeyword = extractKnownProductKeyword(message);

        if (!productKeyword.isBlank()) {
            return productKeyword;
        }

        String keyword = message;

        keyword = keyword
                .replaceAll("\\d+\\s*만원\\s*(이하인|이하|미만인|미만|아래인|아래|이상인|이상|부터|까지|안쪽|대|사이)?", "")
                .replaceAll("\\d{1,3}(,\\d{3})+\\s*원\\s*(이하인|이하|미만인|미만|아래인|아래|이상인|이상|부터|까지|안쪽|대|사이)?", "")
                .replaceAll("\\d+\\s*원\\s*(이하인|이하|미만인|미만|아래인|아래|이상인|이상|부터|까지|안쪽|대|사이)?", "")

                .replace("추천해줘", "")
                .replace("추천", "")
                .replace("골라줘", "")
                .replace("골라", "")
                .replace("찾아줘", "")
                .replace("찾아", "")
                .replace("검색해줘", "")
                .replace("검색", "")
                .replace("알려줘", "")
                .replace("보여줘", "")
                .replace("보여", "")
                .replace("조회해줘", "")
                .replace("조회", "")
                .replace("확인해줘", "")
                .replace("확인", "")
                .replace("해줘", "")

                .replace("상품들", "")
                .replace("상품", "")
                .replace("제품들", "")
                .replace("제품", "")
                .replace("매물들", "")
                .replace("매물", "")
                .replace("게시글", "")
                .replace("게시물", "")
                .replace("것들이", "")
                .replace("것들", "")
                .replace("것", "")

                .replace("시세", "")
                .replace("가격", "")
                .replace("비교", "")
                .replace("얼마", "")
                .replace("최저가", "")
                .replace("제일", "")
                .replace("가장", "")
                .replace("저렴한", "")
                .replace("저렴하게", "")
                .replace("싼거", "")
                .replace("싼 거", "")
                .replace("싼", "")
                .replace("이하인", "")
                .replace("이하", "")
                .replace("아래인", "")
                .replace("아래", "")
                .replace("미만인", "")
                .replace("미만", "")
                .replace("이상인", "")
                .replace("이상", "")
                .replace("부터", "")
                .replace("까지", "")
                .replace("안쪽", "")
                .replace("예산", "")

                .replace("현재", "")
                .replace("지금", "")
                .replace("혹시", "")
                .replace("어떤", "")
                .replace("뭐가", "")
                .replace("뭐", "")
                .replace("있는", "")
                .replace("있어?", "")
                .replace("있어", "")
                .replace("있나요", "")
                .replace("있을까", "")
                .replace("있냐", "")
                .replace("있음", "")
                .replace("좀", "")

                .replace("?", "")
                .replace("!", "")
                .replace(".", "")
                .replace(",", "")
                .replace("'", "")
                .replace("\"", "")

                .replace("등록된", "")
                .replace("등록되어있는", "")
                .replace("등록되어", "")
                .replace("등록", "")
                .replace("올라온", "")
                .replace("올라와있는", "")
                .replace("올라와", "")

                .replace("중에서", "")
                .replace("중에", "")
                .replace("에서", "")
                .replace("사이", "")

                .replace("구매하려고 하는데", "")
                .replace("구매하려고", "")
                .replace("구매하고 싶은데", "")
                .replace("구매하고싶은데", "")
                .replace("사려고 하는데", "")
                .replace("사려고", "")
                .replace("살려고 하는데", "")
                .replace("살려고", "")
                .replace("사고 싶은데", "")
                .replace("사고싶은데", "")
                .replace("구매", "")

                .replaceAll("\\s+", " ")
                .trim();

        return cleanKeyword(keyword);
    }

    private String extractKnownProductKeyword(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }

        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", " ")
                .trim();

        Pattern iphonePattern = Pattern.compile(
                "(아이폰)\\s*(\\d{1,2})?\\s*(프로맥스|프로\\s*맥스|프로|max|미니|mini|plus|플러스)?\\s*(?!만원|원)"
        );

        Matcher iphoneMatcher = iphonePattern.matcher(normalized);

        if (iphoneMatcher.find()) {
            String base = iphoneMatcher.group(1);
            String number = iphoneMatcher.group(2);
            String model = iphoneMatcher.group(3);

            if (number != null && !number.isBlank()) {
                int modelNumber = Integer.parseInt(number);

                if (modelNumber < 4 || modelNumber > 16) {
                    number = null;
                    model = null;
                }
            }

            StringBuilder keyword = new StringBuilder(base);

            if (number != null && !number.isBlank()) {
                keyword.append(" ").append(number);
            }

            if (model != null && !model.isBlank()) {
                model = model.replace("프로 맥스", "프로맥스");
                model = model.replace("max", "프로맥스");
                model = model.replace("mini", "미니");
                model = model.replace("plus", "플러스");
                keyword.append(" ").append(model);
            }

            return keyword.toString().trim();
        }

        Pattern galaxyPattern = Pattern.compile("(갤럭시)\\s*(s\\d{1,2}|z\\s*플립\\d*|z\\s*폴드\\d*|플립\\d*|폴드\\d*|노트\\d*)?");
        Matcher galaxyMatcher = galaxyPattern.matcher(normalized);

        if (galaxyMatcher.find()) {
            String base = galaxyMatcher.group(1);
            String model = galaxyMatcher.group(2);

            if (model != null && !model.isBlank()) {
                model = model.replaceAll("\\s+", " ");
                return (base + " " + model).trim();
            }

            return base;
        }

        if (normalized.contains("에어팟")) {
            if (normalized.contains("프로")) {
                return "에어팟 프로";
            }

            if (normalized.contains("맥스")) {
                return "에어팟 맥스";
            }

            if (normalized.contains("2세대")) {
                return "에어팟 2세대";
            }

            if (normalized.contains("3세대")) {
                return "에어팟 3세대";
            }

            return "에어팟";
        }

        if (normalized.contains("맥북")) {
            if (normalized.contains("프로")) {
                return "맥북 프로";
            }

            if (normalized.contains("에어")) {
                return "맥북 에어";
            }

            return "맥북";
        }

        if (normalized.contains("아이패드")) {
            if (normalized.contains("프로")) {
                return "아이패드 프로";
            }

            if (normalized.contains("에어")) {
                return "아이패드 에어";
            }

            if (normalized.contains("미니")) {
                return "아이패드 미니";
            }

            return "아이패드";
        }

        if (normalized.contains("애플워치")) {
            return "애플워치";
        }

        String[] productWords = {
                "닌텐도",
                "플스",
                "노트북",
                "모니터",
                "키보드",
                "마우스",
                "카메라",
                "컴퓨터",
                "데스크탑",
                "본체",
                "pc"
        };

        for (String productWord : productWords) {
            if (normalized.contains(productWord)) {
                if ("데스크탑".equals(productWord) || "본체".equals(productWord) || "pc".equals(productWord)) {
                    return "컴퓨터";
                }

                return productWord;
            }
        }

        return "";
    }

    private String cleanKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "";
        }

        Set<String> removeTokens = Set.of(
                "은", "는", "이", "가", "을", "를",
                "로", "으로", "에", "에서", "에게",
                "인", "의", "도", "만",
                "중", "중에", "중에서",
                "관련", "대상"
        );

        return Arrays.stream(keyword.split("\\s+"))
                .map(this::stripParticle)
                .filter(token -> !token.isBlank())
                .filter(token -> !removeTokens.contains(token))
                .collect(Collectors.joining(" "))
                .trim();
    }

    private String stripParticle(String token) {
        if (token == null || token.isBlank()) {
            return "";
        }

        String cleaned = token.trim();

        if (cleaned.length() <= 2) {
            return cleaned;
        }

        String[] particles = {
                "으로", "에서", "에게", "부터", "까지",
                "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "인"
        };

        for (String particle : particles) {
            if (cleaned.endsWith(particle) && cleaned.length() > particle.length() + 1) {
                return cleaned.substring(0, cleaned.length() - particle.length());
            }
        }

        return cleaned;
    }

    private String safeIntent(String intent) {
        if (intent == null || intent.isBlank()) {
            return "UNKNOWN";
        }

        return intent.trim().toUpperCase();
    }

    private boolean isClearDirectSearch(String message, ChatAnalysisResult result) {
        if (message == null || message.isBlank() || result == null) {
            return false;
        }

        String intent = safeIntent(result.getIntent());

        if (!"PRODUCT_RECOMMEND".equals(intent)
                && !"PRICE_COMPARE".equals(intent)) {
            return false;
        }

        String keyword = result.getKeyword();

        if (keyword == null || keyword.isBlank()) {
            return false;
        }

        boolean hasPriceCondition =
                result.getMinPrice() != null || result.getMaxPrice() != null;

        boolean hasKnownProduct =
                result.getProductType() != null && !result.getProductType().isBlank();

        if (!hasPriceCondition || !hasKnownProduct) {
            return false;
        }

        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", "");

        boolean hasRealUseCaseExpression = containsAny(
                normalized,
                "사용할만한",
                "사용할만",
                "쓸만한",
                "쓸만",
                "입문용",
                "학생",
                "중학생",
                "중학교",
                "초등학생",
                "고등학생",
                "부모님",
                "자녀",
                "선물",
                "게임",
                "게이밍",
                "롤",
                "배그",
                "배틀그라운드",
                "에이펙스",
                "에이팩스",
                "사이버펑크",
                "사무용",
                "코딩",
                "영상편집",
                "디자인",
                "가성비",
                "괜찮은",
                "좋은"
        );

        return !hasRealUseCaseExpression;
    }

    private boolean isSimpleDirectProductSearch(String message, ChatAnalysisResult result) {
        if (message == null || message.isBlank() || result == null) {
            return false;
        }

        String intent = safeIntent(result.getIntent());

        if (!"PRODUCT_RECOMMEND".equals(intent)
                && !"PRICE_COMPARE".equals(intent)) {
            return false;
        }

        String keyword = result.getKeyword();

        if (keyword == null || keyword.isBlank()) {
            return false;
        }

        String productType = result.getProductType();

        if (productType == null || productType.isBlank()) {
            return false;
        }

        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", "");

        boolean hasRealUseCaseExpression = containsAny(
                normalized,
                "사용할만한",
                "사용할만",
                "쓸만한",
                "쓸만",
                "입문용",
                "학생",
                "중학생",
                "중학교",
                "초등학생",
                "고등학생",
                "부모님",
                "자녀",
                "선물",
                "게임",
                "게이밍",
                "롤",
                "배그",
                "배틀그라운드",
                "에이펙스",
                "에이팩스",
                "사이버펑크",
                "사무용",
                "코딩",
                "영상편집",
                "디자인",
                "가성비",
                "괜찮은",
                "좋은",
                "저렴한",
                "싼",
                "고사양",
                "풀옵",
                "상옵",
                "쾌적"
        );

        if (hasRealUseCaseExpression) {
            return false;
        }

        boolean hasSimpleRequestWord = containsAny(
                normalized,
                "추천",
                "보여줘",
                "보여",
                "찾아줘",
                "찾아",
                "검색",
                "상품",
                "제품",
                "매물"
        );

        boolean isKnownProductSearch =
                "smartphone".equalsIgnoreCase(productType)
                        || "desktop".equalsIgnoreCase(productType)
                        || "laptop".equalsIgnoreCase(productType)
                        || "tablet".equalsIgnoreCase(productType)
                        || "earphone".equalsIgnoreCase(productType)
                        || "watch".equalsIgnoreCase(productType);

        return hasSimpleRequestWord && isKnownProductSearch;
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) {
            return false;
        }

        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }

        return false;
    }
}