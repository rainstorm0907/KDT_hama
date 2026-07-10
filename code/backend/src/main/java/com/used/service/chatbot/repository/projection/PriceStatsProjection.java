package com.used.service.chatbot.repository.projection;

public interface PriceStatsProjection {

    Long getCurrentPrice();

    Double getAverageListingPrice();

    Double getAverageSoldPrice();

    Long getListingCount();

    Long getSoldCount();
}
