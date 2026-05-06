package com.example.ffff.chatbot.service;

import com.example.ffff.chatbot.dto.ChatAnalysisResult;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GeminiClientService {

    private final WebClient geminiWebClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.model}")
    private String model;

    public String testConnection() {
        return generateText("한국어로 'Gemini API 연결 성공'이라고만 답해줘.", 64);
    }

    public ChatAnalysisResult analyzeMessage(String message) {
        ChatAnalysisResult quickResult = fallbackAnalyze(message);

        if (!"UNKNOWN".equals(quickResult.getIntent())) {
            System.out.println("⚡ [로컬 라우터 작동] API 호출 없이 의도 파악 완료: "
                    + quickResult.getIntent()
                    + " / keyword: "
                    + quickResult.getKeyword()
                    + " / maxPrice: "
                    + quickResult.getMaxPrice());

            return quickResult;
        }

        String prompt = """
                너는 중고거래 가격 비교 서비스의 챗봇 라우터다.

                사용자의 메시지를 분석해서 반드시 JSON만 출력해라.
                설명 문장, 마크다운, 코드블록은 출력하지 마라.

                intent 값은 아래 중 하나만 사용해라.
                FAQ, GREETING, ITEM_COUNT, WISHLIST_LIST,
                PRODUCT_RECOMMEND, PERSONAL_RECOMMEND,
                PRICE_COMPARE, PRICE_ALERT_GUIDE,
                SEARCH_HELP, UNKNOWN

                keyword는 상품 검색이나 가격 비교에 사용할 핵심 키워드다.
                상품 관련 질문이 아니면 keyword는 빈 문자열로 둔다.

                maxPrice는 "30만원 이하", "300000원 이하", "예산 50만원", "40만원 아래" 같은 가격 상한 조건이 있을 때 숫자 원 단위로 넣어라.
                가격 조건이 없으면 maxPrice는 null로 둔다.

                출력 예시:
                {"intent":"PRODUCT_RECOMMEND","keyword":"아이폰 13","maxPrice":400000}

                사용자 메시지:
                %s
                """.formatted(message);

        try {
            String resultText = generateText(prompt, 128);
            ChatAnalysisResult result =
                    objectMapper.readValue(cleanJson(resultText), ChatAnalysisResult.class);

            if (result.getMaxPrice() == null) {
                result.setMaxPrice(extractMaxPrice(message));
            }

            String geminiKeyword = cleanKeyword(result.getKeyword());

            if (geminiKeyword.isBlank()) {
                geminiKeyword = extractKeywordByRule(message);
            } else {
                String knownKeyword = extractKnownProductKeyword(message);

                if (!knownKeyword.isBlank()) {
                    geminiKeyword = knownKeyword;
                }
            }

            result.setKeyword(geminiKeyword);

            return result;
        } catch (Exception e) {
            ChatAnalysisResult errorResult = new ChatAnalysisResult();
            errorResult.setIntent("UNKNOWN");
            errorResult.setKeyword("");
            errorResult.setMaxPrice(null);
            return errorResult;
        }
    }

    public String generateGeneralAnswer(String message) {
        String prompt = """
                너는 중고거래 가격 비교 서비스의 챗봇이다.

                서비스 설명:
                이 서비스는 여러 중고거래 플랫폼의 상품을 한곳에서 검색하고,
                가격 비교, 찜, 가격 알림, 시세 확인을 도와주는 서비스다.

                답변 규칙:
                - 한국어로 답변해라.
                - 2~3문장으로만 답변해라.
                - 문장을 중간에 끊지 말고 완성해라.
                - 마지막 문장은 완결된 문장으로 끝내라.
                - 서비스 기능과 관련된 방향으로 안내해라.
                - 확실하지 않은 내용은 단정하지 마라.

                사용자 질문:
                %s
                """.formatted(message);

        return generateText(prompt, 768);
    }

    private String generateText(String prompt, int maxOutputTokens) {
        System.out.println("🚀 [Gemini API 호출됨] 현재 시간: "
                + java.time.LocalTime.now()
                + " | 프롬프트 일부: "
                + prompt.substring(0, Math.min(prompt.length(), 40)).replace("\n", " "));

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "maxOutputTokens", maxOutputTokens
                )
        );

        try {
            JsonNode response = geminiWebClient.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(20))
                    .block();

            return extractText(response);

        } catch (WebClientResponseException.TooManyRequests e) {
            return "현재 Gemini API 요청 제한에 걸렸습니다. 잠시 후 다시 시도해 주세요.";

        } catch (WebClientResponseException.ServiceUnavailable e) {
            return "현재 Gemini API 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.";

        } catch (WebClientResponseException.NotFound e) {
            return "Gemini 모델명을 찾을 수 없습니다. application.yml의 gemini.model 값을 확인해 주세요.";

        } catch (WebClientResponseException e) {
            return "Gemini API 호출 중 문제가 발생했습니다. 상태 코드: " + e.getStatusCode();

        } catch (Exception e) {
            return "챗봇 응답 생성 중 문제가 발생했습니다.";
        }
    }

    private String extractText(JsonNode response) {
        if (response == null) {
            return "Gemini API 응답이 비어 있습니다.";
        }

        JsonNode candidates = response.path("candidates");

        if (candidates.isArray() && !candidates.isEmpty()) {
            JsonNode firstCandidate = candidates.get(0);

            String finishReason = firstCandidate.path("finishReason").asText();
            if (!finishReason.isBlank()) {
                System.out.println("Gemini finishReason = " + finishReason);
            }

            JsonNode parts = firstCandidate
                    .path("content")
                    .path("parts");

            StringBuilder result = new StringBuilder();

            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    String text = part.path("text").asText();

                    if (text != null && !text.isBlank()) {
                        result.append(text);
                    }
                }
            }

            String finalText = result.toString().trim();

            if (!finalText.isBlank()) {
                return finalText
                        .replace("\u00A0", " ")
                        .replace("\u200B", "")
                        .replace("\u200C", "")
                        .replace("\u200D", "")
                        .replace("\uFEFF", "")
                        .trim();
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

        if (message == null || message.isBlank()) {
            result.setIntent("UNKNOWN");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        String lower = message.toLowerCase();
        String normalized = lower.replaceAll("\\s+", "");
        Long maxPrice = extractMaxPrice(message);
        String keyword = extractKeywordByRule(message);

        if (containsAny(normalized, "안녕", "하이", "반가워", "hello", "hi")) {
            result.setIntent("GREETING");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (isSiteInfoQuestion(normalized)) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (isPersonalRecommendQuestion(normalized)) {
            result.setIntent("PERSONAL_RECOMMEND");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "찜목록", "내찜", "관심상품", "관심목록")
                || (normalized.contains("찜") && containsAny(normalized, "목록", "보여", "조회", "확인"))
                || (normalized.contains("관심") && containsAny(normalized, "목록", "보여", "조회", "확인"))) {
            result.setIntent("WISHLIST_LIST");
            result.setKeyword(keyword);
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "가격알림", "알림설정", "목표가격", "희망가격")) {
            result.setIntent("PRICE_ALERT_GUIDE");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (normalized.contains("찜") && containsAny(normalized, "방법", "어떻게", "사용법", "하는법", "어케")) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (containsAny(normalized, "검색방법", "검색하는법", "검색어떻게", "검색도움")
                || (normalized.contains("검색") && containsAny(normalized, "방법", "어떻게", "하는법", "도움"))) {
            result.setIntent("FAQ");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (isItemCountQuestion(normalized, keyword)) {
            result.setIntent("ITEM_COUNT");
            result.setKeyword("");
            result.setMaxPrice(null);
            return result;
        }

        if (maxPrice != null && !keyword.isBlank()) {
            result.setIntent("PRODUCT_RECOMMEND");
            result.setKeyword(keyword);
            result.setMaxPrice(maxPrice);
            return result;
        }

        if (!keyword.isBlank()
                && (
                containsAny(normalized,
                        "추천", "골라", "괜찮은", "저렴한", "싼", "가성비",
                        "찾아", "보여", "조회", "검색",
                        "제품", "매물", "상품", "게시물", "게시글",
                        "등록된상품", "등록상품", "구매", "사려고", "살려고")
                        || isLikelyProductKeyword(keyword)
        )) {
            result.setIntent("PRODUCT_RECOMMEND");
            result.setKeyword(keyword);
            result.setMaxPrice(maxPrice);
            return result;
        }

        if (containsAny(normalized, "시세", "가격비교", "가격대", "얼마", "최저가")) {
            result.setIntent("PRICE_COMPARE");
            result.setKeyword(keyword);
            result.setMaxPrice(null);
            return result;
        }

        result.setIntent("UNKNOWN");
        result.setKeyword("");
        result.setMaxPrice(null);
        return result;
    }

    private boolean isPersonalRecommendQuestion(String normalized) {
        return containsAny(normalized,
                "나한테추천",
                "나에게추천",
                "내추천",
                "맞춤추천",
                "개인추천",
                "추천해줄만한",
                "추천할만한",
                "내가좋아할만한",
                "좋아할만한상품",
                "나한테맞는",
                "나에게맞는");
    }

    private boolean isItemCountQuestion(String normalized, String keyword) {
        if (normalized == null || normalized.isBlank()) {
            return false;
        }

        boolean countOrExistQuestion =
                normalized.contains("상품")
                        && containsAny(normalized, "개수", "몇개", "등록", "올라와", "있어", "있나요", "데이터");

        if (!countOrExistQuestion) {
            return false;
        }

        return keyword == null || keyword.isBlank();
    }

    private boolean isLikelyProductKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return false;
        }

        String normalizedKeyword = keyword.replaceAll("\\s+", "").toLowerCase();

        if (containsAny(normalizedKeyword,
                "아이폰", "갤럭시", "에어팟", "맥북", "아이패드",
                "애플워치", "닌텐도", "플스", "노트북", "모니터",
                "키보드", "마우스", "카메라")) {
            return true;
        }

        return normalizedKeyword.matches(".*\\d+.*");
    }

    private boolean isSiteInfoQuestion(String normalized) {
        return containsAny(normalized,
                "무슨사이트",
                "어떤사이트",
                "사이트설명",
                "서비스설명",
                "뭐하는사이트",
                "뭐하는서비스",
                "이사이트",
                "하마설명",
                "하마가뭐",
                "하마는뭐",
                "어떤서비스",
                "서비스소개")
                || (
                containsAny(normalized, "사이트", "서비스", "하마")
                        && containsAny(normalized, "설명", "소개", "뭐", "무엇", "알려", "대해서")
        );
    }

    private Long extractMaxPrice(String message) {
        if (message == null || message.isBlank()) {
            return null;
        }

        String text = message
                .replace(",", "")
                .toLowerCase()
                .trim();

        Pattern manwonPattern = Pattern.compile("(\\d{1,4})\\s*만원");
        Matcher manwonMatcher = manwonPattern.matcher(text);

        Long matchedPrice = null;

        while (manwonMatcher.find()) {
            long value = Long.parseLong(manwonMatcher.group(1));

            if (value >= 1 && value <= 500) {
                matchedPrice = value * 10_000;
            }
        }

        if (matchedPrice != null) {
            return matchedPrice;
        }

        Pattern wonPattern = Pattern.compile("(\\d{4,})\\s*원");
        Matcher wonMatcher = wonPattern.matcher(text);

        Long wonPrice = null;

        while (wonMatcher.find()) {
            wonPrice = Long.parseLong(wonMatcher.group(1));
        }

        return wonPrice;
    }

    private boolean containsAny(String text, String... keywords) {
        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }

        return false;
    }

    private String extractKeywordByRule(String message) {
        if (message == null) {
            return "";
        }

        String productKeyword = extractKnownProductKeyword(message);

        if (!productKeyword.isBlank()) {
            return productKeyword;
        }

        String keyword = message;

        keyword = keyword
                .replaceAll("\\d+\\s*만원\\s*(이하인|이하|미만인|미만|아래인|아래|이상인|이상|까지|안쪽|대)?", "")
                .replaceAll("\\d{1,3}(,\\d{3})+\\s*원\\s*(이하인|이하|미만인|미만|아래인|아래|이상인|이상|까지|안쪽|대)?", "")
                .replaceAll("\\d+\\s*원\\s*(이하인|이하|미만인|미만|아래인|아래|이상인|이상|까지|안쪽|대)?", "")

                .replace("추천해줘", "")
                .replace("추천", "")
                .replace("골라줘", "")
                .replace("골라", "")
                .replace("찾아줘", "")
                .replace("찾아", "")
                .replace("검색해줘", "")
                .replace("검색", "")
                .replace("알려줘", "")
                .replace("보여줘", "")
                .replace("보여", "")
                .replace("조회해줘", "")
                .replace("조회", "")
                .replace("확인해줘", "")
                .replace("확인", "")
                .replace("해줘", "")

                .replace("상품들", "")
                .replace("상품", "")
                .replace("제품들", "")
                .replace("제품", "")
                .replace("매물들", "")
                .replace("매물", "")
                .replace("게시글", "")
                .replace("게시물", "")
                .replace("것들이", "")
                .replace("것들", "")
                .replace("것", "")

                .replace("시세", "")
                .replace("가격", "")
                .replace("비교", "")
                .replace("얼마", "")
                .replace("최저가", "")
                .replace("제일", "")
                .replace("가장", "")
                .replace("저렴한", "")
                .replace("저렴하게", "")
                .replace("싼거", "")
                .replace("싼 거", "")
                .replace("싼", "")
                .replace("가성비", "")
                .replace("괜찮은", "")
                .replace("이하인", "")
                .replace("이하", "")
                .replace("아래인", "")
                .replace("아래", "")
                .replace("미만인", "")
                .replace("미만", "")
                .replace("이상인", "")
                .replace("이상", "")
                .replace("까지", "")
                .replace("안쪽", "")
                .replace("예산", "")

                .replace("현재", "")
                .replace("지금", "")
                .replace("혹시", "")
                .replace("어떤", "")
                .replace("뭐가", "")
                .replace("뭐", "")
                .replace("있는", "")
                .replace("있어?", "")
                .replace("있어", "")
                .replace("있나요", "")
                .replace("있을까", "")
                .replace("있냐", "")
                .replace("있음", "")
                .replace("좀", "")

                .replace("?", "")
                .replace("!", "")
                .replace(".", "")
                .replace(",", "")
                .replace("'", "")
                .replace("\"", "")

                .replace("등록된", "")
                .replace("등록되어있는", "")
                .replace("등록되어", "")
                .replace("등록", "")
                .replace("올라온", "")
                .replace("올라와있는", "")
                .replace("올라와", "")

                .replace("중에서", "")
                .replace("중에", "")

                .replace("구매하려고 하는데", "")
                .replace("구매하려고", "")
                .replace("구매하고 싶은데", "")
                .replace("구매하고싶은데", "")
                .replace("사려고 하는데", "")
                .replace("사려고", "")
                .replace("살려고 하는데", "")
                .replace("살려고", "")
                .replace("사고 싶은데", "")
                .replace("사고싶은데", "")
                .replace("구매", "")
                .replace("제품 있을까", "")
                .replace("있을까", "")
                .replace("있나요", "")
                .replace("있어?", "")
                .replace("있어", "")

                .replaceAll("\\s+", " ")
                .trim();

        return cleanKeyword(keyword);
    }

    private String extractKnownProductKeyword(String message) {
        if (message == null || message.isBlank()) {
            return "";
        }

        String normalized = message
                .toLowerCase()
                .replaceAll("\\s+", " ")
                .trim();

        Pattern iphonePattern = Pattern.compile("(아이폰)\\s*(\\d{1,2})?\\s*(프로맥스|프로\\s*맥스|프로|max|미니|mini|plus|플러스)?");
        Matcher iphoneMatcher = iphonePattern.matcher(normalized);

        if (iphoneMatcher.find()) {
            String base = iphoneMatcher.group(1);
            String number = iphoneMatcher.group(2);
            String model = iphoneMatcher.group(3);

            StringBuilder keyword = new StringBuilder(base);

            if (number != null && !number.isBlank()) {
                keyword.append(" ").append(number);
            }

            if (model != null && !model.isBlank()) {
                model = model.replace("프로 맥스", "프로맥스");
                model = model.replace("max", "프로맥스");
                model = model.replace("mini", "미니");
                model = model.replace("plus", "플러스");
                keyword.append(" ").append(model);
            }

            return keyword.toString().trim();
        }

        Pattern galaxyPattern = Pattern.compile("(갤럭시)\\s*(s\\d{1,2}|z\\s*플립\\d*|z\\s*폴드\\d*|플립\\d*|폴드\\d*|노트\\d*)?");
        Matcher galaxyMatcher = galaxyPattern.matcher(normalized);

        if (galaxyMatcher.find()) {
            String base = galaxyMatcher.group(1);
            String model = galaxyMatcher.group(2);

            if (model != null && !model.isBlank()) {
                model = model.replaceAll("\\s+", " ");
                return (base + " " + model).trim();
            }

            return base;
        }

        if (normalized.contains("에어팟")) {
            if (normalized.contains("프로")) {
                return "에어팟 프로";
            }

            if (normalized.contains("맥스")) {
                return "에어팟 맥스";
            }

            if (normalized.contains("2세대")) {
                return "에어팟 2세대";
            }

            if (normalized.contains("3세대")) {
                return "에어팟 3세대";
            }

            return "에어팟";
        }

        if (normalized.contains("맥북")) {
            if (normalized.contains("프로")) {
                return "맥북 프로";
            }

            if (normalized.contains("에어")) {
                return "맥북 에어";
            }

            return "맥북";
        }

        if (normalized.contains("아이패드")) {
            if (normalized.contains("프로")) {
                return "아이패드 프로";
            }

            if (normalized.contains("에어")) {
                return "아이패드 에어";
            }

            if (normalized.contains("미니")) {
                return "아이패드 미니";
            }

            return "아이패드";
        }

        if (normalized.contains("애플워치")) {
            return "애플워치";
        }

        String[] productWords = {
                "닌텐도",
                "플스",
                "노트북",
                "모니터",
                "키보드",
                "마우스",
                "카메라"
        };

        for (String productWord : productWords) {
            if (normalized.contains(productWord)) {
                return productWord;
            }
        }

        return "";
    }

    private String cleanKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return "";
        }

        Set<String> removeTokens = Set.of(
                "은", "는", "이", "가", "을", "를",
                "로", "으로", "에", "에서", "에게",
                "인", "의", "도", "만",
                "중", "중에", "중에서",
                "관련", "대상"
        );

        return Arrays.stream(keyword.split("\\s+"))
                .map(this::stripParticle)
                .filter(token -> !token.isBlank())
                .filter(token -> !removeTokens.contains(token))
                .collect(Collectors.joining(" "))
                .trim();
    }

    private String stripParticle(String token) {
        if (token == null || token.isBlank()) {
            return "";
        }

        String cleaned = token.trim();

        if (cleaned.length() <= 2) {
            return cleaned;
        }

        String[] particles = {
                "으로", "에서", "에게", "부터", "까지",
                "은", "는", "이", "가", "을", "를", "에", "의", "도", "만", "인"
        };

        for (String particle : particles) {
            if (cleaned.endsWith(particle) && cleaned.length() > particle.length() + 1) {
                return cleaned.substring(0, cleaned.length() - particle.length());
            }
        }

        return cleaned;
    }
}