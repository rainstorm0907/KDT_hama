package com.example.ffff.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessageRequest {

    @NotBlank(message = "message는 필수입니다.")
    private String message;

    private Long itemId;
}