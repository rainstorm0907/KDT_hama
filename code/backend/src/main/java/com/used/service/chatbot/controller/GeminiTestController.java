package com.example.ffff.chatbot.controller;

import com.example.ffff.chatbot.service.GeminiClientService;
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

        System.out.println("🚨 [/api/gemini/test] 컨트롤러 호출됨!");
        try {
            String result = geminiClientService.testConnection();

            return ResponseEntity.ok(
                    Map.of(
                            "status", "success",
                            "message", result
                    )
            );
        } catch (WebClientResponseException.TooManyRequests e) {
            return ResponseEntity.status(429)
                    .body(Map.of(
                            "status", "fail",
                            "error", "TOO_MANY_REQUESTS",
                            "message", "Gemini API 요청 제한에 걸렸습니다. 잠시 후 다시 시도해 주세요."
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