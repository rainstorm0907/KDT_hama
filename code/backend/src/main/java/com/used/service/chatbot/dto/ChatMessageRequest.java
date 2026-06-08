package com.used.service.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatMessageRequest {

    @NotBlank(message = "message???꾩닔?낅땲??")
    private String message;

    private Long itemId;
}
