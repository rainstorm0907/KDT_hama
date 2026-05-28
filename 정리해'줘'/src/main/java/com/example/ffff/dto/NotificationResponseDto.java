package com.example.ffff.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class NotificationResponseDto {

    private Long notificationId;

    private Long itemId;

    private String notificationType;

    private String title;

    private String message;

    private String payload;

    private Boolean read;

    private String sendStatus;

    private LocalDateTime createdAt;

    private LocalDateTime sentAt;

    private LocalDateTime readAt;

    private ProductResponseDto product;
}