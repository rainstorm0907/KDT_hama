package com.used.service.chatbot.controller;

import com.used.service.chatbot.service.GeminiClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@RestController
@RequestMapping("/api/gemini")
@RequiredArgsConstructor
public class GeminiTestController {

    private final GeminiClientService geminiClientService;

    @GetMapping("/test")
    public ResponseEntity<Map<String, String>> testGemini() {
        System.out.println("[GET /api/gemini/test] Gemini test requested");
        try {
            String result = geminiClientService.testConnection();
            return ResponseEntity.ok(Map.of("status", "success", "message", result));
        } catch (WebClientResponseException.TooManyRequests e) {
            return ResponseEntity.status(429)
                    .body(Map.of(
                            "status", "fail",
                            "error", "TOO_MANY_REQUESTS",
                            "message", "Gemini API request limit was reached. Try again later."
                    ));
        } catch (WebClientResponseException e) {
            return ResponseEntity.status(e.getStatusCode())
                    .body(Map.of(
                            "status", "fail",
                            "error", e.getClass().getSimpleName(),
                            "message", e.getResponseBodyAsString()
                    ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of(
                            "status", "fail",
                            "error", e.getClass().getSimpleName(),
                            "message", e.getMessage()
                    ));
        }
    }
}
