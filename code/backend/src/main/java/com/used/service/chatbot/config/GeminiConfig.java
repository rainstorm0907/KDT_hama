package com.used.service.chatbot.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class GeminiConfig {

    @Bean
    public WebClient geminiWebClient(
            @Value("${gemini.base-url}") String baseUrl,
            @Value("${gemini.api-key}") String apiKey
    ) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("GEMINI_API_KEY ?섍꼍蹂?섍? ?ㅼ젙?섏? ?딆븯?듬땲??");
        }

        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .defaultHeader("x-goog-api-key", apiKey)
                .build();
    }
}
