package com.used.service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient; // WebClient ?꾪룷???뺤씤
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    // 1. 湲곗〈 CORS ?ㅼ젙 (洹몃?濡??좎?)
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins(
                                "http://localhost:5178",
                                "http://127.0.0.1:5178",
                                "http://localhost:5173",
                                "http://127.0.0.1:5173",
                                "http://localhost:3000",
                                "http://127.0.0.1:3000"
                        )
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }

    // 2. ??遺遺꾩쓣 ?꾨옒? 媛숈씠 ?섏젙??二쇱꽭??
    @Bean
    public WebClient webClient() {
        // 留ㅺ컻蹂?섎줈 Builder瑜?諛쏆? ?딄퀬, WebClient ?대? 鍮뚮뜑瑜?吏곸젒 ?몄텧?섏뿬 ?앹꽦?⑸땲??
        return WebClient.builder().build();
    }
}
