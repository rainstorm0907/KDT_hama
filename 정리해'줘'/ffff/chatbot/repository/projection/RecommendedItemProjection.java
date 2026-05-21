package com.example.ffff.chatbot.repository.projection;

public interface RecommendedItemProjection {

    Long getItemId();

    String getTitle();

    Long getCurrentPrice();

    Long getLowestPrice();

    String getCategoryName();

    String getThumbnailUrl();

    String getItemUrl();

    Integer getScore();
}