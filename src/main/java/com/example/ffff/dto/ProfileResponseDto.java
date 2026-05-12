package com.example.ffff.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ProfileResponseDto {

    private Long userId;

    private String email;

    private String nickname;

    private String accountStatus;

    private LocalDateTime createdAt;
}