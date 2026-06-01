package com.example.ffff.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class WishlistResponseDto {

    private Long wishId;

    private Long itemId;

    private String itemName;

    private String imageUrl;

    private Long currentPrice;

    private Long targetPrice;

    private Boolean lowestAlert;

    private Boolean targetPriceReached;

    private LocalDateTime addedAt;

    private ProductResponseDto product;
}