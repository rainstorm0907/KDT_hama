package com.used.service.controller;

import com.used.service.dto.ProductResponseDto;
import com.used.service.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // 메인 추천 상품 API
    // GET /api/products/recommended
    @GetMapping("/recommended")
    public Map<String, Object> getRecommendedProducts(
            @RequestParam(required = false, defaultValue = "20") int limit
    ) {
        List<ProductResponseDto> products = productService.getRecommendedProducts();
        int safeLimit = Math.max(limit, 1);
        List<ProductResponseDto> limitedProducts =
                products.subList(0, Math.min(products.size(), safeLimit));

        Map<String, Object> response = new HashMap<>();
        response.put("items", limitedProducts);
        response.put("total", products.size());
        response.put("limit", safeLimit);
        response.put("summary", buildSummary(products));

        return response;
    }

    // 상품 목록 API
    // GET /api/products
    // GET /api/products?category=노트북
    // GET /api/products?category=laptop
    @GetMapping
    public List<ProductResponseDto> getProducts(
            @RequestParam(required = false) String category
    ) {
        if (category == null || category.isBlank()) {
            return productService.getRecommendedProducts();
        }

        return productService.getProductsByCategory(category);
    }

    // 상품 검색 API
    // 프론트 요청 예시:
    // GET /api/products/search?q=아이폰&platforms=번개장터,중고나라&sort=low-price&page=1&limit=20
    @GetMapping("/search")
    public Map<String, Object> searchProducts(
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "keyword", required = false) String keyword,
            @RequestParam(required = false, defaultValue = "") String platforms,
            @RequestParam(required = false, defaultValue = "low-price") String sort,
            @RequestParam(required = false, defaultValue = "1") int page,
            @RequestParam(required = false, defaultValue = "20") int limit
    ) {
        String searchKeyword = resolveSearchKeyword(q, keyword);

        List<ProductResponseDto> searchedProducts =
                productService.searchProducts(searchKeyword);

        List<ProductResponseDto> filteredProducts =
                filterByPlatforms(searchedProducts, platforms);

        List<ProductResponseDto> sortedProducts =
                sortProducts(filteredProducts, sort);

        int total = sortedProducts.size();

        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(limit, 1);

        int fromIndex = Math.min((safePage - 1) * safeLimit, total);
        int toIndex = Math.min(fromIndex + safeLimit, total);

        List<ProductResponseDto> pagedItems = sortedProducts.subList(fromIndex, toIndex);

        Map<String, Object> response = new HashMap<>();
        response.put("items", pagedItems);
        response.put("total", total);
        response.put("page", safePage);
        response.put("limit", safeLimit);
        response.put("summary", buildSummary(filteredProducts));

        return response;
    }

    // 상품 상세 API
    // GET /api/products/1
    @GetMapping("/{id}")
    public ProductResponseDto getProductDetail(
            @PathVariable Long id
    ) {
        return productService.getProductDetail(id);
    }

    @GetMapping("/{platform}/{pid}")
    public ProductResponseDto getProductDetailByPlatformAndPid(
            @PathVariable String platform,
            @PathVariable String pid
    ) {
        return productService.getProductDetail(platform, pid);
    }

    private String resolveSearchKeyword(String q, String keyword) {
        if (q != null && !q.isBlank()) {
            return q.trim();
        }

        if (keyword != null && !keyword.isBlank()) {
            return keyword.trim();
        }

        return "";
    }

    private List<ProductResponseDto> filterByPlatforms(
            List<ProductResponseDto> products,
            String platforms
    ) {
        if (platforms == null || platforms.isBlank()) {
            return products;
        }

        List<String> platformList = List.of(platforms.split(","))
                .stream()
                .map(String::trim)
                .filter(platform -> !platform.isBlank())
                .toList();

        if (platformList.isEmpty()) {
            return products;
        }

        return products.stream()
                .filter(product -> platformList.contains(product.getPlatform()))
                .toList();
    }

    private List<ProductResponseDto> sortProducts(
            List<ProductResponseDto> products,
            String sort
    ) {
        if ("recent".equals(sort)) {
            return products.stream()
                    .sorted((a, b) -> b.getId().compareTo(a.getId()))
                    .toList();
        }

        if ("low-price".equals(sort)) {
            return products.stream()
                    .sorted((a, b) -> Long.compare(a.getPrice(), b.getPrice()))
                    .toList();
        }

        return products;
    }

    private Map<String, Object> buildSummary(List<ProductResponseDto> products) {
        Map<String, Object> summary = new HashMap<>();

        if (products.isEmpty()) {
            summary.put("lowestPrice", 0);
            summary.put("averagePrice", 0);
            summary.put("updatedAt", nowText());
            return summary;
        }

        long lowestPrice = products.stream()
                .mapToLong(ProductResponseDto::getPrice)
                .min()
                .orElse(0);

        long averagePrice = Math.round(
                products.stream()
                        .mapToLong(ProductResponseDto::getPrice)
                        .average()
                        .orElse(0)
        );

        summary.put("lowestPrice", lowestPrice);
        summary.put("averagePrice", averagePrice);
        summary.put("updatedAt", nowText());

        return summary;
    }

    private String nowText() {
        return LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm"));
    }
}
