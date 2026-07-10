package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatAnalysisResult;
import com.used.service.chatbot.dto.RecommendedItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class GeminiClientService {

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;
    private final GamePerformanceResolver gamePerformanceResolver;

    @Value("${gemini.model}")
    private String model;

    public String testConnection() {
        return generateText("Gemini API connection test. Reply shortly.", 64);
    }

    public ChatAnalysisResult analyzeMessage(String message) {
        ChatAnalysisResult quickResult = fallbackAnalyze(message);
        boolean needGemini = shouldUseGeminiForSearch(message, quickResult)
                || "UNKNOWN".equals(safeIntent(quickResult.getIntent()));

        System.out.println("1. Gemini analysis required: " + (needGemini ? "Y" : "N"));
        if (!needGemini) {
            System.out.println("2. Gemini called: N");
            return quickResult;
        }

        System.out.println("2. Gemini called: Y");
        ChatAnalysisResult geminiResult = analyzeMessageWithGemini(message);
        if ("UNKNOWN".equals(safeIntent(geminiResult.getIntent()))) {
            return quickResult;
        }
        return applyFallbackValues(message, geminiResult);
    }

    public ChatAnalysisResult analyzeMessageWithGemini(String message) {
        String prompt = """
                Analyze this user message for a used-product price comparison chatbot.
                Return JSON only.
                intent values: FAQ, GREETING, ITEM_COUNT, WISHLIST_LIST, PRODUCT_RECOMMEND, PERSONAL_RECOMMEND, PRICE_COMPARE, PRICE_ALERT_GUIDE, SEARCH_HELP, UNKNOWN
                productType values: desktop, laptop, smartphone, game_console, null
                useCase values: gaming, student, office, coding, creative, null
                performanceLevel values: LOW, MID, HIGH, EXTREME, UNKNOWN, null
                If the user asks for a computer that can run a game, use keyword "computer", productType "desktop", useCase "gaming".

                User message:
                %s
                """.formatted(message);

        try {
            String resultText = generateText(prompt, 256);
            ChatAnalysisResult result = objectMapper.readValue(cleanJson(resultText), ChatAnalysisResult.class);
            return applyFallbackValues(message, result);
        } catch (Exception exception) {
            ChatAnalysisResult result = new ChatAnalysisResult();
            result.setIntent("UNKNOWN");
            result.setKeyword("");
            result.setExcludeAccessory(true);
            result.setTradeStatus("SALE");
            return applyFallbackValues(message, result);
        }
    }

    public boolean shouldUseGeminiForSearch(String message, ChatAnalysisResult result) {
        if (message == null || message.isBlank()) return false;
        String text = normalize(message);
        String intent = result == null ? "UNKNOWN" : safeIntent(result.getIntent());
        if (!"PRODUCT_RECOMMEND".equals(intent) && !"PRICE_COMPARE".equals(intent) && !"UNKNOWN".equals(intent)) return false;

        boolean hasContextExpression = containsAny(text, "why", "expensive", "price", "launch", "msrp", "game", "gaming", "student", "compare", "judge")
                || containsKoreanContext(text);
        boolean keywordLooksBad = result != null && result.getKeyword() != null && result.getKeyword().trim().length() > 12 && result.getKeyword().contains(" ");
        return hasContextExpression || keywordLooksBad;
    }

    public String generateGeneralAnswer(String message) {
        String prompt = "Answer only about used-product search, recommendation, price comparison, and site usage. User: " + message;
        String answer = generateText(prompt, 512);
        return answer == null || answer.isBlank() || "{}".equals(answer) ? "This question could not be handled. Please include a product name or price comparison condition." : answer;
    }

    public String generateProductAnswer(
            String userMessage,
            ChatAnalysisResult analysis,
            List<RecommendedItemDto> items,
            String faqAnswer,
            String fallbackAnswer
    ) {
        if (items == null || items.isEmpty()) {
            return fallbackAnswer;
        }

        StringBuilder productContext = new StringBuilder();
        items.stream().limit(5).forEach(item -> productContext
                .append("- ")
                .append(safeText(item.getTitle()))
                .append(" | 현재가 ")
                .append(formatPrice(item.getCurrentPrice()))
                .append(" | 최저가 ")
                .append(formatPrice(item.getLowestPrice()))
                .append('\n'));

        String prompt = """
                You are Hama, a Korean used-product search assistant.
                Answer in Korean using only the supplied search results.
                Do not invent specifications, prices, product availability, or release information.
                First give a concise answer to the user's question, then explain the search criteria.
                Mention that the product cards shown below are the actual search results.
                Keep the answer within 5 short sentences.
                If FAQ guidance is supplied, use it only when it is relevant to the question.

                User question: %s
                Intent: %s
                Keyword: %s
                Product type: %s
                Use case: %s
                FAQ guidance: %s

                OpenSearch results:
                %s
                """.formatted(
                safeText(userMessage),
                analysis == null ? "" : safeText(analysis.getIntent()),
                analysis == null ? "" : safeText(analysis.getKeyword()),
                analysis == null ? "" : safeText(analysis.getProductType()),
                analysis == null ? "" : safeText(analysis.getUseCase()),
                safeText(faqAnswer),
                productContext
        );

        String answer = generateText(prompt, 768);
        if (isInvalidProductAnswer(answer)) {
            return fallbackAnswer;
        }
        return answer.trim();
    }

    private boolean isInvalidProductAnswer(String answer) {
        if (answer == null) return true;
        String trimmed = answer.trim();
        if (trimmed.isBlank() || "{}".equals(trimmed)) return true;
        if (trimmed.length() < 25) return true;

        String compact = trimmed.replaceAll("\\s+", "");
        if (compact.endsWith(",") || compact.endsWith("，") || compact.endsWith("、")) return true;
        if (compact.endsWith("아이폰") || compact.endsWith("갤럭시") || compact.endsWith("노트북") || compact.endsWith("컴퓨터")) return true;
        if (compact.matches(".*(아이폰|갤럭시|노트북|컴퓨터|상품|제품)[,，、]?$")) return true;

        return !compact.matches(".*(다\\.|요\\.|니다\\.|습니다\\.|세요\\.|다!|요!|니다!|습니다!|[.!?])$");
    }

    private ChatAnalysisResult fallbackAnalyze(String message) {
        ChatAnalysisResult result = new ChatAnalysisResult();
        result.setIntent("UNKNOWN");
        result.setKeyword("");
        result.setExcludeAccessory(true);
        result.setTradeStatus("SALE");
        return applyFallbackValues(message, result);
    }

    private ChatAnalysisResult applyFallbackValues(String message, ChatAnalysisResult result) {
        if (result == null) result = new ChatAnalysisResult();
        String text = normalize(message);

        if (containsAny(text, "hello", "hi") || text.contains("\uC548\uB155")) result.setIntent("GREETING");
        else if (text.contains("\uBA87\uAC1C") || containsAny(text, "count", "itemcount")) result.setIntent("ITEM_COUNT");
        else if (text.contains("\uCC1C") && text.contains("\uBAA9\uB85D")) result.setIntent("WISHLIST_LIST");
        else if (containsAny(text, "personal", "custom") || text.contains("\uB9DE\uCDA4")) result.setIntent("PERSONAL_RECOMMEND");
        else if (containsAny(text, "compare", "price") || text.contains("\uBE44\uAD50") || text.contains("\uBE44\uC2FC") || text.contains("\uC0B4\uAE4C")) result.setIntent("PRICE_COMPARE");
        else if (containsAny(text, "alert") || text.contains("\uC54C\uB9BC")) result.setIntent("PRICE_ALERT_GUIDE");
        else if (containsAny(text, "search") || text.contains("\uAC80\uC0C9")) result.setIntent("SEARCH_HELP");
        else if (containsAny(text, "recommend", "find") || text.contains("\uCD94\uCC9C") || text.contains("\uCC3E\uC544")) result.setIntent("PRODUCT_RECOMMEND");

        String gameName = gamePerformanceResolver.resolveGameName(message);
        String level = gamePerformanceResolver.resolveByMessage(message);
        boolean asksGamingComputer = (containsAny(text, "game", "gaming", "lol", "pubg", "cyberpunk") || containsKoreanGame(text))
                && (containsAny(text, "computer", "desktop", "pc") || text.contains("\uCEF4\uD4E8\uD130") || text.contains("\uBCF8\uCCB4"));

        if (asksGamingComputer) {
            result.setIntent("PRODUCT_RECOMMEND");
            result.setKeyword("\uCEF4\uD4E8\uD130");
            result.setProductType("desktop");
            result.setUseCase("gaming");
            result.setGameName(gameName);
            result.setPerformanceLevel(level == null ? "MID" : level);
        }

        if (isBlank(result.getKeyword())) result.setKeyword(extractKeyword(message));
        if (isBlank(result.getProductType())) result.setProductType(resolveProductType(result.getKeyword(), message));
        if (result.getMinPrice() == null || result.getMaxPrice() == null) applyPriceRange(message, result);
        if (isBlank(result.getGameName())) result.setGameName(gameName);
        if (isBlank(result.getPerformanceLevel())) result.setPerformanceLevel(level);
        if (result.getExcludeAccessory() == null) result.setExcludeAccessory(true);
        if (isBlank(result.getTradeStatus())) result.setTradeStatus("SALE");
        if ("UNKNOWN".equals(safeIntent(result.getIntent())) && !isBlank(result.getKeyword())) result.setIntent("PRODUCT_RECOMMEND");
        return result;
    }

    private String extractKeyword(String message) {
        String text = message == null ? "" : message.trim();
        String normalized = normalize(text);

        Matcher iphone = Pattern.compile("(?i)(iphone|\\uC544\\uC774\\uD3F0)\\s*(\\d{1,2})?\\s*(pro|max|mini|plus|\\uD504\\uB85C|\\uBBF8\\uB2C8|\\uD50C\\uB7EC\\uC2A4)?").matcher(text);
        if (iphone.find()) return compactKeyword("\uC544\uC774\uD3F0", iphone.group(2), iphone.group(3));

        Matcher galaxy = Pattern.compile("(?i)(galaxy|\\uAC24\\uB7ED\\uC2DC)\\s*(s\\d{1,2}|fold\\d*|flip\\d*|note\\d*)?").matcher(text);
        if (galaxy.find()) return compactKeyword("\uAC24\uB7ED\uC2DC", galaxy.group(2), null);

        if (normalized.contains("\uB9E5\uBD81")) return "\uB9E5\uBD81";
        if (normalized.contains("\uB178\uD2B8\uBD81")) return "\uB178\uD2B8\uBD81";
        if (normalized.contains("\uCEF4\uD4E8\uD130") || normalized.contains("pc")) return "\uCEF4\uD4E8\uD130";
        if (normalized.contains("\uB2CC\uD150\uB3C4") || normalized.contains("\uC2A4\uC704\uCE58")) return "\uB2CC\uD150\uB3C4 \uC2A4\uC704\uCE58";
        if (normalized.contains("ps5")) return "PS5";
        if (normalized.contains("ps4")) return "PS4";

        return text.replaceAll("(?i)recommend|find|compare|price|please", "").replaceAll("\\s+", " ").trim();
    }

    private String compactKeyword(String base, String number, String suffix) {
        StringBuilder keyword = new StringBuilder(base);
        if (number != null && !number.isBlank()) keyword.append(" ").append(number.trim());
        if (suffix != null && !suffix.isBlank()) keyword.append(" ").append(suffix.trim());
        return keyword.toString().trim();
    }

    private String resolveProductType(String keyword, String message) {
        String text = normalize((keyword == null ? "" : keyword) + " " + (message == null ? "" : message));
        if (containsAny(text, "computer", "desktop", "pc") || text.contains("\uCEF4\uD4E8\uD130") || text.contains("\uB370\uC2A4\uD06C\uD0D1")) return "desktop";
        if (containsAny(text, "laptop", "macbook") || text.contains("\uB178\uD2B8\uBD81") || text.contains("\uB9E5\uBD81")) return "laptop";
        if (containsAny(text, "iphone", "galaxy") || text.contains("\uC544\uC774\uD3F0") || text.contains("\uAC24\uB7ED\uC2DC")) return "smartphone";
        if (containsAny(text, "switch", "ps5", "ps4", "xbox") || text.contains("\uB2CC\uD150\uB3C4")) return "game_console";
        return null;
    }

    private void applyPriceRange(String message, ChatAnalysisResult result) {
        if (message == null) return;
        Matcher matcher = Pattern.compile("(\\d+)\\s*\uB9CC").matcher(message);
        if (matcher.find()) {
            long first = Long.parseLong(matcher.group(1)) * 10000L;
            if (matcher.find()) {
                long second = Long.parseLong(matcher.group(1)) * 10000L;
                result.setMinPrice(Math.min(first, second));
                result.setMaxPrice(Math.max(first, second));
            } else if (normalize(message).contains("\uC774\uD558") || normalize(message).contains("\uAE4C\uC9C0")) {
                result.setMaxPrice(first);
            } else if (normalize(message).contains("\uC774\uC0C1") || normalize(message).contains("\uBD80\uD130")) {
                result.setMinPrice(first);
            }
        }
    }

    private String generateText(String prompt, int maxOutputTokens) {
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of("temperature", 0.1, "maxOutputTokens", maxOutputTokens)
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
        } catch (RuntimeException exception) {
            return "{}";
        }
    }

    private String extractText(JsonNode response) {
        if (response == null) return "{}";
        JsonNode candidates = response.get("candidates");
        if (candidates == null || candidates.isEmpty()) return "{}";
        JsonNode parts = candidates.get(0).get("content").get("parts");
        if (parts == null || parts.isEmpty()) return "{}";
        JsonNode text = parts.get(0).get("text");
        return text == null ? "{}" : text.asText();
    }

    private String cleanJson(String text) {
        if (text == null || text.isBlank()) return "{}";
        String cleaned = text.replace("```json", "").replace("```", "").trim();
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');
        return start >= 0 && end >= start ? cleaned.substring(start, end + 1) : "{}";
    }

    private boolean containsKoreanContext(String text) {
        return text.contains("\uC65C") || text.contains("\uBE44\uC2F8") || text.contains("\uCD9C\uC2DC\uAC00") || text.contains("\uC815\uAC00") || text.contains("\uAC00\uACA9") || text.contains("\uD310\uB2E8");
    }

    private boolean containsKoreanGame(String text) {
        return text.contains("\uAC8C\uC784") || text.contains("\uB864") || text.contains("\uBC30\uADF8") || text.contains("\uC0AC\uC774\uBC84\uD391\uD06C");
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("\\s+", "").trim();
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) return false;
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) return true;
        }
        return false;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private String formatPrice(Long price) {
        return price == null || price <= 0 ? "정보 없음" : String.format("%,d원", price);
    }

    private String safeIntent(String intent) {
        return intent == null || intent.isBlank() ? "UNKNOWN" : intent.trim().toUpperCase();
    }
}
