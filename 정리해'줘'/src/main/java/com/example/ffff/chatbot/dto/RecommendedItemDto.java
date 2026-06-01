package com.example.ffff.chatbot.dto;


import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecommendedItemDto {

    private Long itemId;
    private String title;
    private Long currentPrice;
    private Long lowestPrice;
    private String categoryName;
    private String thumbnailUrl;
    private String itemUrl;
    private Integer score;
    private String recommendReason;
}