package com.example.ffff.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponseDto {

    private Long id;

    private String platform;

    private String pid;

    private String name;

    private String brand;

    private Long price;

    private String status;

    private String description;

    private String imageUrl;

    private List<String> images;

    private String link;

    private String date;

    private String category;

    private List<PricePointResponseDto> priceHistory;
}