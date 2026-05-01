package com.example.ffff.chatbot.controller;


import com.example.ffff.chatbot.dto.ChatMessageRequest;
import com.example.ffff.chatbot.dto.ChatMessageResponse;
import com.example.ffff.chatbot.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/message")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @Valid @RequestBody ChatMessageRequest request
    ) {
        ChatMessageResponse response = chatbotService.handleMessage(request);
        return ResponseEntity.ok(response);
    }
}