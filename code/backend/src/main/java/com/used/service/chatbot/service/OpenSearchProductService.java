package com.used.service.chatbot.service;

import com.used.service.chatbot.dto.ChatAnalysisResult;
import com.used.service.chatbot.dto.RecommendedItemDto;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class OpenSearchProductService {

    private final WebClient webClient;

    @Value("${hama.fastapi-base-url}")
    private String fastApiBaseUrl;

    public List<RecommendedItemDto> search(ChatAnalysisResult analysis, int limit) {
        if (analysis == null || analysis.getKeyword() == null || analysis.getKeyword().isBlank()) {
            return List.of();
        }

        try {
            URI uri = UriComponentsBuilder.fromUriString(fastApiBaseUrl)
                    .path("/api/products/search")
                    .queryParam("q", analysis.getKeyword().trim())
                    .queryParam("sort", "relevance")
                    .queryParam("page", 1)
                    .queryParam("limit", Math.max(limit * 5, 30))
                    .build()
                    .encode()
                    .toUri();

            Map<String, Object> response = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .timeout(Duration.ofSeconds(8))
                    .block();

            if (response == null || !"opensearch".equals(response.get("searchSource"))) {
                return List.of();
            }

            Object rawItems = response.get("items");
            if (!(rawItems instanceof List<?> items)) return List.of();

            List<RecommendedItemDto> results = new ArrayList<>();
            for (Object rawItem : items) {
                if (!(rawItem instanceof Map<?, ?> item)) continue;

                Long currentPrice = toLong(item.get("price"));
                if (!matchesPrice(currentPrice, analysis.getMinPrice(), analysis.getMaxPrice())) continue;
                if (!matchesSearchIntent(item, analysis)) continue;

                results.add(RecommendedItemDto.builder()
                        .itemId(toLong(item.get("id")))
                        .platform(toText(item.get("platform")))
                        .pid(toText(item.get("pid")))
                        .title(toText(item.get("name")))
                        .currentPrice(currentPrice)
                        .lowestPrice(resolveLowestPrice(item, currentPrice))
                        .categoryName(toText(item.get("category")))
                        .thumbnailUrl(toText(item.get("imageUrl")))
                        .itemUrl(toText(item.get("link")))
                        .score(Math.max(1, 100 - results.size()))
                        .recommendReason("OpenSearch 검색 관련도와 가격 조건을 기준으로 찾은 상품입니다.")
                        .build());

                if (results.size() >= limit) break;
            }

            System.out.println("[chatbot] OpenSearch recommendation count=" + results.size());
            return results;
        } catch (RuntimeException exception) {
            System.err.println("[chatbot] OpenSearch search failed; using database fallback: "
                    + exception.getMessage());
            return List.of();
        }
    }

    private boolean matchesSearchIntent(Map<?, ?> item, ChatAnalysisResult analysis) {
        String title = normalize(toText(item.get("name")));
        String keyword = normalize(analysis == null ? "" : analysis.getKeyword());
        String productType = normalize(analysis == null ? "" : analysis.getProductType());

        if (title.isBlank()) return false;

        if (containsAny(keyword, "iphone", "\uC544\uC774\uD3F0")) {
            if (!containsAny(title, "iphone", "\uC544\uC774\uD3F0")) return false;
            if (!isAccessoryQuery(keyword) && containsSmartphoneAccessory(title)) return false;
            String modelNumber = firstNumber(keyword);
            return modelNumber == null || title.contains(modelNumber);
        }

        if (containsAny(keyword, "galaxy", "\uAC24\uB7ED\uC2DC")) {
            if (!containsAny(title, "galaxy", "\uAC24\uB7ED\uC2DC")) return false;
            if (!isAccessoryQuery(keyword) && containsSmartphoneAccessory(title)) return false;
            String modelNumber = firstNumber(keyword);
            return modelNumber == null || title.contains(modelNumber);
        }

        if ("desktop".equals(productType)) {
            boolean looksLikeDesktop = containsAny(title,
                    "pc", "\uCEF4\uD4E8\uD130", "\uBCF8\uCCB4", "\uB370\uC2A4\uD06C\uD0D1", "\uAC8C\uC774\uBC0D");
            boolean looksLikeCompletePc = containsAny(title,
                    "\uBCF8\uCCB4", "\uB370\uC2A4\uD06C\uD0D1", "\uC644\uBCF8\uCCB4", "\uC870\uB9BDpc", "\uC870\uB9BD pc",
                    "\uAC8C\uC774\uBC0Dpc", "\uAC8C\uC774\uBC0D pc", "\uACE0\uC0AC\uC591 \uCEF4\uD4E8\uD130", "\uCEF4\uD4E8\uD130 \uD480\uC138\uD2B8");
            boolean looksLikeGpuOnly = containsAny(title,
                    "gpu", "rtx", "gtx", "\uADF8\uB798\uD53D\uCE74\uB4DC", "\uADF8\uB798\uD53D \uCE74\uB4DC")
                    && !looksLikeDesktop;
            boolean excludedAccessoryOrPart = containsAny(title,
                    "\uBA54\uC778\uBCF4\uB4DC", "\uBCF4\uB4DC", "\uD30C\uC6CC", "\uB7A8", "ram", "ssd", "hdd",
                    "\uCF00\uC774\uBE14", "\uC5B4\uB311\uD130", "\uCF00\uC774\uC2A4", "\uD0A4\uBCF4\uB4DC", "\uB9C8\uC6B0\uC2A4",
                    "\uBAA8\uB2C8\uD130", "\uCC45\uC0C1", "\uD14C\uC774\uBE14", "\uB178\uD2B8\uBD81", "\uB9E5\uBBF8\uB2C8", "mac mini", "\uB9E5\uBD81");
            return looksLikeDesktop && looksLikeCompletePc && !looksLikeGpuOnly && !excludedAccessoryOrPart;
        }

        if ("laptop".equals(productType)) {
            return containsAny(title, "\uB178\uD2B8\uBD81", "\uB9E5\uBD81", "gram", "\uADF8\uB7A8", "thinkpad", "\uB808\uB178\uBC84");
        }

        if ("smartphone".equals(productType)) {
            if (!isAccessoryQuery(keyword) && containsSmartphoneAccessory(title)) return false;
            return containsAny(title, "\uC544\uC774\uD3F0", "iphone", "\uAC24\uB7ED\uC2DC", "galaxy", "\uD578\uB4DC\uD3F0", "\uC2A4\uB9C8\uD2B8\uD3F0");
        }

        if (!keyword.isBlank() && keyword.length() >= 2) {
            return title.contains(keyword) || hasAnyMeaningfulKeywordToken(title, keyword);
        }
        return true;
    }

    private boolean hasAnyMeaningfulKeywordToken(String title, String keyword) {
        for (String token : keyword.split("[^0-9a-zA-Z\\uAC00-\\uD7A3]+")) {
            if (token.length() >= 2 && title.contains(token)) return true;
        }
        return false;
    }

    private boolean isAccessoryQuery(String keyword) {
        return containsAny(keyword,
                "\uCF00\uC774\uC2A4", "\uCDA9\uC804\uAE30", "\uCDA9\uC804", "\uCF00\uC774\uBE14", "\uBCF4\uD638\uD544\uB984", "\uD544\uB984",
                "\uAC15\uD654\uC720\uB9AC", "\uB9E5\uC138\uC774\uD504", "magsafe", "\uAC70\uCE58\uB300", "\uD30C\uC6B0\uCE58",
                "\uC2A4\uD2B8\uB7A9", "\uC5B4\uB311\uD130", "\uC561\uC138\uC11C\uB9AC");
    }

    private boolean containsSmartphoneAccessory(String title) {
        return containsAny(title,
                "\uCF00\uC774\uC2A4", "\uC820\uB9AC\uCF00\uC774\uC2A4", "\uBC94\uD37C\uCF00\uC774\uC2A4", "\uCDA9\uC804\uAE30",
                "\uCDA9\uC804 \uCF00\uC774\uBE14", "\uCF00\uC774\uBE14", "\uBCF4\uD638\uD544\uB984", "\uD544\uB984", "\uAC15\uD654\uC720\uB9AC",
                "\uB9E5\uC138\uC774\uD504", "magsafe", "\uAC70\uCE58\uB300", "\uD30C\uC6B0\uCE58", "\uC2A4\uD2B8\uB7A9",
                "\uC5B4\uB311\uD130", "\uC561\uC815\uD544\uB984", "\uCE74\uBA54\uB77C\uD544\uB984");
    }

    private String firstNumber(String value) {
        if (value == null) return null;
        Matcher matcher = Pattern.compile("\\d+").matcher(value);
        return matcher.find() ? matcher.group() : null;
    }

    private boolean containsAny(String value, String... keywords) {
        if (value == null || value.isBlank()) return false;
        for (String keyword : keywords) {
            if (value.contains(normalize(keyword))) return true;
        }
        return false;
    }

    private String normalize(String value) {
        return value == null ? "" : value.toLowerCase().replaceAll("\\s+", " ").trim();
    }

    private boolean matchesPrice(Long price, Long minPrice, Long maxPrice) {
        if (price == null) return false;
        if (minPrice != null && minPrice > 0 && price < minPrice) return false;
        return maxPrice == null || maxPrice <= 0 || price <= maxPrice;
    }

    private Long resolveLowestPrice(Map<?, ?> item, Long currentPrice) {
        Object rawHistory = item.get("priceHistory");
        if (!(rawHistory instanceof List<?> history)) return currentPrice;

        Long lowest = null;
        for (Object rawEntry : history) {
            if (!(rawEntry instanceof Map<?, ?> entry)) continue;
            Long price = toLong(entry.get("price"));
            if (price != null && (lowest == null || price < lowest)) lowest = price;
        }
        return lowest == null ? currentPrice : lowest;
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) return number.longValue();
        if (value == null) return null;
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String toText(Object value) {
        return value == null ? "" : value.toString();
    }
}
