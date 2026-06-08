package com.used.service.chatbot.service;

import org.springframework.stereotype.Component;

@Component
public class GamePerformanceResolver {

    public String resolveGameName(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String text = normalize(message);

        if (containsAny(text, "濡?, "由ш렇?ㅻ툕?덉쟾??, "leagueoflegends", "lol")) {
            return "濡?;
        }

        if (containsAny(text, "諛쒕줈???, "valorant")) {
            return "諛쒕줈???;
        }

        if (containsAny(text, "諛곌렇", "諛고?洹몃씪?대뱶", "pubg")) {
            return "諛곌렇";
        }

        if (containsAny(text, "?먯씠?숈뒪", "?먯씠?숈뒪?덉쟾??, "?먯씠?⑹뒪", "?먯씠?⑹뒪?덉쟾??, "apex")) {
            return "?먯씠?숈뒪?덉쟾??;
        }

        if (containsAny(text, "?ㅻ쾭?뚯튂", "?ㅻ쾭?뚯튂2", "overwatch")) {
            return "?ㅻ쾭?뚯튂2";
        }

        if (containsAny(text, "濡쒖뒪?몄븘??, "濡쒖븘", "lostark")) {
            return "濡쒖뒪?몄븘??;
        }

        if (containsAny(text, "?섎뱺留?, "eldenring")) {
            return "?섎뱺留?;
        }

        if (containsAny(text, "?ъ씠踰꾪럱??, "?ъ씠踰꾪럱??077", "cyberpunk")) {
            return "?ъ씠踰꾪럱??;
        }

        if (containsAny(text, "gta", "gta5")) {
            return "GTA5";
        }

        if (containsAny(text, "?붿븘釉붾줈4", "diablo4")) {
            return "?붿븘釉붾줈4";
        }

        if (containsAny(text, "?덈뜲由?, "?덈뱶?곕뱶", "reddead")) {
            return "?덈뱶?곕뱶由щ???";
        }

        if (containsAny(text, "?ㅽ??꾨뱶", "starfield")) {
            return "?ㅽ??꾨뱶";
        }

        if (containsAny(text, "寃??좏솕", "寃??좏솕?ㅺ났", "blackmyth", "wukong")) {
            return "寃??좏솕: ?ㅺ났";
        }

        if (containsAny(text, "?ъ뒪??, "?ъ뒪??, "rust")) {
            return "?ъ뒪??;
        }

        if (containsAny(text, "硫붿씠??, "硫붿씠?뚯뒪?좊━", "maplestory")) {
            return "硫붿씠?뚯뒪?좊━";
        }

        if (containsAny(text, "?쇳뙆", "fc?⑤씪??, "fconline", "fifa")) {
            return "FC?⑤씪??;
        }

        if (containsAny(text, "?쒕뱺", "?쒕뱺?댄깮")) {
            return "?쒕뱺?댄깮";
        }

        if (containsAny(text, "?ㅽ?", "?ㅽ??щ옒?꾪듃", "starcraft")) {
            return "?ㅽ??щ옒?꾪듃";
        }

        return null;
    }

    public String resolveByMessage(String message) {
        return resolvePerformanceLevelByMessage(message);
    }

    public String resolvePerformanceLevelByMessage(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String text = normalize(message);

        /*
         * ?듭뀡 ?ㅼ썙???곗꽑.
         * 媛숈? 寃뚯엫?대씪??4K/RT/??듭씠硫?怨듭떇 沅뚯옣 ?ъ뼇蹂대떎 ?믪? ?깃툒?쇰줈 蹂몃떎.
         */
        if (containsAny(text,
                "4k",
                "?덉씠?몃젅?댁떛",
                "raytracing",
                "?ㅻ쾭?쒕씪?대툕",
                "overdrive",
                "165hz",
                "???,
                "??듭뀡",
                "?명듃??,
                "?명듃?쇱샃??,
                "理쒖긽??,
                "洹뱀긽??)) {
            return "EXTREME";
        }

        if (containsAny(text,
                "qhd",
                "144hz",
                "?믪??꾨젅??,
                "怨좏봽?덉엫",
                "苡뚯쟻",
                "?곸샃",
                "怨좎샃",
                "怨좎샃??,
                "?믪??듭뀡")) {
            return "HIGH";
        }

        /*
         * 怨좎궗??寃뚯엫.
         */
        if (containsAny(text,
                "?ъ씠踰꾪럱??,
                "?ъ씠踰꾪럱??077",
                "cyberpunk",
                "?섎뱺留?,
                "eldenring",
                "gta",
                "gta5",
                "?붿븘釉붾줈4",
                "diablo4",
                "?덈뜲由?,
                "?덈뱶?곕뱶",
                "reddead",
                "?ㅽ??꾨뱶",
                "starfield",
                "寃??좏솕",
                "寃??좏솕?ㅺ났",
                "blackmyth",
                "wukong",
                "理쒖떊aaa",
                "aaa寃뚯엫",
                "理쒖떊寃뚯엫",
                "怨좎궗??)) {
            return "HIGH";
        }

        /*
         * 以묎컙 ?ъ뼇 寃뚯엫.
         */
        if (containsAny(text,
                "諛곌렇",
                "諛고?洹몃씪?대뱶",
                "pubg",
                "?먯씠?숈뒪",
                "?먯씠?숈뒪?덉쟾??,
                "?먯씠?⑹뒪",
                "?먯씠?⑹뒪?덉쟾??,
                "apex",
                "?ㅻ쾭?뚯튂",
                "?ㅻ쾭?뚯튂2",
                "overwatch",
                "濡쒖뒪?몄븘??,
                "濡쒖븘",
                "lostark",
                "?ъ뒪??,
                "?ъ뒪??,
                "rust")) {
            return "MID";
        }

        /*
         * ??? ?ъ뼇 寃뚯엫.
         */
        if (containsAny(text,
                "濡?,
                "由ш렇?ㅻ툕?덉쟾??,
                "leagueoflegends",
                "lol",
                "諛쒕줈???,
                "valorant",
                "硫붿씠??,
                "硫붿씠?뚯뒪?좊━",
                "?쇳뙆",
                "fc?⑤씪??,
                "fconline",
                "fifa",
                "?쒕뱺",
                "?쒕뱺?댄깮",
                "?ㅽ?",
                "?ㅽ??щ옒?꾪듃")) {
            return "LOW";
        }

        /*
         * ?깅줉?섏? ?딆? ?ㅽ?/理쒖떊 寃뚯엫? ?쇰컲 寃뚯엫蹂대떎 ?믨쾶 蹂몃떎.
         */
        if (containsAny(text, "?ㅽ?寃뚯엫", "steam寃뚯엫", "理쒖떊寃뚯엫", "aaa寃뚯엫")) {
            return "HIGH";
        }

        if (containsAny(text, "寃뚯엫", "寃뚯씠諛?)) {
            return "MID";
        }

        return null;
    }

    public String resolveBySpecs(String gpuName, String cpuName, Integer ramGb) {
        String gpu = normalize(gpuName);
        int ram = ramGb == null ? 0 : ramGb;

        /*
         * EXTREME:
         * 4K / RT / ????꾨낫.
         */
        if (containsAny(gpu,
                "rtx4090",
                "rtx4080super",
                "rtx4080",
                "rx7900xtx",
                "rx7900xt")) {
            return "EXTREME";
        }

        /*
         * HIGH:
         * 怨좎궗??寃뚯엫 怨듭떇 沅뚯옣 ?ъ뼇 ?댁긽.
         */
        if (containsAny(gpu,
                "rtx4070ti",
                "rtx4070super",
                "rtx4070",
                "rtx3090",
                "rtx3080ti",
                "rtx3080",
                "rtx4060ti",
                "rtx4060",
                "rtx3070ti",
                "rtx3070",
                "rtx3060ti",
                "rtx3060",
                "rtx2080ti",
                "rtx2080",
                "rtx2070super",
                "rtx2070",
                "rtx2060super",
                "rx7800xt",
                "rx6900xt",
                "rx6800xt",
                "rx7700xt",
                "rx6750xt",
                "rx6700xt",
                "rx6650xt",
                "rx6600xt",
                "rx6600",
                "rx5700xt",
                "arc770",
                "arca770")) {
            return ram >= 16 ? "HIGH" : "MID";
        }

        /*
         * MID:
         * PUBG, Apex 沅뚯옣 ?ъ뼇 洹쇱쿂.
         */
        if (containsAny(gpu,
                "rtx2060",
                "gtx1660ti",
                "gtx1660super",
                "gtx1660",
                "gtx1650super",
                "gtx1650",
                "gtx1080ti",
                "gtx1080",
                "gtx1070ti",
                "gtx1070",
                "gtx1060",
                "gtx970",
                "rx590",
                "rx580",
                "rx570",
                "r9290")) {
            return ram >= 8 ? "MID" : "LOW";
        }

        /*
         * LOW:
         * 濡? 諛쒕줈???60FPS, 硫붿씠?? ?쇳뙆 ????ъ뼇 寃뚯엫 ?꾨낫.
         */
        if (containsAny(gpu,
                "gtx1050ti",
                "gtx1050",
                "gtx950",
                "gt730",
                "gtx730",
                "rx560",
                "rx550",
                "r7240",
                "hd6950",
                "hd6570",
                "uhd630",
                "hd4600",
                "hd7790")) {
            return "LOW";
        }

        if (containsAny(gpu, "?댁옣洹몃옒??, "uhd", "iris", "vega")) {
            return "LOW";
        }

        if (gpu.isBlank()) {
            return "UNKNOWN";
        }

        return "UNKNOWN";
    }

    public boolean canRunRequestedLevel(String itemLevel, String requestedLevel) {
        int itemScore = levelToScore(itemLevel);
        int requestedScore = levelToScore(requestedLevel);

        if (itemScore < 0 || requestedScore < 0) {
            return false;
        }

        return itemScore >= requestedScore;
    }

    public int levelToScore(String level) {
        if (level == null || level.isBlank()) {
            return -1;
        }

        return switch (level.toUpperCase()) {
            case "LOW" -> 1;
            case "MID" -> 2;
            case "HIGH" -> 3;
            case "EXTREME" -> 4;
            default -> -1;
        };
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value
                .toLowerCase()
                .replaceAll("\\s+", "")
                .replace("_", "")
                .replace("-", "")
                .replace("/", "")
                .trim();
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) {
            return false;
        }

        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) {
                return true;
            }
        }

        return false;
    }
}
