package com.example.ffff.chatbot.service;

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

        if (normalizedGameName.contains("배그")
                || normalizedGameName.contains("배틀그라운드")
                || normalizedGameName.contains("pubg")) {
            return makePubgGuide(performanceLevel);
        }

        if (normalizedGameName.contains("러스트")
                || normalizedGameName.contains("rust")) {
            return makeRustGuide(performanceLevel);
        }

        if (normalizedGameName.contains("롤")
                || normalizedGameName.contains("리그오브레전드")
                || normalizedGameName.contains("lol")) {
            return makeLolGuide(performanceLevel);
        }

        return "";
    }

    private String makePubgGuide(String performanceLevel) {
        if ("HIGH".equalsIgnoreCase(performanceLevel)) {
            return """
                    배틀그라운드를 원활하게 하려면 높은 옵션 기준으로 아래 정도를 추천합니다.

                    CPU: 인텔 i5 12세대 이상 또는 라이젠 5 5600 이상
                    GPU: RTX 3060 / RTX 4060 이상
                    RAM: 16GB 이상, 가능하면 32GB
                    저장장치: SSD 512GB 이상

                    중고 구매 기준으로는 70만~110만 원대 게이밍 본체를 우선 확인하는 게 좋습니다.
                    """;
        }

        return """
                배틀그라운드를 중간 옵션 기준으로 즐기려면 아래 정도를 추천합니다.

                CPU: 인텔 i5 9세대 이상 또는 라이젠 5 3600 이상
                GPU: GTX 1660 Super / RTX 2060 / RTX 3060급
                RAM: 16GB 이상
                저장장치: SSD 512GB 이상

                중고 구매 기준으로는 50만~90만 원대 게이밍 본체를 먼저 확인하는 게 좋습니다.
                """;
    }

    private String makeRustGuide(String performanceLevel) {
        return """
                러스트를 원활하게 플레이하려면 메모리와 그래픽카드가 중요합니다.

                CPU: 인텔 i5 10세대 이상 또는 라이젠 5 3600 이상
                GPU: GTX 1660 Super / RTX 2060 이상
                RAM: 16GB 이상, 가능하면 32GB
                저장장치: SSD 512GB 이상

                중고 구매 기준으로는 60만~100만 원대 게이밍 본체를 추천합니다.
                """;
    }

    private String makeLolGuide(String performanceLevel) {
        return """
                리그 오브 레전드는 비교적 가벼운 게임이라 고사양 컴퓨터까지는 필요하지 않습니다.

                CPU: 인텔 i3 8세대 이상 또는 라이젠 3 이상
                GPU: GTX 1050 / 내장 그래픽 일부 모델도 가능
                RAM: 8GB 이상, 여유 있게는 16GB
                저장장치: SSD 256GB 이상

                중고 구매 기준으로는 20만~50만 원대 본체도 충분히 후보가 될 수 있습니다.
                """;
    }
}