package com.used.service.chatbot.dto;


import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ChatMessageResponse {

    private String answer;
    private String intent;
    private String responseType;
    private String keyword;
    private List<RecommendedItemDto> items;
}
