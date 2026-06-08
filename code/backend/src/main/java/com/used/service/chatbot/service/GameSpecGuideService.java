package com.used.service.chatbot.service;

import org.springframework.stereotype.Service;

@Service
public class GameSpecGuideService {

    public String makeGuide(String gameName, String performanceLevel) {
        if (gameName == null || gameName.isBlank()) {
            return "";
        }

        String game = normalize(gameName);
        if (containsAny(game, "롤", "리그오브레전드", "lol")) {
            return "롤은 비교적 가벼운 게임이라 고사양 컴퓨터까지는 필요하지 않습니다. CPU는 i3 8세대 이상 또는 라이젠 3 이상, RAM 8GB 이상, SSD 256GB 이상이면 충분한 편입니다. 중고 기준으로는 20만~50만 원대 본체도 후보가 될 수 있습니다.";
        }

        if (containsAny(game, "배그", "배틀그라운드", "pubg")) {
            return "배그는 그래픽카드와 메모리 영향이 큰 편입니다. FHD 기준으로 CPU i5 9세대 이상 또는 라이젠 5 3600 이상, GTX 1660 Super나 RTX 2060 이상, RAM 16GB 이상을 권장합니다.";
        }

        if (containsAny(game, "사이버펑크", "cyberpunk")) {
            return "사이버펑크는 고사양 게임이라 옵션 타협 여부가 중요합니다. FHD 기준으로도 RTX 3060 이상, RAM 16GB 이상을 권장하고, QHD나 높은 옵션은 RTX 4070급 이상을 보는 편이 좋습니다.";
        }

        if (containsAny(game, "러스트", "rust")) {
            return "러스트는 메모리와 그래픽카드가 모두 중요한 게임입니다. CPU i5 10세대 이상 또는 라이젠 5 3600 이상, GTX 1660 Super 또는 RTX 2060 이상, RAM 16GB 이상을 권장합니다.";
        }

        if ("HIGH".equalsIgnoreCase(performanceLevel) || "EXTREME".equalsIgnoreCase(performanceLevel)) {
            return gameName + " 플레이용이라면 그래픽카드와 RAM 구성을 꼭 확인하는 것이 좋습니다. RTX 3060 이상, RAM 16GB 이상을 우선 후보로 보세요.";
        }

        return "";
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("\\s+", "");
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(normalize(keyword))) return true;
        }
        return false;
    }
}
