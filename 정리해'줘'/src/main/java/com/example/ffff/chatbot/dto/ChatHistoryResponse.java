package com.example.ffff.chatbot.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatHistoryResponse {

    private Long chatId;
    private String userMessage;
    private String botResponse;
    private String intent;
    private String responseType;
    private LocalDateTime createdAt;
}
