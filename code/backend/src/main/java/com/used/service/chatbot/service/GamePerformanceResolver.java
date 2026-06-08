package com.example.ffff.chatbot.service;

import org.springframework.stereotype.Component;

@Component
public class GamePerformanceResolver {

    public String resolveGameName(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String text = normalize(message);

        if (containsAny(text, "롤", "리그오브레전드", "leagueoflegends", "lol")) {
            return "롤";
        }

        if (containsAny(text, "발로란트", "valorant")) {
            return "발로란트";
        }

        if (containsAny(text, "배그", "배틀그라운드", "pubg")) {
            return "배그";
        }

        if (containsAny(text, "에이펙스", "에이펙스레전드", "에이팩스", "에이팩스레전드", "apex")) {
            return "에이펙스레전드";
        }

        if (containsAny(text, "오버워치", "오버워치2", "overwatch")) {
            return "오버워치2";
        }

        if (containsAny(text, "로스트아크", "로아", "lostark")) {
            return "로스트아크";
        }

        if (containsAny(text, "엘든링", "eldenring")) {
            return "엘든링";
        }

        if (containsAny(text, "사이버펑크", "사이버펑크2077", "cyberpunk")) {
            return "사이버펑크";
        }

        if (containsAny(text, "gta", "gta5")) {
            return "GTA5";
        }

        if (containsAny(text, "디아블로4", "diablo4")) {
            return "디아블로4";
        }

        if (containsAny(text, "레데리", "레드데드", "reddead")) {
            return "레드데드리뎀션2";
        }

        if (containsAny(text, "스타필드", "starfield")) {
            return "스타필드";
        }

        if (containsAny(text, "검은신화", "검은신화오공", "blackmyth", "wukong")) {
            return "검은신화: 오공";
        }

        if (containsAny(text, "러스트", "러스크", "rust")) {
            return "러스트";
        }

        if (containsAny(text, "메이플", "메이플스토리", "maplestory")) {
            return "메이플스토리";
        }

        if (containsAny(text, "피파", "fc온라인", "fconline", "fifa")) {
            return "FC온라인";
        }

        if (containsAny(text, "서든", "서든어택")) {
            return "서든어택";
        }

        if (containsAny(text, "스타", "스타크래프트", "starcraft")) {
            return "스타크래프트";
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
         * 옵션 키워드 우선.
         * 같은 게임이라도 4K/RT/풀옵이면 공식 권장 사양보다 높은 등급으로 본다.
         */
        if (containsAny(text,
                "4k",
                "레이트레이싱",
                "raytracing",
                "오버드라이브",
                "overdrive",
                "165hz",
                "풀옵",
                "풀옵션",
                "울트라",
                "울트라옵션",
                "최상옵",
                "극상옵")) {
            return "EXTREME";
        }

        if (containsAny(text,
                "qhd",
                "144hz",
                "높은프레임",
                "고프레임",
                "쾌적",
                "상옵",
                "고옵",
                "고옵션",
                "높은옵션")) {
            return "HIGH";
        }

        /*
         * 고사양 게임.
         */
        if (containsAny(text,
                "사이버펑크",
                "사이버펑크2077",
                "cyberpunk",
                "엘든링",
                "eldenring",
                "gta",
                "gta5",
                "디아블로4",
                "diablo4",
                "레데리",
                "레드데드",
                "reddead",
                "스타필드",
                "starfield",
                "검은신화",
                "검은신화오공",
                "blackmyth",
                "wukong",
                "최신aaa",
                "aaa게임",
                "최신게임",
                "고사양")) {
            return "HIGH";
        }

        /*
         * 중간 사양 게임.
         */
        if (containsAny(text,
                "배그",
                "배틀그라운드",
                "pubg",
                "에이펙스",
                "에이펙스레전드",
                "에이팩스",
                "에이팩스레전드",
                "apex",
                "오버워치",
                "오버워치2",
                "overwatch",
                "로스트아크",
                "로아",
                "lostark",
                "러스트",
                "러스크",
                "rust")) {
            return "MID";
        }

        /*
         * 낮은 사양 게임.
         */
        if (containsAny(text,
                "롤",
                "리그오브레전드",
                "leagueoflegends",
                "lol",
                "발로란트",
                "valorant",
                "메이플",
                "메이플스토리",
                "피파",
                "fc온라인",
                "fconline",
                "fifa",
                "서든",
                "서든어택",
                "스타",
                "스타크래프트")) {
            return "LOW";
        }

        /*
         * 등록되지 않은 스팀/최신 게임은 일반 게임보다 높게 본다.
         */
        if (containsAny(text, "스팀게임", "steam게임", "최신게임", "aaa게임")) {
            return "HIGH";
        }

        if (containsAny(text, "게임", "게이밍")) {
            return "MID";
        }

        return null;
    }

    public String resolveBySpecs(String gpuName, String cpuName, Integer ramGb) {
        String gpu = normalize(gpuName);
        int ram = ramGb == null ? 0 : ramGb;

        /*
         * EXTREME:
         * 4K / RT / 풀옵 후보.
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
         * 고사양 게임 공식 권장 사양 이상.
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
         * PUBG, Apex 권장 사양 근처.
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
         * 롤, 발로란트 60FPS, 메이플, 피파 등 저사양 게임 후보.
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

        if (containsAny(gpu, "내장그래픽", "uhd", "iris", "vega")) {
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