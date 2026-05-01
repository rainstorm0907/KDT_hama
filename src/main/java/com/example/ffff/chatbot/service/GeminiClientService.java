package com.example.ffff.chatbot.service;


import com.example.ffff.chatbot.dto.ChatAnalysisResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GeminiClientService {

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.model}")
    private String model;

    public String testConnection() {
        return generateText("Gemini API 연결 성공");
    }

    public ChatAnalysisResult analyzeMessage(String message) {
        String prompt = """
                너는 중고거래 가격 비교 서비스의 챗봇 라우터다.

                사용자의 메시지를 분석해서 반드시 JSON만 출력해라.
                설명 문장, 마크다운, 코드블록은 출력하지 마라.

                intent 값은 아래 중 하나만 사용해라.
                FAQ, PRODUCT_RECOMMEND, PRICE_COMPARE, PRICE_ALERT_GUIDE, SEARCH_HELP, UNKNOWN

                keyword는 상품 검색이나 가격 비교에 사용할 핵심 키워드다.
                상품 관련 질문이 아니면 keyword는 빈 문자열로 둔다.

                출력 예시:
                {"intent":"PRODUCT_RECOMMEND","keyword":"아이폰 14"}

                사용자 메시지:
                %s
                """.formatted(message);

        String resultText = generateText(prompt);

        try {
            return objectMapper.readValue(cleanJson(resultText), ChatAnalysisResult.class);
        } catch (Exception e) {
            return fallbackAnalyze(message);
        }
    }

    public String generateGeneralAnswer(String message) {
        String prompt = """
                너는 중고거래 가격 비교 서비스의 챗봇이다.

                가능한 서비스 기능:
                - 여러 중고거래 플랫폼 매물 검색
                - 상품 가격 비교
                - 찜한 상품 가격 알림
                - 상품 시세 그래프
                - 사용자 맞춤 상품 추천
                - FAQ 안내

                답변 규칙:
                - 한국어로 답변해라.
                - 짧고 명확하게 답변해라.
                - 서비스 기능과 관련된 방향으로 안내해라.
                - 확실하지 않은 내용은 단정하지 마라.

                사용자 질문:
                %s
                """.formatted(message);

        return generateText(prompt);
    }

    private String generateText(String prompt) {

        System.out.println("🚀 [Gemini API 호출됨] 현재 시간: " + java.time.LocalTime.now() +
                " | 프롬프트 일부: " + prompt.substring(0, Math.min(prompt.length(), 30)).replace("\n", " "));

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
                        "maxOutputTokens", 512
                )
        );

        JsonNode response = geminiWebClient.post()
                .uri("/v1beta/models/{model}:generateContent", model)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(Duration.ofSeconds(20))
                .block();

        return extractText(response);
    }

    private String extractText(JsonNode response) {
        if (response == null) {
            return "Gemini API 응답이 비어 있습니다.";
        }

        JsonNode candidates = response.path("candidates");

        if (candidates.isArray() && !candidates.isEmpty()) {
            JsonNode parts = candidates.get(0)
                    .path("content")
                    .path("parts");

            if (parts.isArray() && !parts.isEmpty()) {
                String text = parts.get(0).path("text").asText();

                if (text != null && !text.isBlank()) {
                    return text.trim();
                }
            }
        }

        return "Gemini API 응답에서 텍스트를 찾지 못했습니다.";
    }

    private String cleanJson(String text) {
        if (text == null) {
            return "{}";
        }

        return text
                .replace("```json", "")
                .replace("```", "")
                .trim();
    }

    private ChatAnalysisResult fallbackAnalyze(String message) {
        ChatAnalysisResult result = new ChatAnalysisResult();

        String lower = message.toLowerCase();

        if (lower.contains("추천") || lower.contains("골라") || lower.contains("상품")) {
            result.setIntent("PRODUCT_RECOMMEND");
            result.setKeyword(extractKeywordByRule(message));
            return result;
        }

        if (lower.contains("시세") || lower.contains("가격 비교") || lower.contains("얼마")) {
            result.setIntent("PRICE_COMPARE");
            result.setKeyword(extractKeywordByRule(message));
            return result;
        }

        if (lower.contains("알림") || lower.contains("찜")) {
            result.setIntent("PRICE_ALERT_GUIDE");
            result.setKeyword("");
            return result;
        }

        result.setIntent("UNKNOWN");
        result.setKeyword("");
        return result;
    }

    private String extractKeywordByRule(String message) {
        return message
                .replace("추천해줘", "")
                .replace("추천", "")
                .replace("상품", "")
                .replace("시세", "")
                .replace("가격", "")
                .replace("비교", "")
                .replace("얼마", "")
                .replace("알려줘", "")
                .replace("해줘", "")
                .replace("좀", "")
                .trim();
    }
}