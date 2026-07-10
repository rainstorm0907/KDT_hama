package com.used.service.chatbot.service;

import org.springframework.stereotype.Component;

@Component
public class GamePerformanceResolver {

    public String resolveGameName(String message) {
        String text = normalize(message);
        if (text.isBlank()) {
            return null;
        }

        if (containsAny(text, "롤", "리그오브레전드", "leagueoflegends", "lol")) return "롤";
        if (containsAny(text, "발로란트", "valorant")) return "발로란트";
        if (containsAny(text, "배그", "배틀그라운드", "pubg")) return "배그";
        if (containsAny(text, "에이펙스", "apex")) return "에이펙스 레전드";
        if (containsAny(text, "오버워치", "overwatch")) return "오버워치2";
        if (containsAny(text, "로스트아크", "로아", "lostark")) return "로스트아크";
        if (containsAny(text, "엘든링", "eldenring")) return "엘든링";
        if (containsAny(text, "사이버펑크", "cyberpunk")) return "사이버펑크";
        if (containsAny(text, "gta", "gta5")) return "GTA5";
        if (containsAny(text, "디아블로", "diablo")) return "디아블로4";
        if (containsAny(text, "레드데드", "reddead")) return "레드 데드 리뎀션2";
        if (containsAny(text, "검은신화", "오공", "blackmyth", "wukong")) return "검은 신화: 오공";
        if (containsAny(text, "러스트", "rust")) return "러스트";
        if (containsAny(text, "메이플", "maplestory")) return "메이플스토리";
        if (containsAny(text, "피파", "fc온라인", "fconline", "fifa")) return "FC온라인";
        if (containsAny(text, "스타크래프트", "starcraft")) return "스타크래프트";
        return null;
    }

    public String resolveByMessage(String message) {
        return resolvePerformanceLevelByMessage(message);
    }

    public String resolvePerformanceLevelByMessage(String message) {
        String text = normalize(message);
        if (text.isBlank()) {
            return null;
        }

        if (containsAny(text, "4k", "레이 tracing", "레이 트레이싱", "울트라", "최상옵", "최고옵")) {
            return "EXTREME";
        }

        if (containsAny(text, "qhd", "144hz", "고사양", "상옵", "높은옵션", "사이버펑크", "엘든링", "gta", "디아블로", "검은신화", "오공", "aaa")) {
            return "HIGH";
        }

        if (containsAny(text, "배그", "배틀그라운드", "pubg", "에이펙스", "apex", "오버워치", "로스트아크", "러스트", "rust")) {
            return "MID";
        }

        if (containsAny(text, "롤", "리그오브레전드", "lol", "발로란트", "메이플", "피파", "fc온라인", "스타크래프트")) {
            return "LOW";
        }

        if (containsAny(text, "게임", "게이밍", "플레이", "돌아가는")) {
            return "MID";
        }

        return null;
    }

    public String resolveBySpecs(String gpuName, String cpuName, Integer ramGb) {
        String gpu = normalize(gpuName);
        int ram = ramGb == null ? 0 : ramGb;

        if (containsAny(gpu, "rtx4090", "rtx4080", "rx7900")) return "EXTREME";
        if (containsAny(gpu, "rtx4070", "rtx3090", "rtx3080", "rtx4060", "rtx3070", "rtx3060", "rx7800", "rx6800", "rx6700", "rx6600")) return ram >= 16 ? "HIGH" : "MID";
        if (containsAny(gpu, "rtx2060", "gtx1660", "gtx1650", "gtx1080", "gtx1070", "gtx1060", "rx590", "rx580", "rx570")) return ram >= 8 ? "MID" : "LOW";
        if (containsAny(gpu, "gtx1050", "gtx950", "gt730", "rx560", "rx550", "uhd", "iris", "vega")) return "LOW";
        return gpu.isBlank() ? "UNKNOWN" : "UNKNOWN";
    }

    public boolean canRunRequestedLevel(String itemLevel, String requestedLevel) {
        int itemScore = levelToScore(itemLevel);
        int requestedScore = levelToScore(requestedLevel);
        return itemScore >= 0 && requestedScore >= 0 && itemScore >= requestedScore;
    }

    public int levelToScore(String level) {
        if (level == null || level.isBlank()) return -1;
        return switch (level.toUpperCase()) {
            case "LOW" -> 1;
            case "MID" -> 2;
            case "HIGH" -> 3;
            case "EXTREME" -> 4;
            default -> -1;
        };
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.toLowerCase().replaceAll("\\s+", "").replace("_", "").replace("-", "").replace("/", "").trim();
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) return true;
        }
        return false;
    }
}
