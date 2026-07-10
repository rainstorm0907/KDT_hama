package com.used.service.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationSettingResponseDto {

    private Boolean lowestPriceEnabled;

    private Boolean soldStatusEnabled;

    private Boolean newItemEnabled;

    private LocalDateTime updatedAt;
}