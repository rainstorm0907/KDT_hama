package com.example.ffff.chatbot.controller;

import com.example.ffff.chatbot.dto.ChatHistoryResponse;
import com.example.ffff.chatbot.dto.ChatMessageRequest;
import com.example.ffff.chatbot.dto.ChatMessageResponse;
import com.example.ffff.chatbot.entity.ChatHistory;
import com.example.ffff.chatbot.repository.ChatHistoryRepository;
import com.example.ffff.chatbot.service.ChatbotService;
import com.example.ffff.chatbot.service.LoginUserService;
import com.example.ffff.chatbot.service.SearchLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;
    private final LoginUserService loginUserService;
    private final SearchLogService searchLogService;
    private final ChatHistoryRepository chatHistoryRepository;

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

    @GetMapping("/history/recent")
    public ResponseEntity<List<ChatHistoryResponse>> getRecentHistory(
            Authentication authentication
    ) {
        Long loginUserId = loginUserService.getLoginUserId(authentication);
        LocalDateTime oneDayAgo = LocalDateTime.now().minusDays(1);

        List<ChatHistoryResponse> history = chatHistoryRepository
                .findByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(loginUserId, oneDayAgo)
                .stream()
                .map(this::toHistoryResponse)
                .toList();

        return ResponseEntity.ok(history);
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

    private ChatHistoryResponse toHistoryResponse(ChatHistory history) {
        return ChatHistoryResponse.builder()
                .chatId(history.getChatId())
                .userMessage(history.getUserMessage())
                .botResponse(history.getBotResponse())
                .intent(history.getIntent())
                .responseType(history.getResponseType())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
