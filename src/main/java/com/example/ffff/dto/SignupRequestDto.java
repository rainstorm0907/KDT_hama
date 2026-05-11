package com.example.ffff.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignupRequestDto {

    private String name;
    private String nickname;
    private String email;
    private String password;
    private String passwordConfirm;

    public String getNickname() {
        if (nickname != null && !nickname.isBlank()) {
            return nickname;
        }

        return name;
    }
}