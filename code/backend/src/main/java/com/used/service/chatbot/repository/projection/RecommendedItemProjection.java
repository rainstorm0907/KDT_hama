package com.used.service.chatbot.repository.projection;

public interface RecommendedItemProjection {

    Long getItemId();

    String getPlatform();

    String getPid();

    String getTitle();

    Long getCurrentPrice();

    Long getLowestPrice();

    String getCategoryName();

    String getThumbnailUrl();

    String getItemUrl();

    Integer getScore();
}
