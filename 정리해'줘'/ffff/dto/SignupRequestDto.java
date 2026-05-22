package com.example.ffff.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignupRequestDto {
    private String email;
    private String password;
    private String passwordConfirm; // 비밀번호 확인 필드 추가
    private String nickname;
}