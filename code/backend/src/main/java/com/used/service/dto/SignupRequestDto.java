package com.used.service.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class SignupRequestDto {

    private String email;
    private String password;
    private String passwordConfirm;

    private String name;
    private LocalDate birthDate;
    private String phone;
    private String nickname;

    private Boolean agreeMarketing;

    public String getFinalNickname() {
        if (nickname != null && !nickname.isBlank()) {
            return nickname.trim();
        }

        return null;
    }

    public String getFinalName() {
        if (name != null && !name.isBlank()) {
            return name.trim();
        }

        return null;
    }

    public String getFinalLoginId() {
        if (email == null || email.isBlank()) {
            return null;
        }

        return email.trim();
    }

    public String getFinalPhoneNumber() {
        if (phone == null || phone.isBlank()) {
            return null;
        }

        return phone.trim();
    }
}
