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

            System.out.println("1. ?쒕??섏씠 遺꾩꽍 ?꾩슂: N");
            System.out.println("2. ?쒕??섏씠 ?몄텧 ?щ?: N");

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
                    ?꾩옱 ?섎쭏??以묎퀬嫄곕옒 留ㅻЪ???꾩옱媛, ?좎궗 ?곹뭹 ?됯퇏媛, 嫄곕옒?꾨즺 ?됯퇏媛瑜?以묒떖?쇰줈 鍮꾧탳?⑸땲??
                    ?쒖“??異쒖떆媛???뺢???蹂꾨룄 怨듭떇 ?곗씠?곌? ?놁뼱 ?뺥솗???덈궡?섍린 ?대졄?듬땲??
                    ???吏湲??깅줉??以묎퀬 留ㅻЪ 湲곗??쇰줈 媛寃⑹씠 ?곸젅?쒖???鍮꾧탳?대뱶由????덉뒿?덈떎.
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

            System.out.println("1. ?쒕??섏씠 遺꾩꽍 ?꾩슂: N");
            System.out.println("2. ?쒕??섏씠 ?몄텧 ?щ?: N");

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
            String answer = "?덈뀞?섏꽭?? 以묎퀬嫄곕옒 媛寃?鍮꾧탳 ?쒕퉬???섎쭏?낅땲?? ?곹뭹 寃?? 媛寃?鍮꾧탳, 李? ?쒖꽭, 媛寃??뚮┝?????臾쇱뼱蹂댁떎 ???덉뼱??";

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
                    ? "?꾩옱 ?깅줉???곹뭹? 珥?" + count + "媛쒖엯?덈떎. 李얘퀬 ?띠? ?곹뭹紐낆쓣 ?낅젰?섎㈃ 愿???곹뭹??異붿쿇?대뱶由????덉뒿?덈떎."
                    : "?꾩옱 ?깅줉???곹뭹 ?곗씠?곕뒗 以鍮?以묒엯?덈떎. ?곹뭹 ?곗씠?곌? ?섏쭛?섎㈃ 異붿쿇 寃곌낵瑜??덈궡?대뱶由????덉뒿?덈떎.";

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
            String answer = "?꾩옱 李?紐⑸줉 議고쉶 湲곕뒫? 以鍮?以묒엯?덈떎. ?곹뭹 ?곗씠?곗? 李??곗씠?곌? ?곌껐?섎㈃ 李쒗븳 ?곹뭹 紐⑸줉??蹂댁뿬?쒕┫ ???덉뒿?덈떎.";

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
                String answer = "?꾩쭅 ?깅줉???곹뭹 ?곗씠?곌? ?놁뒿?덈떎. ?곹뭹 ?곗씠?곌? ?섏쭛?섎㈃ 寃??湲곕줉怨??대┃ 湲곕줉??諛뷀깢?쇰줈 留욎땄 ?곹뭹??異붿쿇?대뱶由????덉뒿?덈떎.";

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
                    ? "?꾩쭅 留욎땄 異붿쿇???ъ슜??寃??湲곕줉?대굹 ?대┃ 湲곕줉??遺議깊빀?덈떎. 愿???덈뒗 ?곹뭹??寃?됲븯嫄곕굹 ?곹뭹???뺤씤?섎㈃ ???뺥솗??異붿쿇??諛쏆쓣 ???덉뒿?덈떎."
                    : "理쒓렐 寃??湲곕줉怨??뺤씤???곹뭹??諛뷀깢?쇰줈 留욎땄 ?곹뭹??異붿쿇?대뱶由닿쾶??";

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
                String answer = "李얘퀬 ?띠? ?곹뭹紐낆쓣 ?④퍡 ?낅젰??二쇱꽭?? ?덈? ?ㅼ뼱 '?꾩씠??13 蹂댁뿬以?, '?꾩씠??以묒뿉 30留뚯썝 ?댄븯 ?곹뭹 蹂댁뿬以?泥섎읆 臾쇱뼱蹂댁떎 ???덉뒿?덈떎.";

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
                String answer = "?꾩쭅 ?깅줉???곹뭹 ?곗씠?곌? ?놁뒿?덈떎. ?곹뭹 ?곗씠?곌? ?섏쭛?섎㈃ 議곌굔??留욌뒗 ?곹뭹??異붿쿇?대뱶由????덉뒿?덈떎.";

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
             * 以묒슂:
             * ?ш린??Gemini瑜??ㅼ떆 ?몄텧?섏? ?딅뒗??
             * analyzeMessage() ?④퀎?먯꽌 ?대? Gemini 遺꾩꽍???앸궗湲??뚮Ц??
             * 寃??寃곌낵媛 ?녿떎怨??ㅼ떆 analyzeMessageWithGemini()瑜??몄텧?섎㈃
             * keyword媛 鍮?媛믪쑝濡???씠嫄곕굹 議곌굔???붾뱾由????덈떎.
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
                String answer = "?쒖꽭瑜??뺤씤???곹뭹紐낆쓣 ?④퍡 ?낅젰??二쇱꽭?? ?덈? ?ㅼ뼱 '?꾩씠??14 ?쒖꽭 ?뚮젮以?泥섎읆 臾쇱뼱蹂댁떎 ???덉뒿?덈떎.";

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
                String answer = "?꾩쭅 ?깅줉???곹뭹 ?곗씠?곌? ?놁뒿?덈떎. ?곹뭹 ?곗씠?곌? ?섏쭛?섎㈃ ?쒖꽭? 媛寃?鍮꾧탳 寃곌낵瑜?蹂댁뿬?쒕┫ ???덉뒿?덈떎.";

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
                    媛寃??뚮┝? ?곹뭹??李쒗븳 ??紐⑺몴 媛寃⑹쓣 ?ㅼ젙?섎㈃ ?ъ슜?????덉뒿?덈떎.
                    ?대떦 ?곹뭹???꾩옱 媛寃⑹씠 紐⑺몴 媛寃??댄븯濡??대젮媛硫??뚮┝ ??곸쑝濡?泥섎━?????덉뒿?덈떎.
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
            String answer = "寃?됱갹???곹뭹紐낆쓣 ?낅젰?섎㈃ ?щ윭 以묎퀬嫄곕옒 ?뚮옯?쇱쓽 ?곹뭹???쒓납?먯꽌 鍮꾧탳?????덉뒿?덈떎. ?덈? ?ㅼ뼱 '?꾩씠??14', '媛ㅻ윮??S23', '?먯뼱???꾨줈'泥섎읆 ?낅젰?섎㈃ ?⑸땲??";

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
                ?꾩쭅 洹?吏덈Ц? ?뺥솗???댄빐?섏? 紐삵뻽?댁슂.
                ?섎쭏?먯꽌???곹뭹 寃?? 媛寃?鍮꾧탳, 李? ?쒖꽭, 媛寃??뚮┝ 愿??吏덈Ц???꾩??쒕┫ ???덉뒿?덈떎.
                ?덈? ?ㅼ뼱 '?꾩씠??13 ??댄븳 ?곹뭹 李얠븘以?, '李??섎뒗 諛⑸쾿 ?뚮젮以?, '媛寃??뚮┝? ?대뼸寃??ㅼ젙??'泥섎읆 臾쇱뼱蹂댁떎 ???덉뼱??
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
            return "李얘퀬 ?띠? ?곹뭹紐낆쓣 ?④퍡 ?낅젰??二쇱꽭?? ?덈? ?ㅼ뼱 '?꾩씠??13 蹂댁뿬以?, '諛곌렇 媛?ν븳 而댄벂??蹂댁뿬以?泥섎읆 臾쇱뼱蹂댁떎 ???덉뒿?덈떎.";
        }

        boolean isGaming = "gaming".equalsIgnoreCase(useCase);
        boolean isStudent = "student".equalsIgnoreCase(useCase);

        if (items.isEmpty()) {
            if (isGaming) {
                return "'" + keyword + "' 愿???곹뭹 以?"
                        + normalizeGameLabel(gameName)
                        + " ?뚮젅???꾨낫瑜?"
                        + performanceLevelToKorean(performanceLevel)
                        + " 湲곗??쇰줈 李얠? 紐삵뻽?듬땲?? ?꾩옱 ?곹뭹 ?쒕ぉ???ъ뼇 ?뺣낫媛 遺議깊븯嫄곕굹 議곌굔??留욌뒗 ?곹뭹???놁쓣 ???덉뒿?덈떎.";
            }

            if (isStudent) {
                return "'" + keyword + "' 愿???곹뭹 以??숈깮?⑹쑝濡?異붿쿇??留뚰븳 ?곹뭹??李얠? 紐삵뻽?듬땲?? ?곹뭹 ?곗씠?곌? ?꾩쭅 遺議깊븯嫄곕굹 議곌굔??留욌뒗 ?곹뭹???놁쓣 ???덉뒿?덈떎.";
            }

            if (minPrice != null && maxPrice != null) {
                return "'" + keyword + "' 愿???곹뭹 以?"
                        + String.format("%,d", minPrice)
                        + "???댁긽 "
                        + String.format("%,d", maxPrice)
                        + "???댄븯 議곌굔??留욌뒗 ?곹뭹??李얠? 紐삵뻽?듬땲??";
            }

            if (maxPrice != null && maxPrice > 0) {
                return "'" + keyword + "' 愿???곹뭹 以?"
                        + String.format("%,d", maxPrice)
                        + "???댄븯 議곌굔??留욌뒗 ?곹뭹??李얠? 紐삵뻽?듬땲??";
            }

            return "議곌굔??留욌뒗 異붿쿇 ?곹뭹??李얠? 紐삵뻽?듬땲?? ?곹뭹紐낆씠 ?꾩쭅 ?섏쭛?섏? ?딆븯嫄곕굹 寃??踰붿쐞媛 ?덈Т ?볦쓣 ???덉뒿?덈떎.";
        }

        if (isGaming) {
            String specGuide = gameSpecGuideService.makeGuide(gameName, performanceLevel);

            if (specGuide != null && !specGuide.isBlank()) {
                return specGuide + "\n\n"
                        + "?꾨옒??"
                        + normalizeGameLabel(gameName)
                        + " ?뚮젅?댁슜?쇰줈 蹂?留뚰븳 以묎퀬 "
                        + keyword
                        + " ?꾨낫?낅땲??";
            }

            return "'" + keyword + "' 愿???곹뭹 以?"
                    + normalizeGameLabel(gameName)
                    + " ?뚮젅???꾨낫瑜?"
                    + performanceLevelToKorean(performanceLevel)
                    + " 湲곗??쇰줈 ?뺣━?덉뒿?덈떎.";
        }

        if (isStudent) {
            return "'" + keyword + "' 愿???곹뭹 以??숈깮?⑹쑝濡??곌린 ?곷떦???꾨낫瑜?媛寃⑷낵 異붿쿇 湲곗??쇰줈 ?뺣━?덉뒿?덈떎.";
        }

        if (minPrice != null && maxPrice != null) {
            return "'" + keyword + "' 愿???곹뭹 以?"
                    + String.format("%,d", minPrice)
                    + "???댁긽 "
                    + String.format("%,d", maxPrice)
                    + "???댄븯 ?곹뭹??異붿쿇?쒖쑝濡??뺣━?덉뒿?덈떎.";
        }

        if (maxPrice != null && maxPrice > 0) {
            return "'" + keyword + "' 愿???곹뭹 以?"
                    + String.format("%,d", maxPrice)
                    + "???댄븯 ?곹뭹??媛寃⑷낵 異붿쿇 湲곗??쇰줈 ?뺣━?덉뒿?덈떎.";
        }

        return "'" + keyword + "' 愿???곹뭹 以?媛寃? ?좏샇?? 理쒖떊?깆쓣 湲곗??쇰줈 異붿쿇 ?곹뭹???뺣━?덉뒿?덈떎.";
    }

    private String makePriceCompareAnswer(String keyword, List<RecommendedItemDto> items) {
        if (keyword == null || keyword.isBlank()) {
            return "?쒖꽭瑜??뺤씤???곹뭹紐낆쓣 ?④퍡 ?낅젰??二쇱꽭?? ?덈? ?ㅼ뼱 '?꾩씠??14 ?쒖꽭 ?뚮젮以?泥섎읆 臾쇱뼱蹂댁떎 ???덉뒿?덈떎.";
        }

        if (items.isEmpty()) {
            return "?쒖꽭 鍮꾧탳 ????곹뭹??李얠? 紐삵뻽?듬땲?? ?곹뭹紐낆씠 ?꾩쭅 ?섏쭛?섏? ?딆븯嫄곕굹 寃??踰붿쐞媛 ?덈Т ?볦쓣 ???덉뒿?덈떎.";
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
            return "'" + keyword + "' 愿???곹뭹??李얠븯?듬땲?? 媛寃??뺣낫媛 ?덈뒗 ?곹뭹 ?꾩＜濡??뺤씤??二쇱꽭??";
        }

        return "'" + keyword + "' 愿???곹뭹???꾩옱 媛寃⑸?????"
                + String.format("%,d", minPrice)
                + "??~ "
                + String.format("%,d", maxPrice)
                + "?먯엯?덈떎. ?꾨옒 ?곹뭹?ㅼ쓣 湲곗??쇰줈 鍮꾧탳??蹂댁꽭??";
    }

    private String normalizeGameLabel(String gameName) {
        if (gameName == null || gameName.isBlank()) {
            return "寃뚯엫";
        }

        return gameName;
    }

    private String performanceLevelToKorean(String performanceLevel) {
        if (performanceLevel == null || performanceLevel.isBlank()) {
            return "寃뚯엫??;
        }

        return switch (performanceLevel.toUpperCase()) {
            case "LOW" -> "??? ?ъ뼇";
            case "MID" -> "以묎컙 ?ъ뼇";
            case "HIGH" -> "?믪? ?ъ뼇";
            case "VERY_HIGH" -> "怨좎궗??;
            case "ULTRA" -> "?곴툒 ?ъ뼇";
            case "EXTREME" -> "理쒖긽湲??ъ뼇";
            default -> "寃뚯엫??;
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
        System.out.println("3. 梨쀫큸 遺꾩꽍 寃곌낵: "
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
        System.out.println("4. ?ъ슜??梨꾪똿: " + userMessage);
    }

    private void logBotAnswer(String answer) {
        System.out.println("5. 梨쀫큸 ?듬?: " + answer.replaceAll("\\s+", " ").trim());
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

        if (normalized.contains("?섑봽??)
                || normalized.contains("raft")) {
            return "?섑봽??;
        }

        if (normalized.contains("諛곌렇")
                || normalized.contains("諛고?洹몃씪?대뱶")
                || normalized.contains("pubg")) {
            return "諛곌렇";
        }

        if (normalized.contains("?ъ뒪??)
                || normalized.contains("rust")) {
            return "?ъ뒪??;
        }

        if (normalized.contains("濡?)
                || normalized.contains("由ш렇?ㅻ툕?덉쟾??)
                || normalized.contains("lol")) {
            return "濡?;
        }

        if (normalized.contains("?ㅻ쾭?뚯튂")
                || normalized.contains("overwatch")) {
            return "?ㅻ쾭?뚯튂";
        }

        if (normalized.contains("諛쒕줈???)
                || normalized.contains("valorant")) {
            return "諛쒕줈???;
        }

        if (normalized.contains("留덉씤?щ옒?꾪듃")
                || normalized.contains("minecraft")) {
            return "留덉씤?щ옒?꾪듃";
        }

        return null;
    }

    private boolean isPriceAdviceQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String normalized = message.replaceAll("\\s+", "");

        return normalized.contains("援щℓ?대룄")
                || normalized.contains("?щ룄??)
                || normalized.contains("?щ룄??)
                || normalized.contains("?대쭔??)
                || normalized.contains("愿쒖갖?媛寃?)
                || normalized.contains("鍮꾩떬媛")
                || normalized.contains("鍮꾩떬")
                || normalized.contains("鍮꾩떥")
                || normalized.contains("?쒖?鍮?)
                || normalized.contains("?쒖씠?뉕쾶鍮?)
                || normalized.contains("媛寃⑹씠??)
                || normalized.contains("媛寃⑸넂")
                || normalized.contains("?쇨?")
                || normalized.contains("?곸젙媛")
                || normalized.contains("?대옒留먮옒")
                || normalized.contains("媛寃⑷킐李?);
    }

    private boolean isLaunchPriceQuestion(String message) {
        if (message == null || message.isBlank()) {
            return false;
        }

        String normalized = message.replaceAll("\\s+", "");

        return normalized.contains("異쒖떆媛")
                || normalized.contains("?뺢?")
                || normalized.contains("異쒓퀬媛")
                || normalized.contains("諛쒕ℓ媛")
                || normalized.contains("?덉젣?덇?寃?)
                || normalized.contains("?좏뭹媛寃?)
                || normalized.contains("以묎퀬留먭퀬");
    }
}

