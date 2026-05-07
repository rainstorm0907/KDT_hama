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

        if (containsAny(text, "발로란트", "valorant")) {
            return "발로란트";
        }

        if (containsAny(text, "오버워치", "오버워치2", "overwatch")) {
            return "오버워치2";
        }

        if (containsAny(text, "로스트아크", "로아", "lostark")) {
            return "로스트아크";
        }

        if (containsAny(text, "배그", "배틀그라운드", "pubg")) {
            return "배그";
        }

        if (containsAny(text, "에이펙스", "에이펙스레전드", "apex")) {
            return "에이펙스레전드";
        }

        if (containsAny(text, "gta", "gta5")) {
            return "GTA5";
        }

        if (containsAny(text, "엘든링", "eldenring")) {
            return "엘든링";
        }

        if (containsAny(text, "디아블로4", "diablo4")) {
            return "디아블로4";
        }

        if (containsAny(text, "몬헌", "몬스터헌터", "monsterhunter")) {
            return "몬스터헌터";
        }

        if (containsAny(text, "호그와트", "호그와트레거시", "hogwarts")) {
            return "호그와트 레거시";
        }

        if (containsAny(text, "사이버펑크", "사이버펑크2077", "cyberpunk")) {
            return "사이버펑크";
        }

        if (containsAny(text, "레데리", "레드데드", "reddead")) {
            return "레드데드리뎀션2";
        }

        if (containsAny(text, "스타필드", "starfield")) {
            return "스타필드";
        }

        if (containsAny(text, "앨런웨이크", "앨런웨이크2", "alanwake")) {
            return "앨런 웨이크 2";
        }

        if (containsAny(text, "호라이즌", "horizon")) {
            return "호라이즌";
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

        if (containsAny(text, "4k", "레이트레이싱", "raytracing", "rt", "풀옵션", "풀옵", "최상옵", "극상옵")) {
            return "EXTREME";
        }

        if (containsAny(text, "qhd", "144hz", "고프레임", "높은프레임", "울트라", "울트라옵션")) {
            return "ULTRA";
        }

        if (containsAny(
                text,
                "사이버펑크",
                "사이버펑크2077",
                "cyberpunk",
                "스타필드",
                "starfield",
                "앨런웨이크",
                "앨런웨이크2",
                "alanwake",
                "최신aaa",
                "aaa게임",
                "최신게임",
                "고사양"
        )) {
            return "VERY_HIGH";
        }

        if (containsAny(
                text,
                "gta",
                "gta5",
                "엘든링",
                "eldenring",
                "디아블로4",
                "diablo4",
                "레데리",
                "레드데드",
                "reddead",
                "호그와트",
                "hogwarts",
                "몬헌",
                "몬스터헌터",
                "monsterhunter"
        )) {
            return "HIGH";
        }

        if (containsAny(
                text,
                "배그",
                "배틀그라운드",
                "pubg",
                "에이펙스",
                "에이펙스레전드",
                "apex",
                "오버워치",
                "오버워치2",
                "overwatch",
                "로스트아크",
                "로아",
                "lostark",
                "발로란트",
                "valorant"
        )) {
            return "MID";
        }

        if (containsAny(
                text,
                "롤",
                "리그오브레전드",
                "leagueoflegends",
                "lol",
                "메이플",
                "메이플스토리",
                "피파",
                "fc온라인",
                "fconline",
                "fifa",
                "서든",
                "서든어택",
                "스타",
                "스타크래프트"
        )) {
            return "LOW";
        }

        if (containsAny(text, "게임", "게이밍")) {
            return "MID";
        }

        return null;
    }

    public String resolveBySpecs(String gpuName, String cpuName, Integer ramGb) {
        String gpu = normalize(gpuName);
        String cpu = normalize(cpuName);
        int ram = ramGb == null ? 0 : ramGb;

        if (containsAny(
                gpu,
                "rtx4090",
                "rtx4080",
                "rtx4070ti",
                "rx7900xtx",
                "rx7900xt"
        )) {
            return ram >= 32 ? "EXTREME" : "ULTRA";
        }

        if (containsAny(
                gpu,
                "rtx4070",
                "rtx3090",
                "rtx3080ti",
                "rtx3080",
                "rx7800xt",
                "rx6900xt",
                "rx6800xt"
        )) {
            return ram >= 32 ? "ULTRA" : "VERY_HIGH";
        }

        if (containsAny(
                gpu,
                "rtx4060ti",
                "rtx4060",
                "rtx3070",
                "rtx3060ti",
                "rtx3060",
                "rtx2080",
                "rtx2070",
                "rtx2060super",
                "rtx2060",
                "rx6700xt",
                "rx6650xt",
                "rx6600xt",
                "rx6600",
                "arc770",
                "arca770"
        )) {
            return ram >= 16 ? "HIGH" : "MID";
        }

        if (containsAny(
                gpu,
                "gtx1660ti",
                "gtx1660super",
                "gtx1660",
                "gtx1650super",
                "gtx1650",
                "gtx1070",
                "gtx1060",
                "rx590",
                "rx580",
                "rx570",
                "gtx970",
                "r9290"
        )) {
            return ram >= 16 ? "MID" : "LOW";
        }

        if (containsAny(
                gpu,
                "gtx1050ti",
                "gtx1050",
                "gtx950",
                "rx560",
                "rx550"
        )) {
            return "LOW";
        }

        if (containsAny(gpu, "내장그래픽", "uhd", "iris", "vega")) {
            return "LOW";
        }

        if (gpu.isBlank()) {
            if (containsAny(
                    cpu,
                    "i52500",
                    "i52500k",
                    "i56400",
                    "i54460",
                    "i34130",
                    "i36100",
                    "셀러론",
                    "펜티엄"
            )) {
                return "LOW";
            }

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
            case "VERY_HIGH" -> 4;
            case "ULTRA" -> 5;
            case "EXTREME" -> 6;
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