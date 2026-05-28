package com.example.ffff.chatbot.controller;

import com.example.ffff.chatbot.dto.ChatMessageRequest;
import com.example.ffff.chatbot.dto.ChatMessageResponse;
import com.example.ffff.chatbot.service.ChatbotService;
import com.example.ffff.chatbot.service.LoginUserService;
import com.example.ffff.chatbot.service.SearchLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final LoginUserService loginUserService;
    private final SearchLogService searchLogService;

    @PostMapping("/message")
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @Valid @RequestBody ChatMessageRequest request,
            Authentication authentication
    ) {
        Long loginUserId = loginUserService.getLoginUserId(authentication);

        ChatMessageResponse response =
                chatbotService.handleMessage(loginUserId, request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/items/{itemId}/click")
    public ResponseEntity<Void> clickItem(
            @PathVariable Long itemId,
            @RequestParam(required = false) String keyword,
            Authentication authentication
    ) {
        Long loginUserId = loginUserService.getLoginUserId(authentication);

        searchLogService.saveClickedItem(loginUserId, itemId, keyword);

        return ResponseEntity.ok().build();
    }
}