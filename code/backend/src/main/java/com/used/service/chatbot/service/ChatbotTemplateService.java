package com.used.service.chatbot.service;

import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class ChatbotTemplateService {

    public Optional<TemplateAnswer> findAnswer(String userMessage) {
        if (userMessage == null || userMessage.isBlank()) {
            return Optional.empty();
        }

        String normalized = normalize(userMessage);

        if (isServiceIntroQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "SERVICE_INTRO",
                    "TEMPLATE",
                    """
                            ?섎쭏???щ윭 以묎퀬嫄곕옒 ?ъ씠?몄쓽 ?곹뭹 ?뺣낫瑜??쒓납?먯꽌 鍮꾧탳?????덇쾶 ?꾩?二쇰뒗 ?쒕퉬?ㅼ엯?덈떎.
                            ?곹뭹 寃?? 媛寃?鍮꾧탳, ?쒖꽭 ?뺤씤, 留욎땄 異붿쿇, 李? ?뚮┝ 湲곕뒫??以묒떖?쇰줈 ?댁슜?????덉뒿?덈떎.
                            """
            ));
        }

        if (isSearchHelpQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "SEARCH_HELP",
                    "TEMPLATE",
                    """
                            寃?됱갹???곹뭹紐낆쓣 ?낅젰?섎㈃ ?щ윭 以묎퀬嫄곕옒 ?뚮옯?쇱쓽 ?곹뭹???쒓납?먯꽌 鍮꾧탳?????덉뒿?덈떎.
                            ?덈? ?ㅼ뼱 '?꾩씠??14', '媛ㅻ윮??S23', '寃뚯씠諛??명듃遺?泥섎읆 ?곹뭹紐낆쓣 以묒떖?쇰줈 寃?됲븯硫?醫뗭뒿?덈떎.
                            """
            ));
        }

        if (isPriceCompareGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "PRICE_COMPARE_GUIDE",
                    "TEMPLATE",
                    """
                            ?섎쭏???섏쭛??以묎퀬 留ㅻЪ???꾩옱媛, ?좎궗 ?곹뭹 ?됯퇏媛, 嫄곕옒?꾨즺 ?됯퇏媛瑜?湲곗??쇰줈 媛寃⑹쓣 鍮꾧탳?⑸땲??
                            ?뱀젙 ?곹뭹???곸꽭 ?붾㈃?먯꽌 ?대옒留먮옒 AI瑜??꾨Ⅴ硫??꾩옱 媛寃⑹씠 愿쒖갖?吏 ???쎄쾶 ?뺤씤?????덉뒿?덈떎.
                            """
            ));
        }

        if (isWishlistGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "WISHLIST_GUIDE",
                    "TEMPLATE",
                    """
                            ?곹뭹 ?곸꽭 ?붾㈃???섑듃 踰꾪듉???꾨Ⅴ硫?李?紐⑸줉????λ맗?덈떎.
                            ??ν븳 ?곹뭹? 留덉씠?섏씠吏??李?紐⑸줉?먯꽌 ?ㅼ떆 ?뺤씤?????덇퀬, 梨쀫큸??李쒗븳 ?곹뭹??鍮꾧탳???뚮룄 ?쒖슜?????덉뒿?덈떎.
                            """
            ));
        }

        if (isRecentItemGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "RECENT_ITEM_GUIDE",
                    "TEMPLATE",
                    """
                            ?곹뭹 ?곸꽭 ?붾㈃???댁뼱蹂??곹뭹? 理쒓렐 蹂??곹뭹????λ맗?덈떎.
                            留덉씠?섏씠吏?먯꽌 ?ㅼ떆 ?뺤씤?????덇퀬, 梨쀫큸?먭쾶 理쒓렐 蹂??곹뭹?쇰━ 鍮꾧탳?대떖?쇨퀬 ?붿껌?????덉뒿?덈떎.
                            """
            ));
        }

        if (isAlertGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "PRICE_ALERT_GUIDE",
                    "TEMPLATE",
                    """
                            ?곹뭹 ?곸꽭 ?붾㈃???뚮┝ 踰꾪듉???꾨Ⅴ硫??대떦 ?곹뭹??媛寃??뚮┝ ??곸쑝濡???λ맗?덈떎.
                            留덉씠?섏씠吏 ?뚮┝ 紐⑸줉?먯꽌 ?뚮┝ ????곹뭹???뺤씤?????덉뒿?덈떎.
                            """
            ));
        }

        if (isChatbotHelpQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "CHATBOT_HELP",
                    "TEMPLATE",
                    """
                            ?섎쭏 梨쀫큸? 以묎퀬 ?곹뭹 異붿쿇, 媛寃?鍮꾧탳, ?대옒留먮옒 ?먮떒, ?ъ씠???댁슜 諛⑸쾿 ?덈궡瑜??꾩??쒕┰?덈떎.
                            濡쒓렇?명븳 ?ъ슜?먯쓽 李?紐⑸줉怨?理쒓렐 蹂??곹뭹??鍮꾧탳???쒖슜?????덉뒿?덈떎.
                            """
            ));
        }

        if (isAuthGuideQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "AUTH_GUIDE",
                    "TEMPLATE",
                    """
                            ?뚯썝媛????濡쒓렇?명븯硫?留덉씠?섏씠吏, 李?紐⑸줉, 理쒓렐 蹂??곹뭹, ?뚮┝, 梨쀫큸 湲곕뒫???ъ슜?????덉뒿?덈떎.
                            濡쒓렇?몄씠 ?섏? ?딆쑝硫??대찓?쇨낵 鍮꾨?踰덊샇媛 ?뺥솗?쒖? 癒쇱? ?뺤씤??二쇱꽭??
                            """
            ));
        }

        if (isOutOfScopeQuestion(normalized)) {
            return Optional.of(new TemplateAnswer(
                    "OUT_OF_SCOPE",
                    "OUT_OF_SCOPE",
                    """
                            二꾩넚?섏?留??섎쭏 梨쀫큸? 以묎퀬 ?곹뭹 寃?? 媛寃?鍮꾧탳, ?곹뭹 異붿쿇, 李? ?뚮┝, ?ъ씠???댁슜 諛⑸쾿??愿??吏덈Ц留??꾩??쒕┫ ???덉뒿?덈떎.
                            ?곹뭹紐낆씠???ъ씠??湲곕뒫怨?愿?⑦빐???ㅼ떆 吏덈Ц??二쇱꽭??
                            """
            ));
        }

        return Optional.empty();
    }

    private boolean isServiceIntroQuestion(String text) {
        return containsAny(text, "?섎쭏", "?ъ씠??, "?쒕퉬??)
                && containsAny(text, "萸?, "臾댁뾿", "?뚭컻", "?ㅻ챸", "湲곕뒫", "?대뼡");
    }

    private boolean isSearchHelpQuestion(String text) {
        return containsAny(text, "寃??, "李얜뒗踰?, "李얜뒗諛⑸쾿", "?곹뭹李얘린")
                && containsAny(text, "諛⑸쾿", "?대뼸寃?, "?ъ슜踰?, "?섎뒗踰?, "??, "??);
    }

    private boolean isPriceCompareGuideQuestion(String text) {
        return (containsAny(text, "?쒖꽭", "媛寃⑸퉬援?, "?됯퇏媛", "嫄곕옒?꾨즺?됯퇏")
                && containsAny(text, "諛⑸쾿", "?대뼸寃?, "??, "萸?, "湲곗?", "蹂대뒗踰?))
                || containsAny(text, "?대옒留먮옒?ъ슜踰?, "?대옒留먮옒湲곕뒫");
    }

    private boolean isWishlistGuideQuestion(String text) {
        return containsAny(text, "李?, "愿?ъ긽??)
                && containsAny(text, "諛⑸쾿", "?대뼸寃?, "?ъ슜踰?, "?섎뒗踰?, "異붽?", "??젣", "紐⑸줉");
    }

    private boolean isRecentItemGuideQuestion(String text) {
        return containsAny(text, "理쒓렐蹂몄긽??, "理쒓렐蹂?, "理쒓렐?곹뭹", "?대엺?곹뭹")
                && containsAny(text, "諛⑸쾿", "?대뼸寃?, "?ъ슜踰?, "?대뵒", "紐⑸줉", "?뺤씤");
    }

    private boolean isAlertGuideQuestion(String text) {
        return containsAny(text, "?뚮┝", "媛寃⑹븣由?, "理쒖?媛?뚮┝")
                && containsAny(text, "諛⑸쾿", "?대뼸寃?, "?ъ슜踰?, "?ㅼ젙", "耳?, "??, "紐⑸줉");
    }

    private boolean isChatbotHelpQuestion(String text) {
        return containsAny(text, "梨쀫큸", "ai", "?대옒留먮옒")
                && containsAny(text, "萸?, "臾댁뾿", "湲곕뒫", "?ъ슜踰?, "?좎닔", "?꾩?");
    }

    private boolean isAuthGuideQuestion(String text) {
        return containsAny(text, "濡쒓렇??, "?뚯썝媛??, "媛??, "怨꾩젙")
                && containsAny(text, "諛⑸쾿", "?대뼸寃?, "?덈뤌", "?덈릺", "?ㅻ쪟", "?꾩슂");
    }

    private boolean isOutOfScopeQuestion(String text) {
        if (containsAny(text,
                "?곹뭹", "以묎퀬", "媛寃?, "?쒖꽭", "李?, "?뚮┝", "寃??, "?섎쭏", "嫄곕옒", "留ㅻЪ",
                "?먮ℓ", "援щℓ", "異붿쿇", "鍮꾧탳", "?대옒留먮옒", "留덉씠?섏씠吏", "?꾩씠??, "媛ㅻ윮??,
                "而댄벂??, "?명듃遺?, "?곗뒪?ы깙", "蹂몄껜", "?쒕툝由?, "?먯뼱??, "?뚯뒪", "?뚰뀗??)) {
            return false;
        }

        return containsAny(text,
                "?좎뵪", "二쇱떇", "肄붿씤", "濡쒕삉", "?댁뒪", "?뺤튂", "?곗삁", "留쏆쭛", "?ы뻾",
                "?붾━", "?덉떆??, "?숈젣", "怨쇱젣", "?섑븰", "踰덉뿭", "肄붾뵫", "?뚯씠??, "?먮컮",
                "?섑븰", "蹂묒썝", "踰뺣쪧", "蹂?몄궗", "?댁꽭", "?ъ＜", "?몃옒", "?곹솕異붿쿇", "寃뚯엫怨듬왂");
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

    public static class TemplateAnswer {

        private final String intent;
        private final String responseType;
        private final String answer;

        public TemplateAnswer(String intent, String responseType, String answer) {
            this.intent = intent;
            this.responseType = responseType;
            this.answer = answer;
        }

        public String getIntent() {
            return intent;
        }

        public String getResponseType() {
            return responseType;
        }

        public String getAnswer() {
            return answer;
        }
    }
}

