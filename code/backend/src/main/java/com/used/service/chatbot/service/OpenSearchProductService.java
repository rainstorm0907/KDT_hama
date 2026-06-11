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

                results.add(RecommendedItemDto.builder()
                        .itemId(toLong(item.get("id")))
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
