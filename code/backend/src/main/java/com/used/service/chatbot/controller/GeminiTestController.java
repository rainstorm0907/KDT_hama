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

        System.out.println("?슚 [/api/gemini/test] 而⑦듃濡ㅻ윭 ?몄텧??");
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
                            "message", "Gemini API ?붿껌 ?쒗븳??嫄몃졇?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??"
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
