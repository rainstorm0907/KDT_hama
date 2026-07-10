package com.used.service.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "USERS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SequenceGenerator(
        name = "USER_SEQ_GENERATOR",
        sequenceName = "USER_SEQ",
        initialValue = 1,
        allocationSize = 1
)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "USER_SEQ_GENERATOR")
    @Column(name = "USER_ID")
    private Long userId;

    @Column(name = "LOGIN_ID", unique = true, nullable = false, length = 50)
    private String loginId;

    @Column(name = "EMAIL", unique = true, nullable = false, length = 100)
    private String email;

    @Column(name = "PASSWORD", nullable = false, length = 255)
    private String password;

    @Column(name = "NAME", nullable = false, length = 50)
    private String name;

    @Column(name = "BIRTH_DATE")
    private LocalDate birthDate;

    @Transient
    private String phoneNumber;

    @Column(name = "NICKNAME", unique = true, nullable = false, length = 50)
    private String nickname;

    @Column(name = "PRIVACY_AGREED_AT", nullable = false)
    private LocalDateTime privacyAgreedAt;

    @Column(name = "MARKETING_AGREED_AT")
    private LocalDateTime marketingAgreedAt;

    @Column(name = "ACCOUNT_STATUS", length = 20)
    private String accountStatus = "ACTIVE";

    @Column(name = "ROLE", length = 20)
    private String role = "USER";

    @CreationTimestamp
    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    @Builder
    public User(
            String loginId,
            String email,
            String password,
            String name,
            LocalDate birthDate,
            String phoneNumber,
            String nickname,
            Boolean agreeMarketing
    ) {
        this.loginId = loginId;
        this.email = email;
        this.password = password;
        this.name = name;
        this.birthDate = birthDate;
        this.phoneNumber = phoneNumber;
        this.nickname = nickname;
        this.privacyAgreedAt = LocalDateTime.now();
        this.marketingAgreedAt = Boolean.TRUE.equals(agreeMarketing)
                ? LocalDateTime.now()
                : null;
        this.accountStatus = "ACTIVE";
        this.role = "USER";
    }

    public void updateProfile(String name, String nickname, String phoneNumber) {
        if (name != null && !name.isBlank()) {
            this.name = name.trim();
        }

        if (nickname != null && !nickname.isBlank()) {
            this.nickname = nickname.trim();
        }

        if (phoneNumber != null && !phoneNumber.isBlank()) {
            this.phoneNumber = phoneNumber.trim();
        }
    }

    public void updateEmail(String email) {
        if (email != null && !email.isBlank()) {
            this.email = email.trim();
            this.loginId = email.trim();
        }
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public void withdraw() {
        this.accountStatus = "WITHDRAWN";
    }

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(this.role);
    }

    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(this.accountStatus);
    }
}
