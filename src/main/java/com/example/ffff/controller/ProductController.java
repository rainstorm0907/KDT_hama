package com.example.ffff.controller;

import com.example.ffff.dto.ProductResponseDto;
import com.example.ffff.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // 메인 추천 상품 API
    // GET /api/products/recommended
    @GetMapping("/recommended")
    public List<ProductResponseDto> getRecommendedProducts() {
        return productService.getRecommendedProducts();
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
    // GET /api/products/search?keyword=노트북
    @GetMapping("/search")
    public List<ProductResponseDto> searchProducts(
            @RequestParam String keyword
    ) {
        return productService.searchProducts(keyword);
    }

    // 상품 상세 API
    // GET /api/products/1
    @GetMapping("/{id}")
    public ProductResponseDto getProductDetail(
            @PathVariable Long id
    ) {
        return productService.getProductDetail(id);
    }
}