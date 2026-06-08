package com.used.service.chatbot.service;

import org.springframework.stereotype.Service;

@Service
public class GameSpecGuideService {

    public String makeGuide(String gameName, String performanceLevel) {
        if (gameName == null || gameName.isBlank()) {
            return "";
        }

        String normalizedGameName = gameName
                .replaceAll("\\s+", "")
                .toLowerCase();

        if (normalizedGameName.contains("諛곌렇")
                || normalizedGameName.contains("諛고?洹몃씪?대뱶")
                || normalizedGameName.contains("pubg")) {
            return makePubgGuide(performanceLevel);
        }

        if (normalizedGameName.contains("?ъ뒪??)
                || normalizedGameName.contains("rust")) {
            return makeRustGuide(performanceLevel);
        }

        if (normalizedGameName.contains("濡?)
                || normalizedGameName.contains("由ш렇?ㅻ툕?덉쟾??)
                || normalizedGameName.contains("lol")) {
            return makeLolGuide(performanceLevel);
        }

        return "";
    }

    private String makePubgGuide(String performanceLevel) {
        if ("HIGH".equalsIgnoreCase(performanceLevel)) {
            return """
                    諛고?洹몃씪?대뱶瑜??먰솢?섍쾶 ?섎젮硫??믪? ?듭뀡 湲곗??쇰줈 ?꾨옒 ?뺣룄瑜?異붿쿇?⑸땲??

                    CPU: ?명뀛 i5 12?몃? ?댁긽 ?먮뒗 ?쇱씠??5 5600 ?댁긽
                    GPU: RTX 3060 / RTX 4060 ?댁긽
                    RAM: 16GB ?댁긽, 媛?ν븯硫?32GB
                    ??μ옣移? SSD 512GB ?댁긽

                    以묎퀬 援щℓ 湲곗??쇰줈??70留?110留??먮? 寃뚯씠諛?蹂몄껜瑜??곗꽑 ?뺤씤?섎뒗 寃?醫뗭뒿?덈떎.
                    """;
        }

        return """
                諛고?洹몃씪?대뱶瑜?以묎컙 ?듭뀡 湲곗??쇰줈 利먭린?ㅻ㈃ ?꾨옒 ?뺣룄瑜?異붿쿇?⑸땲??

                CPU: ?명뀛 i5 9?몃? ?댁긽 ?먮뒗 ?쇱씠??5 3600 ?댁긽
                GPU: GTX 1660 Super / RTX 2060 / RTX 3060湲?
                RAM: 16GB ?댁긽
                ??μ옣移? SSD 512GB ?댁긽

                以묎퀬 援щℓ 湲곗??쇰줈??50留?90留??먮? 寃뚯씠諛?蹂몄껜瑜?癒쇱? ?뺤씤?섎뒗 寃?醫뗭뒿?덈떎.
                """;
    }

    private String makeRustGuide(String performanceLevel) {
        return """
                ?ъ뒪?몃? ?먰솢?섍쾶 ?뚮젅?댄븯?ㅻ㈃ 硫붾え由ъ? 洹몃옒?쎌뭅?쒓? 以묒슂?⑸땲??

                CPU: ?명뀛 i5 10?몃? ?댁긽 ?먮뒗 ?쇱씠??5 3600 ?댁긽
                GPU: GTX 1660 Super / RTX 2060 ?댁긽
                RAM: 16GB ?댁긽, 媛?ν븯硫?32GB
                ??μ옣移? SSD 512GB ?댁긽

                以묎퀬 援щℓ 湲곗??쇰줈??60留?100留??먮? 寃뚯씠諛?蹂몄껜瑜?異붿쿇?⑸땲??
                """;
    }

    private String makeLolGuide(String performanceLevel) {
        return """
                由ш렇 ?ㅻ툕 ?덉쟾?쒕뒗 鍮꾧탳??媛踰쇱슫 寃뚯엫?대씪 怨좎궗??而댄벂?곌퉴吏???꾩슂?섏? ?딆뒿?덈떎.

                CPU: ?명뀛 i3 8?몃? ?댁긽 ?먮뒗 ?쇱씠??3 ?댁긽
                GPU: GTX 1050 / ?댁옣 洹몃옒???쇰? 紐⑤뜽??媛??
                RAM: 8GB ?댁긽, ?ъ쑀 ?덇쾶??16GB
                ??μ옣移? SSD 256GB ?댁긽

                以묎퀬 援щℓ 湲곗??쇰줈??20留?50留??먮? 蹂몄껜??異⑸텇???꾨낫媛 ?????덉뒿?덈떎.
                """;
    }
}
