package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatAnalysisResult;
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
        return generateText("?쒓뎅?대줈 'Gemini API ?곌껐 ?깃났'?대씪怨좊쭔 ?듯빐以?", 64);
    }

    public ChatAnalysisResult analyzeMessage(String message) {
        ChatAnalysisResult quickResult = normalizeGamingFallback(message, fallbackAnalyze(message));

        if (isClearDirectSearch(message, quickResult)
                || isSimpleDirectProductSearch(message, quickResult)) {

            quickResult.setUseCase(null);
            quickResult.setGameName(null);
            quickResult.setPerformanceLevel(null);

            System.out.println("1. ?쒕??섏씠 遺꾩꽍 ?꾩슂: N");
            System.out.println("2. ?쒕??섏씠 ?몄텧 ?щ?: N");

            return quickResult;
        }

        boolean needGemini = shouldUseGeminiForSearch(message, quickResult)
                || "UNKNOWN".equals(safeIntent(quickResult.getIntent()));

        System.out.println("1. ?쒕??섏씠 遺꾩꽍 ?꾩슂: " + (needGemini ? "Y" : "N"));

        if (!needGemini) {
            System.out.println("2. ?쒕??섏씠 ?몄텧 ?щ?: N");
            return normalizeGamingFallback(message, quickResult);
        }

        System.out.println("2. ?쒕??섏씠 ?몄텧 ?щ?: Y");

        ChatAnalysisResult geminiResult = normalizeGamingFallback(message, analyzeMessageWithGemini(message));

        if ("UNKNOWN".equals(safeIntent(geminiResult.getIntent()))) {
            return normalizeGamingFallback(message, quickResult);
        }

        if (isClearDirectSearch(message, geminiResult)
                || isSimpleDirectProductSearch(message, geminiResult)) {

            geminiResult.setUseCase(null);
            geminiResult.setGameName(null);
            geminiResult.setPerformanceLevel(null);
        }

        return normalizeGamingFallback(message, geminiResult);
    }

    public ChatAnalysisResult analyzeMessageWithGemini(String message) {
        String prompt = """
                ?덈뒗 以묎퀬嫄곕옒 媛寃?鍮꾧탳 ?쒕퉬?ㅼ쓽 寃??議곌굔 遺꾩꽍湲곕떎.

                ?ъ슜?먯쓽 硫붿떆吏瑜?遺꾩꽍?댁꽌 諛섎뱶??JSON留?異쒕젰?대씪.
                ?ㅻ챸 臾몄옣, 留덊겕?ㅼ슫, 肄붾뱶釉붾줉? 異쒕젰?섏? 留덈씪.

                intent 媛믪? ?꾨옒 以??섎굹留??ъ슜?대씪.
                FAQ, GREETING, ITEM_COUNT, WISHLIST_LIST,
                PRODUCT_RECOMMEND, PERSONAL_RECOMMEND,
                PRICE_COMPARE, PRICE_ALERT_GUIDE,
                SEARCH_HELP, UNKNOWN

                keyword??DB ?곹뭹 寃?됱뿉 ?ъ슜???듭떖 ?곹뭹紐낆씠??
                ?덈? ?ъ슜??臾몄옣 ?꾩껜瑜?keyword濡??ｌ? 留덈씪.

                ??
                - "?꾩씠??14 異붿쿇" ??keyword: "?꾩씠??14", productType: "smartphone", useCase: null
                - "?꾩씠??13 30留뚯썝 ?댄븯" ??keyword: "?꾩씠??13", productType: "smartphone", maxPrice: 300000
                - "?꾩씠???곹뭹??以묒뿉 以묓븰援?1?숇뀈???ъ슜?좊쭔???? ??keyword: "?꾩씠??, productType: "smartphone", useCase: "student"
                - "?명듃遺?50留뚯썝?먯꽌 100留뚯썝 ?ъ씠" ??keyword: "?명듃遺?, productType: "laptop", minPrice: 500000, maxPrice: 1000000
                - "而댄벂??30留뚯썝 ?꾨옒" ??keyword: "而댄벂??, productType: "desktop", maxPrice: 300000

                - "濡?媛?ν븳 而댄벂??蹂댁뿬以? ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "濡?, performanceLevel: "LOW"
                - "諛곌렇 媛?ν븳 而댄벂??蹂댁뿬以? ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "諛곌렇", performanceLevel: "MID"
                - "諛곌렇 ???媛?ν븳 而댄벂??蹂댁뿬以? ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "諛곌렇", performanceLevel: "EXTREME"
                - "?먯씠?숈뒪?덉쟾??媛?ν븳 而댄벂??蹂댁뿬以? ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?먯씠?숈뒪?덉쟾??, performanceLevel: "MID"
                - "?먯씠?⑹뒪?덉쟾??媛?ν븳 而댄벂??蹂댁뿬以? ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?먯씠?숈뒪?덉쟾??, performanceLevel: "MID"
                - "?먯씠?숈뒪?덉쟾??144hz 媛?ν븳 而댄벂??蹂댁뿬以? ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?먯씠?숈뒪?덉쟾??, performanceLevel: "HIGH"
                - "?ъ씠踰꾪럱??媛?ν븳 而댄벂??異붿쿇?댁쨾" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?ъ씠踰꾪럱??, performanceLevel: "HIGH"
                - "?ъ씠踰꾪럱?????而댄벂??異붿쿇?댁쨾" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?ъ씠踰꾪럱??, performanceLevel: "EXTREME"
                - "寃??좏솕 媛?ν븳 而댄벂??異붿쿇" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "寃??좏솕: ?ㅺ났", performanceLevel: "HIGH"
                - "寃??좏솕 ???而댄벂??異붿쿇" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "寃??좏솕: ?ㅺ났", performanceLevel: "EXTREME"
                - "?ъ뒪??媛?ν븳 而댄벂??異붿쿇" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?ъ뒪??, performanceLevel: "MID"
                - "?ъ뒪??媛?ν븳 而댄벂??異붿쿇" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: "?ъ뒪??, performanceLevel: "MID"
                - "紐⑤Ⅴ???ㅽ?寃뚯엫 媛?ν븳 而댄벂??異붿쿇" ??keyword: "而댄벂??, productType: "desktop", useCase: "gaming", gameName: null, performanceLevel: "HIGH"

                - "?뚰뀗?꾩뒪?꾩튂 異붿쿇" ??keyword: "?뚰뀗???ㅼ쐞移?, productType: "game_console", useCase: null
                - "?ㅼ쐞移?OLED 異붿쿇" ??keyword: "?뚰뀗???ㅼ쐞移?OLED", productType: "game_console", useCase: null
                - "?뚯뒪5 異붿쿇" ??keyword: "?뚯뒪5", productType: "game_console", useCase: null

                媛寃?洹쒖튃:
                - "30留뚯썝 ?댄븯", "30留뚯썝 ?꾨옒", "30留뚯썝源뚯?"??maxPrice = 300000
                - "50留뚯썝 ?댁긽", "50留뚯썝遺????minPrice = 500000
                - "50留뚯썝?먯꽌 100留뚯썝 ?ъ씠", "50留뚯썝 ?댁긽 100留뚯썝 ?댄븯", "50~100留뚯썝"? minPrice = 500000, maxPrice = 1000000
                - 媛寃?議곌굔???놁쑝硫?null

                productType 洹쒖튃:
                - 而댄벂?? ?곗뒪?ы깙, 蹂몄껜, PC ??"desktop"
                - ?명듃遺? ?⑺깙 ??"laptop"
                - ?ㅻ쭏?명룿, ?대??? ?꾩씠?? 媛ㅻ윮????"smartphone"
                - ?뚰뀗?? ?뚰뀗???ㅼ쐞移? ?ㅼ쐞移?OLED, ?뚯뒪, PS5, PS4, XBOX, ?ㅽ?????"game_console"
                - 洹??몃뒗 null

                useCase 洹쒖튃:
                - 濡? 諛곌렇, 寃뚯엫, 寃뚯씠諛? ???뚯븘媛?? 媛?ν븳, ?뚮젅?? ?ㅽ?寃뚯엫 ??"gaming"
                - 以묓븰?? 以묓븰援? 珥덈벑?숈깮, 怨좊벑?숈깮, ?숈깮, ?낅Ц?? 泥섏쓬 ?곕뒗, ?ъ슜?좊쭔?? ?몃쭔?? ?먮?, ?꾩씠 ??"student"
                - ?щТ?? 臾몄꽌?묒뾽 ??"office"
                - 肄붾뵫, 媛쒕컻 ??"coding"
                - ?곸긽?몄쭛, ?붿옄????"creative"
                - ?⑥닚??"異붿쿇", "蹂댁뿬以?, "?곹뭹", "?쒗뭹"留??덈뒗 寃쎌슦 useCase??null
                - 洹??몃뒗 null

                寃뚯엫紐?/ ?깅뒫 ?깃툒 洹쒖튃:
                - 濡? 由ш렇?ㅻ툕?덉쟾????gameName: "濡?, performanceLevel: "LOW"
                - 硫붿씠?? ?쇳뙆, ?쒕뱺, ?ㅽ??щ옒?꾪듃, 諛쒕줈?????performanceLevel: "LOW"
                - 諛곌렇, 諛고?洹몃씪?대뱶 ??gameName: "諛곌렇", performanceLevel: "MID"
                - ?먯씠?숈뒪, ?먯씠?숈뒪?덉쟾?? ?먯씠?⑹뒪, ?먯씠?⑹뒪?덉쟾?? apex ??gameName: "?먯씠?숈뒪?덉쟾??, performanceLevel: "MID"
                - ?ㅻ쾭?뚯튂, 濡쒖뒪?몄븘?? ?ъ뒪?? ?ъ뒪?? Rust ??performanceLevel: "MID"
                - ?ъ씠踰꾪럱?? ?ъ씠踰꾪럱??077, GTA, GTA5, ?섎뱺留? ?붿븘釉붾줈4, ?덈뜲由? ?덈뱶?곕뱶, ?ㅽ??꾨뱶, 寃??좏솕, 寃??좏솕 ?ㅺ났, Black Myth, Wukong, 理쒖떊 AAA 寃뚯엫, 怨좎궗??寃뚯엫 ??performanceLevel: "HIGH"
                - ?깅줉?섏? ?딆? 寃뚯엫紐낆씠?쇰룄 "媛?ν븳 而댄벂??, "?뚯븘媛??而댄벂??, "?뚮젅??媛?ν븳 而댄벂??, "?ㅽ?寃뚯엫" ?쒗쁽???덉쑝硫?useCase??"gaming"?대떎.
                - ?깅줉?섏? ?딆? 寃뚯엫???붽뎄 ?ъ뼇???뺤떊?섍린 ?대젮?곕㈃ performanceLevel? "HIGH"濡??붾떎.
                - QHD, 144Hz, ?믪??꾨젅?? 怨좏봽?덉엫, 苡뚯쟻, ?곸샃, 怨좎샃 ??performanceLevel: "HIGH"
                - 4K, ?덉씠?몃젅?댁떛, RT, ??듭뀡, ??? ?명듃?쇱샃?? ?명듃?? 理쒖긽?? 洹뱀긽?? ?ㅻ쾭?쒕씪?대툕 ??performanceLevel: "EXTREME"

                performanceLevel? ?꾨옒 以??섎굹留??ъ슜?대씪.
                LOW, MID, HIGH, EXTREME, UNKNOWN

                excludeAccessory????긽 true濡??붾떎.
                tradeStatus????긽 "SALE"濡??붾떎.

                異쒕젰 ?뺤떇:
                {
                  "intent": "PRODUCT_RECOMMEND",
                  "keyword": "而댄벂??,
                  "minPrice": null,
                  "maxPrice": null,
                  "productType": "desktop",
                  "useCase": "gaming",
                  "gameName": "?ъ씠踰꾪럱??,
                  "performanceLevel": "HIGH",
                  "excludeAccessory": true,
                  "tradeStatus": "SALE"
                }

                ?ъ슜??硫붿떆吏:
                %s
                """.formatted(message);

        try {
            String resultText = generateText(prompt, 256);

            ChatAnalysisResult result =
                    objectMapper.readValue(cleanJson(resultText), ChatAnalysisResult.class);

            applyFallbackValues(message, result);

            return normalizeGamingFallback(message, result);

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

            return normalizeGamingFallback(message, errorResult);
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
                "濡?,
                "諛곌렇",
                "諛고?洹몃씪?대뱶",
                "?먯씠?숈뒪",
                "?먯씠?숈뒪?덉쟾??,
                "?먯씠?⑹뒪",
                "?먯씠?⑹뒪?덉쟾??,
                "apex",
                "?ъ씠踰꾪럱??,
                "?ъ씠踰꾪럱??077",
                "?섎뱺留?,
                "gta",
                "?덈뜲由?,
                "?덈뱶?곕뱶",
                "?ㅽ??꾨뱶",
                "寃??좏솕",
                "寃??좏솕?ㅺ났",
                "blackmyth",
                "wukong",
                "?ъ뒪??,
                "?ъ뒪??,
                "rust",
                "?ㅽ?寃뚯엫",
                "steam寃뚯엫",
                "?⑤윴?⑥씠??,
                "寃뚯엫",
                "寃뚯씠諛?,
                "媛??,
                "媛?ν븳",
                "?섎룎??,
                "?뚯븘媛??,
                "?뚮젅??,
                "怨좎궗??,
                "理쒖떊寃뚯엫",
                "aaa",
                "144hz",
                "qhd",
                "4k",
                "?명듃??,
                "???,
                "?덉씠?몃젅?댁떛",
                "?щТ??,
                "??숈깮",
                "以묓븰??,
                "以묓븰援?,
                "珥덈벑?숈깮",
                "怨좊벑?숈깮",
                "?숈깮",
                "?낅Ц??,
                "泥섏쓬??,
                "泥섏쓬?ъ슜",
                "?ъ슜?좊쭔??,
                "?몃쭔??,
                "遺紐⑤떂",
                "?먮?",
                "?좊Ъ",
                "肄붾뵫",
                "媛쒕컻??,
                "?곸긽?몄쭛",
                "?붿옄??,
                "媛?깅퉬",
                "愿쒖갖?",
                "醫뗭?"
        );

        boolean hasPriceRangeExpression = containsAny(
                normalized,
                "?ъ씠",
                "遺??,
                "?먯꽌",
                "?댁긽",
                "?댄븯"
        ) && countPriceExpressions(message) >= 2;

        boolean hasPriceReasonExpression = containsAny(
                normalized,
                "?쒖?鍮?,
                "?쒖씠?뉕쾶鍮?,
                "鍮꾩떬?댁쑀",
                "鍮꾩떬嫄곗빞",
                "鍮꾩떬媛",
                "鍮꾩떥",
                "媛寃⑹씠??,
                "媛寃⑸넂"
        );

        String keyword = result.getKeyword();

        boolean keywordLooksLikeSentence =
                keyword != null
                        && keyword.trim().contains(" ")
                        && keyword.trim().length() >= 8
                        && containsAny(keyword.replaceAll("\\s+", ""),
                        "媛??,
                        "媛?깅퉬",
                        "?섎룎??,
                        "??숈깮",
                        "以묓븰??,
                        "以묓븰援?,
                        "?숈깮",
                        "?ъ슜?좊쭔??,
                        "?몃쭔??,
                        "?낅Ц??,
                        "遺紐⑤떂",
                        "?먮?",
                        "?좊Ъ",
                        "?щТ??);

        return hasUseCaseExpression
                || hasPriceRangeExpression
                || hasPriceReasonExpression
                || keywordLooksLikeSentence;
    }

    public String generateGeneralAnswer(String message) {
        String prompt = """
                ?덈뒗 以묎퀬嫄곕옒 媛寃?鍮꾧탳 ?쒕퉬?ㅼ쓽 梨쀫큸?대떎.

                ?쒕퉬???ㅻ챸:
                ???쒕퉬?ㅻ뒗 ?щ윭 以묎퀬嫄곕옒 ?뚮옯?쇱쓽 ?곹뭹???쒓납?먯꽌 寃?됲븯怨?
                媛寃?鍮꾧탳, 李? 媛寃??뚮┝, ?쒖꽭 ?뺤씤???꾩?二쇰뒗 ?쒕퉬?ㅻ떎.

                ?듬? 洹쒖튃:
                - ?쒓뎅?대줈 ?듬??대씪.
                - 2~3臾몄옣?쇰줈留??듬??대씪.
                - 臾몄옣??以묎컙???딆? 留먭퀬 ?꾩꽦?대씪.
                - 留덉?留?臾몄옣? ?꾧껐??臾몄옣?쇰줈 ?앸궡??
                - ?쒕퉬??湲곕뒫怨?愿?⑤맂 諛⑺뼢?쇰줈 ?덈궡?대씪.
                - ?뺤떎?섏? ?딆? ?댁슜? ?⑥젙?섏? 留덈씪.

                ?ъ슜??吏덈Ц:
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

        if (containsAny(normalized, "?덈뀞", "?섏씠", "諛섍???, "hello", "hi")) {
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

        if (containsAny(normalized, "李쒕ぉ濡?, "?댁컻", "愿?ъ긽??, "愿?щぉ濡?)
                || (normalized.contains("李?) && containsAny(normalized, "紐⑸줉", "蹂댁뿬", "議고쉶", "?뺤씤"))
                || (normalized.contains("愿??) && containsAny(normalized, "紐⑸줉", "蹂댁뿬", "議고쉶", "?뺤씤"))) {
            result.setIntent("WISHLIST_LIST");
            result.setKeyword(keyword);
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "媛寃⑹븣由?, "?뚮┝?ㅼ젙", "紐⑺몴媛寃?, "?щ쭩媛寃?)) {
            result.setIntent("PRICE_ALERT_GUIDE");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (normalized.contains("李?) && containsAny(normalized, "諛⑸쾿", "?대뼸寃?, "?ъ슜踰?, "?섎뒗踰?, "?댁?")) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMinPrice(null);
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "寃?됰갑踰?, "寃?됲븯?붾쾿", "寃?됱뼱?산쾶", "寃?됰룄?")
                || (normalized.contains("寃??) && containsAny(normalized, "諛⑸쾿", "?대뼸寃?, "?섎뒗踰?, "?꾩?"))) {
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
                        "異붿쿇", "怨⑤씪", "愿쒖갖?", "??댄븳", "??, "媛?깅퉬",
                        "李얠븘", "蹂댁뿬", "議고쉶", "寃??,
                        "?쒗뭹", "留ㅻЪ", "?곹뭹", "寃뚯떆臾?, "寃뚯떆湲",
                        "?깅줉?쒖긽??, "?깅줉?곹뭹", "援щℓ", "?щ젮怨?, "?대젮怨?)
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
            return normalizeGamingFallback(message, result);
        }

        if (containsAny(normalized, "?쒖꽭", "媛寃⑸퉬援?, "媛寃⑸?", "?쇰쭏", "理쒖?媛")) {
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
            return normalizeGamingFallback(message, result);
        }

        result.setIntent("UNKNOWN");
        result.setKeyword("");
        result.setMinPrice(null);
        result.setMaxPrice(null);
        return normalizeGamingFallback(message, result);
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
            keyword = "?곹뭹";
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

        normalizeGamingFallback(message, result);
    }

    private Long extractMinPrice(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        List<Long> prices = extractAllPrices(message);
        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", "");

        if (prices.size() >= 2 && containsAny(
                normalized,
                "?ъ씠",
                "?먯꽌",
                "遺??,
                "~",
                "-",
                "??,
                "??
        )) {
            return prices.get(0);
        }

        if (containsAny(normalized, "?댁긽", "遺??)) {
            return prices.isEmpty() ? null : prices.get(0);
        }

        return null;
    }

    private Long extractMaxPrice(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        List<Long> prices = extractAllPrices(message);
        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", "");

        if (prices.isEmpty()) {
            return null;
        }

        if (prices.size() >= 2 && containsAny(
                normalized,
                "?ъ씠",
                "?먯꽌",
                "遺??,
                "~",
                "-",
                "??,
                "??
        )) {
            return prices.get(1);
        }

        if (containsAny(normalized, "?댄븯", "誘몃쭔", "?꾨옒", "源뚯?", "?덉궛", "?덉そ")) {
            return prices.get(prices.size() - 1);
        }

        if (prices.size() == 1 && !containsAny(normalized, "?댁긽", "遺??)) {
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

        Pattern rangeManwonPattern = Pattern.compile("(\\d{1,4})\\s*[~\\-?볛?\\s*(\\d{1,4})\\s*留뚯썝");
        Matcher rangeManwonMatcher = rangeManwonPattern.matcher(text);

        while (rangeManwonMatcher.find()) {
            long first = Long.parseLong(rangeManwonMatcher.group(1));
            long second = Long.parseLong(rangeManwonMatcher.group(2));

            if (first >= 1 && first <= 5000 && second >= 1 && second <= 5000) {
                prices.add(first * 10_000);
                prices.add(second * 10_000);
            }
        }

        if (!prices.isEmpty()) {
            return prices;
        }

        Pattern fullRangeManwonPattern = Pattern.compile("(\\d{1,4})\\s*留뚯썝\\s*[~\\-?볛?\\s*(\\d{1,4})\\s*留뚯썝");
        Matcher fullRangeManwonMatcher = fullRangeManwonPattern.matcher(text);

        while (fullRangeManwonMatcher.find()) {
            long first = Long.parseLong(fullRangeManwonMatcher.group(1));
            long second = Long.parseLong(fullRangeManwonMatcher.group(2));

            if (first >= 1 && first <= 5000 && second >= 1 && second <= 5000) {
                prices.add(first * 10_000);
                prices.add(second * 10_000);
            }
        }

        if (!prices.isEmpty()) {
            return prices;
        }

        Pattern rangeWonPattern = Pattern.compile("(\\d{4,})\\s*[~\\-?볛?\\s*(\\d{4,})\\s*??);
        Matcher rangeWonMatcher = rangeWonPattern.matcher(text);

        while (rangeWonMatcher.find()) {
            prices.add(Long.parseLong(rangeWonMatcher.group(1)));
            prices.add(Long.parseLong(rangeWonMatcher.group(2)));
        }

        if (!prices.isEmpty()) {
            return prices;
        }

        Pattern manwonPattern = Pattern.compile("(\\d{1,4})\\s*留뚯썝");
        Matcher manwonMatcher = manwonPattern.matcher(text);

        while (manwonMatcher.find()) {
            long value = Long.parseLong(manwonMatcher.group(1));

            if (value >= 1 && value <= 5000) {
                prices.add(value * 10_000);
            }
        }

        Pattern wonPattern = Pattern.compile("(\\d{4,})\\s*??);
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

        if (containsAny(text,
                "?뚰뀗??,
                "?뚰뀗?꾩뒪?꾩튂",
                "?ㅼ쐞移?,
                "?ㅼ쐞移쁮led",
                "nintendoswitch",
                "switcholed",
                "?뚯뒪",
                "?뚯뒪5",
                "?뚯뒪4",
                "?뚮젅?댁뒪?뚯씠??,
                "?뚮젅?댁뒪?뚯씠??",
                "?뚮젅?댁뒪?뚯씠??",
                "ps5",
                "ps4",
                "xbox",
                "?묒뒪諛뺤뒪",
                "?ㅽ???,
                "steamdeck")) {
            return "game_console";
        }

        if (containsAny(text, "?명듃遺?, "?⑺깙")) {
            return "laptop";
        }

        if (containsAny(text, "而댄벂??, "?곗뒪?ы깙", "蹂몄껜", "pc")) {
            return "desktop";
        }

        if (containsAny(text, "?꾩씠??, "媛ㅻ윮??, "?ㅻ쭏?명룿", "?대???)) {
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
                "濡?,
                "諛곌렇",
                "諛고?洹몃씪?대뱶",
                "硫붿씠??,
                "硫붿씠?뚯뒪?좊━",
                "?먯씠?숈뒪",
                "?먯씠?⑹뒪",
                "?ъ씠踰꾪럱??,
                "?섎뱺留?,
                "寃??좏솕",
                "寃??좏솕?ㅺ났",
                "blackmyth",
                "wukong",
                "?ъ뒪??,
                "?ъ뒪??,
                "rust",
                "?ㅽ?寃뚯엫",
                "steam寃뚯엫",
                "寃뚯엫",
                "寃뚯씠諛?,
                "媛??,
                "媛?ν븳",
                "?뚯븘媛??,
                "?섎룎??,
                "?뚮젅??)) {
            return "gaming";
        }

        if (containsAny(normalized,
                "以묓븰??, "以묓븰援?,
                "珥덈벑?숈깮", "怨좊벑?숈깮",
                "?숈깮", "?먮?")) {
            return "student";
        }

        if (containsAny(normalized, "?щТ??, "臾몄꽌?묒뾽", "?낅Т??)) {
            return "office";
        }

        if (containsAny(normalized, "肄붾뵫", "媛쒕컻??, "?꾨줈洹몃옒諛?)) {
            return "coding";
        }

        if (containsAny(normalized, "?곸긽?몄쭛", "?붿옄??, "?ы넗??)) {
            return "creative";
        }

        return null;
    }

    private boolean isPersonalRecommendQuestion(String normalized) {
        return containsAny(normalized,
                "?섑븳?뚯텛泥?,
                "?섏뿉寃뚯텛泥?,
                "?댁텛泥?,
                "留욎땄異붿쿇",
                "媛쒖씤異붿쿇",
                "異붿쿇?댁쨪留뚰븳",
                "異붿쿇?좊쭔??,
                "?닿?醫뗭븘?좊쭔??,
                "醫뗭븘?좊쭔?쒖긽??,
                "?섑븳?뚮쭪??,
                "?섏뿉寃뚮쭪??);
    }

    private boolean isItemCountQuestion(String normalized, String keyword) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }

        boolean countOrExistQuestion =
                normalized.contains("?곹뭹")
                        && containsAny(normalized, "媛쒖닔", "紐뉕컻", "?깅줉", "?щ씪?", "?덉뼱", "?덈굹??, "?곗씠??);

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
                "?꾩씠??, "媛ㅻ윮??, "?먯뼱??, "留λ턿", "?꾩씠?⑤뱶",
                "?좏뵆?뚯튂",
                "?뚰뀗??, "?ㅼ쐞移?, "?뚰뀗?꾩뒪?꾩튂",
                "?뚯뒪", "ps5", "ps4", "?ㅽ???, "xbox", "?묒뒪諛뺤뒪",
                "?명듃遺?, "紐⑤땲??, "?ㅻ낫??, "留덉슦??, "移대찓??,
                "而댄벂??, "?곗뒪?ы깙", "蹂몄껜", "pc")) {
            return true;
        }

        return normalizedKeyword.matches(".*\\d+.*");
    }

    private boolean isSiteInfoQuestion(String normalized) {
        return containsAny(normalized,
                "臾댁뒯?ъ씠??,
                "?대뼡?ъ씠??,
                "?ъ씠?몄꽕紐?,
                "?쒕퉬?ㅼ꽕紐?,
                "萸먰븯?붿궗?댄듃",
                "萸먰븯?붿꽌鍮꾩뒪",
                "?댁궗?댄듃",
                "?섎쭏?ㅻ챸",
                "?섎쭏媛萸?,
                "?섎쭏?붾춴",
                "?대뼡?쒕퉬??,
                "?쒕퉬?ㅼ냼媛?)
                || (
                containsAny(normalized, "?ъ씠??, "?쒕퉬??, "?섎쭏")
                        && containsAny(normalized, "?ㅻ챸", "?뚭컻", "萸?, "臾댁뾿", "?뚮젮", "??댁꽌")
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
                .replaceAll("\\d+\\s*留뚯썝\\s*(?댄븯???댄븯|誘몃쭔??誘몃쭔|?꾨옒???꾨옒|?댁긽???댁긽|遺??源뚯?|?덉そ|?|?ъ씠)?", "")
                .replaceAll("\\d{1,3}(,\\d{3})+\\s*??\s*(?댄븯???댄븯|誘몃쭔??誘몃쭔|?꾨옒???꾨옒|?댁긽???댁긽|遺??源뚯?|?덉そ|?|?ъ씠)?", "")
                .replaceAll("\\d+\\s*??\s*(?댄븯???댄븯|誘몃쭔??誘몃쭔|?꾨옒???꾨옒|?댁긽???댁긽|遺??源뚯?|?덉そ|?|?ъ씠)?", "")

                .replace("異붿쿇?댁쨾", "")
                .replace("異붿쿇", "")
                .replace("怨⑤씪以?, "")
                .replace("怨⑤씪", "")
                .replace("李얠븘以?, "")
                .replace("李얠븘", "")
                .replace("寃?됲빐以?, "")
                .replace("寃??, "")
                .replace("?뚮젮以?, "")
                .replace("蹂댁뿬以?, "")
                .replace("蹂댁뿬", "")
                .replace("議고쉶?댁쨾", "")
                .replace("議고쉶", "")
                .replace("?뺤씤?댁쨾", "")
                .replace("?뺤씤", "")
                .replace("?댁쨾", "")

                .replace("?곹뭹??, "")
                .replace("?곹뭹", "")
                .replace("?쒗뭹??, "")
                .replace("?쒗뭹", "")
                .replace("留ㅻЪ??, "")
                .replace("留ㅻЪ", "")
                .replace("寃뚯떆湲", "")
                .replace("寃뚯떆臾?, "")
                .replace("寃껊뱾??, "")
                .replace("寃껊뱾", "")
                .replace("寃?, "")

                .replace("?쒖꽭", "")
                .replace("媛寃?, "")
                .replace("鍮꾧탳", "")
                .replace("?쇰쭏", "")
                .replace("理쒖?媛", "")
                .replace("?쒖씪", "")
                .replace("媛??, "")
                .replace("??댄븳", "")
                .replace("??댄븯寃?, "")
                .replace("?쇨굅", "")
                .replace("??嫄?, "")
                .replace("??, "")
                .replace("?댄븯??, "")
                .replace("?댄븯", "")
                .replace("?꾨옒??, "")
                .replace("?꾨옒", "")
                .replace("誘몃쭔??, "")
                .replace("誘몃쭔", "")
                .replace("?댁긽??, "")
                .replace("?댁긽", "")
                .replace("遺??, "")
                .replace("源뚯?", "")
                .replace("?덉そ", "")
                .replace("?덉궛", "")

                .replace("?꾩옱", "")
                .replace("吏湲?, "")
                .replace("?뱀떆", "")
                .replace("?대뼡", "")
                .replace("萸먭?", "")
                .replace("萸?, "")
                .replace("?덈뒗", "")
                .replace("?덉뼱?", "")
                .replace("?덉뼱", "")
                .replace("?덈굹??, "")
                .replace("?덉쓣源?, "")
                .replace("?덈깘", "")
                .replace("?덉쓬", "")
                .replace("醫", "")

                .replace("?", "")
                .replace("!", "")
                .replace(".", "")
                .replace(",", "")
                .replace("'", "")
                .replace("\"", "")

                .replace("?깅줉??, "")
                .replace("?깅줉?섏뼱?덈뒗", "")
                .replace("?깅줉?섏뼱", "")
                .replace("?깅줉", "")
                .replace("?щ씪??, "")
                .replace("?щ씪??덈뒗", "")
                .replace("?щ씪?", "")

                .replace("以묒뿉??, "")
                .replace("以묒뿉", "")
                .replace("?먯꽌", "")
                .replace("?ъ씠", "")

                .replace("援щℓ?섎젮怨??섎뒗??, "")
                .replace("援щℓ?섎젮怨?, "")
                .replace("援щℓ?섍퀬 ?띠???, "")
                .replace("援щℓ?섍퀬?띠???, "")
                .replace("?щ젮怨??섎뒗??, "")
                .replace("?щ젮怨?, "")
                .replace("?대젮怨??섎뒗??, "")
                .replace("?대젮怨?, "")
                .replace("?ш퀬 ?띠???, "")
                .replace("?ш퀬?띠???, "")
                .replace("援щℓ", "")

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

        String compact = normalized.replaceAll("\\s+", "");

        boolean hasComputerWord = containsAny(
                compact,
                "而댄벂??,
                "?곗뒪?ы깙",
                "蹂몄껜",
                "pc"
        );

        boolean hasGameWord = containsAny(
                compact,
                "濡?,
                "由ш렇?ㅻ툕?덉쟾??,
                "lol",
                "硫붿씠??,
                "硫붿씠?뚯뒪?좊━",
                "?쇳뙆",
                "?쒕뱺",
                "?ㅽ??щ옒?꾪듃",
                "諛곌렇",
                "諛고?洹몃씪?대뱶",
                "pubg",
                "?먯씠?숈뒪",
                "?먯씠?⑹뒪",
                "?먯씠?숈뒪?덉쟾??,
                "?먯씠?⑹뒪?덉쟾??,
                "apex",
                "?ㅻ쾭?뚯튂",
                "濡쒖뒪?몄븘??,
                "濡쒖븘",
                "諛쒕줈???,
                "?ъ씠踰꾪럱??,
                "?섎뱺留?,
                "gta",
                "?붿븘釉붾줈",
                "?ㅽ??꾨뱶",
                "寃??좏솕",
                "寃??좏솕?ㅺ났",
                "blackmyth",
                "wukong",
                "?ъ뒪??,
                "?ъ뒪??,
                "rust",
                "?ㅽ?寃뚯엫"
        );

        if (hasComputerWord && hasGameWord) {
            return "而댄벂??;
        }

        if (containsAny(compact,
                "?뚰뀗?꾩뒪?꾩튂oled",
                "?ㅼ쐞移쁮led",
                "nintendoswitcholed",
                "switcholed")) {
            return "?뚰뀗???ㅼ쐞移?OLED";
        }

        if (containsAny(compact,
                "?뚰뀗?꾩뒪?꾩튂",
                "?뚰뀗?꼜witch",
                "nintendoswitch")) {
            return "?뚰뀗???ㅼ쐞移?;
        }

        if (containsAny(compact, "?뚰뀗??)) {
            return "?뚰뀗??;
        }

        if (containsAny(compact, "?뚯뒪5", "ps5", "?뚮젅?댁뒪?뚯씠??")) {
            return "?뚯뒪5";
        }

        if (containsAny(compact, "?뚯뒪4", "ps4", "?뚮젅?댁뒪?뚯씠??")) {
            return "?뚯뒪4";
        }

        if (containsAny(compact, "?ㅽ???, "steamdeck")) {
            return "?ㅽ???;
        }

        if (containsAny(compact, "xbox", "?묒뒪諛뺤뒪")) {
            return "xbox";
        }

        Pattern iphonePattern = Pattern.compile(
                "(?꾩씠??\\s*(\\d{1,2})?\\s*(?꾨줈留μ뒪|?꾨줈\\s*留μ뒪|?꾨줈|max|誘몃땲|mini|plus|?뚮윭???\\s*(?!留뚯썝|??"
        );

        Matcher iphoneMatcher = iphonePattern.matcher(normalized);

        if (iphoneMatcher.find()) {
            String base = iphoneMatcher.group(1);
            String number = iphoneMatcher.group(2);
            String model = iphoneMatcher.group(3);

            if (number != null && !number.isBlank()) {
                int modelNumber = Integer.parseInt(number);

                if (modelNumber < 4 || modelNumber > 20) {
                    number = null;
                    model = null;
                }
            }

            StringBuilder keyword = new StringBuilder(base);

            if (number != null && !number.isBlank()) {
                keyword.append(" ").append(number);
            }

            if (model != null && !model.isBlank()) {
                model = model.replace("?꾨줈 留μ뒪", "?꾨줈留μ뒪");
                model = model.replace("max", "?꾨줈留μ뒪");
                model = model.replace("mini", "誘몃땲");
                model = model.replace("plus", "?뚮윭??);
                keyword.append(" ").append(model);
            }

            return keyword.toString().trim();
        }

        Pattern galaxyPattern = Pattern.compile("(媛ㅻ윮??\\s*(s\\d{1,2}|z\\s*?뚮┰\\d*|z\\s*?대뱶\\d*|?뚮┰\\d*|?대뱶\\d*|?명듃\\d*)?");
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

        if (normalized.contains("?먯뼱??)) {
            if (normalized.contains("?꾨줈")) {
                return "?먯뼱???꾨줈";
            }

            if (normalized.contains("留μ뒪")) {
                return "?먯뼱??留μ뒪";
            }

            if (normalized.contains("2?몃?")) {
                return "?먯뼱??2?몃?";
            }

            if (normalized.contains("3?몃?")) {
                return "?먯뼱??3?몃?";
            }

            return "?먯뼱??;
        }

        if (normalized.contains("留λ턿")) {
            if (normalized.contains("?꾨줈")) {
                return "留λ턿 ?꾨줈";
            }

            if (normalized.contains("?먯뼱")) {
                return "留λ턿 ?먯뼱";
            }

            return "留λ턿";
        }

        if (normalized.contains("?꾩씠?⑤뱶")) {
            if (normalized.contains("?꾨줈")) {
                return "?꾩씠?⑤뱶 ?꾨줈";
            }

            if (normalized.contains("?먯뼱")) {
                return "?꾩씠?⑤뱶 ?먯뼱";
            }

            if (normalized.contains("誘몃땲")) {
                return "?꾩씠?⑤뱶 誘몃땲";
            }

            return "?꾩씠?⑤뱶";
        }

        if (normalized.contains("?좏뵆?뚯튂")) {
            return "?좏뵆?뚯튂";
        }

        String[] productWords = {
                "?명듃遺?,
                "紐⑤땲??,
                "?ㅻ낫??,
                "留덉슦??,
                "移대찓??,
                "而댄벂??,
                "?곗뒪?ы깙",
                "蹂몄껜",
                "pc"
        };

        for (String productWord : productWords) {
            if (normalized.contains(productWord)) {
                if ("?곗뒪?ы깙".equals(productWord) || "蹂몄껜".equals(productWord) || "pc".equals(productWord)) {
                    return "而댄벂??;
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
                "?", "??, "??, "媛", "??, "瑜?,
                "濡?, "?쇰줈", "??, "?먯꽌", "?먭쾶",
                "??, "??, "??, "留?,
                "以?, "以묒뿉", "以묒뿉??,
                "愿??, "???
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
                "?쇰줈", "?먯꽌", "?먭쾶", "遺??, "源뚯?",
                "?", "??, "??, "媛", "??, "瑜?, "??, "??, "??, "留?, "??
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
                "?ъ슜?좊쭔??,
                "?ъ슜?좊쭔",
                "?몃쭔??,
                "?몃쭔",
                "?낅Ц??,
                "?숈깮",
                "以묓븰??,
                "以묓븰援?,
                "珥덈벑?숈깮",
                "怨좊벑?숈깮",
                "遺紐⑤떂",
                "?먮?",
                "?좊Ъ",
                "寃뚯엫",
                "寃뚯씠諛?,
                "濡?,
                "硫붿씠??,
                "諛곌렇",
                "諛고?洹몃씪?대뱶",
                "?먯씠?숈뒪",
                "?먯씠?⑹뒪",
                "?ъ씠踰꾪럱??,
                "寃??좏솕",
                "?ъ뒪??,
                "?ъ뒪??,
                "?ㅽ?寃뚯엫",
                "媛??,
                "媛?ν븳",
                "?뚯븘媛??,
                "?섎룎??,
                "?뚮젅??,
                "?щТ??,
                "肄붾뵫",
                "?곸긽?몄쭛",
                "?붿옄??,
                "媛?깅퉬",
                "愿쒖갖?",
                "醫뗭?"
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
                "?ъ슜?좊쭔??,
                "?ъ슜?좊쭔",
                "?몃쭔??,
                "?몃쭔",
                "?낅Ц??,
                "?숈깮",
                "以묓븰??,
                "以묓븰援?,
                "珥덈벑?숈깮",
                "怨좊벑?숈깮",
                "遺紐⑤떂",
                "?먮?",
                "?좊Ъ",
                "寃뚯엫",
                "寃뚯씠諛?,
                "濡?,
                "硫붿씠??,
                "諛곌렇",
                "諛고?洹몃씪?대뱶",
                "?먯씠?숈뒪",
                "?먯씠?⑹뒪",
                "?ъ씠踰꾪럱??,
                "寃??좏솕",
                "?ъ뒪??,
                "?ъ뒪??,
                "?ㅽ?寃뚯엫",
                "媛??,
                "媛?ν븳",
                "?뚯븘媛??,
                "?섎룎??,
                "?뚮젅??,
                "?щТ??,
                "肄붾뵫",
                "?곸긽?몄쭛",
                "?붿옄??,
                "媛?깅퉬",
                "愿쒖갖?",
                "醫뗭?",
                "??댄븳",
                "??,
                "怨좎궗??,
                "???,
                "?곸샃",
                "苡뚯쟻"
        );

        if (hasRealUseCaseExpression) {
            return false;
        }

        boolean hasSimpleRequestWord = containsAny(
                normalized,
                "異붿쿇",
                "蹂댁뿬以?,
                "蹂댁뿬",
                "李얠븘以?,
                "李얠븘",
                "寃??,
                "?곹뭹",
                "?쒗뭹",
                "留ㅻЪ"
        );

        boolean isKnownProductSearch =
                "smartphone".equalsIgnoreCase(productType)
                        || "desktop".equalsIgnoreCase(productType)
                        || "laptop".equalsIgnoreCase(productType)
                        || "tablet".equalsIgnoreCase(productType)
                        || "earphone".equalsIgnoreCase(productType)
                        || "watch".equalsIgnoreCase(productType)
                        || "game_console".equalsIgnoreCase(productType);

        return hasSimpleRequestWord && isKnownProductSearch;
    }

    private ChatAnalysisResult normalizeGamingFallback(String message, ChatAnalysisResult result) {
        if (result == null || message == null || message.isBlank()) {
            return result;
        }

        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", "");

        boolean asksPlayableComputer =
                containsAny(normalized,
                        "媛?ν븳而댄벂??,
                        "媛?μ뺨?⑦꽣",
                        "?뚯븘媛?붿뺨?⑦꽣",
                        "?섎룎?꾧??붿뺨?⑦꽣",
                        "?뚮젅?닿???,
                        "?뚮젅?댄븷?섏엳?붿뺨?⑦꽣",
                        "?ㅽ?寃뚯엫",
                        "steam寃뚯엫",
                        "寃뚯엫??)
                        || (
                        containsAny(normalized,
                                "媛??,
                                "媛?ν븳",
                                "?뚯븘媛",
                                "?섎룎??,
                                "?뚮젅??)
                                && containsAny(normalized,
                                "而댄벂??,
                                "?곗뒪?ы깙",
                                "蹂몄껜",
                                "pc")
                );

        boolean isDesktopRequest =
                "desktop".equalsIgnoreCase(result.getProductType())
                        || containsAny(normalized,
                        "而댄벂??,
                        "?곗뒪?ы깙",
                        "蹂몄껜",
                        "pc");

        boolean isGameConsoleRequest =
                "game_console".equalsIgnoreCase(result.getProductType())
                        || containsAny(normalized,
                        "?뚯뒪",
                        "ps5",
                        "ps4",
                        "?뚰뀗??,
                        "?ㅼ쐞移?,
                        "xbox",
                        "?ㅽ???);

        if (!asksPlayableComputer || !isDesktopRequest || isGameConsoleRequest) {
            return result;
        }

        result.setIntent("PRODUCT_RECOMMEND");
        result.setKeyword("而댄벂??);
        result.setProductType("desktop");

        if (result.getUseCase() == null || result.getUseCase().isBlank()) {
            result.setUseCase("gaming");
        }

        String resolvedGameName = gamePerformanceResolver.resolveGameName(message);

        if ((result.getGameName() == null || result.getGameName().isBlank())
                && resolvedGameName != null && !resolvedGameName.isBlank()) {
            result.setGameName(resolvedGameName);
        }

        if (result.getGameName() == null || result.getGameName().isBlank()) {
            String unknownGameName = extractUnknownGameName(message);

            if (!unknownGameName.isBlank()) {
                result.setGameName(unknownGameName);
            }
        }

        String resolvedLevel = gamePerformanceResolver.resolveByMessage(message);
        String currentLevel = result.getPerformanceLevel();

        boolean hasKnownGame = resolvedGameName != null && !resolvedGameName.isBlank();

        if (currentLevel == null || currentLevel.isBlank() || "UNKNOWN".equalsIgnoreCase(currentLevel)) {
            if (resolvedLevel != null && !resolvedLevel.isBlank()) {
                result.setPerformanceLevel(resolvedLevel);
            } else {
                result.setPerformanceLevel("HIGH");
            }
        }

        if (!hasKnownGame
                && "MID".equalsIgnoreCase(result.getPerformanceLevel())
                && containsAny(normalized, "?ㅽ?寃뚯엫", "steam寃뚯엫", "媛??, "媛?ν븳", "?뚯븘媛??, "?뚮젅??)) {
            result.setPerformanceLevel("HIGH");
        }

        if (containsAny(normalized,
                "4k",
                "???,
                "??듭뀡",
                "?명듃??,
                "?명듃?쇱샃??,
                "理쒖긽??,
                "洹뱀긽??,
                "?덉씠?몃젅?댁떛",
                "raytracing",
                "?ㅻ쾭?쒕씪?대툕")) {
            result.setPerformanceLevel("EXTREME");
        }

        result.setExcludeAccessory(true);
        result.setTradeStatus("SALE");

        return result;
    }

    private String extractUnknownGameName(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }

        String cleaned = message
                .replaceAll("(?i)black\\s*myth", "寃??좏솕")
                .replaceAll("(?i)wukong", "?ㅺ났")
                .replaceAll("(?i)rust", "?ъ뒪??)
                .replace("?ㅽ?寃뚯엫", "")
                .replace("steam寃뚯엫", "")
                .replace("以묒뿉", "")
                .replace("以묒뿉??, "")
                .replace("媛?ν븳", "")
                .replace("媛??, "")
                .replace("?뚯븘媛??, "")
                .replace("?섎룎?꾧???, "")
                .replace("?뚮젅??, "")
                .replace("而댄벂??, "")
                .replace("?곗뒪?ы깙", "")
                .replace("蹂몄껜", "")
                .replace("pc", "")
                .replace("PC", "")
                .replace("異붿쿇?댁쨾", "")
                .replace("異붿쿇", "")
                .replace("蹂댁뿬以?, "")
                .replace("蹂댁뿬", "")
                .replace("李얠븘以?, "")
                .replace("李얠븘", "")
                .replace("寃뚯엫", "")
                .replace("寃뚯씠諛?, "")
                .replace("?곹뭹", "")
                .replace("?쒗뭹", "")
                .replace("留ㅻЪ", "")
                .replace("??듭뀡", "")
                .replace("???, "")
                .replace("?명듃?쇱샃??, "")
                .replace("?명듃??, "")
                .replace("4k", "")
                .replace("4K", "")
                .replace("QHD", "")
                .replace("qhd", "")
                .replace("144hz", "")
                .replace("144Hz", "")
                .replace("?", "")
                .replace("!", "")
                .replace(",", "")
                .replace(".", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (cleaned.length() < 2) {
            return "";
        }

        if (cleaned.length() > 20) {
            return "";
        }

        return cleaned;
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

