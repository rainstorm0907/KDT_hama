package com.example.ffff.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class KeywordAlertResponseDto {

    private Long keywordAlertId;

    private String keyword;

    private Boolean active;

    private LocalDateTime createdAt;
}