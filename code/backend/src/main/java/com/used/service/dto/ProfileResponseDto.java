package com.used.service.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class ProfileResponseDto {

    private Long userId;

    private String loginId;

    private String email;

    private String name;

    private String nickname;

    private String phoneNumber;

    private LocalDate birthDate;

    private String accountStatus;

    private String role;

    private LocalDateTime createdAt;
}