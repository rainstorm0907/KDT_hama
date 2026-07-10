package com.used.service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class AdminUserResponseDto {

    private Long userId;
    private String name;
    private String nickname;
    private String email;
    private LocalDateTime joinedAt;
    private LocalDateTime lastActiveAt;
    private String accountStatus;
    private String role;
    private Long wishlistCount;
}
