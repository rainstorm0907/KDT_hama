package com.example.ffff.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "KEYWORD_ALERTS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SequenceGenerator(
        name = "KEYWORD_ALERT_SEQ_GENERATOR",
        sequenceName = "KEYWORD_ALERT_SEQ",
        allocationSize = 1
)
public class KeywordAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "KEYWORD_ALERT_SEQ_GENERATOR")
    @Column(name = "KEYWORD_ALERT_ID")
    private Long keywordAlertId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @Column(name = "KEYWORD", nullable = false, length = 100)
    private String keyword;

    @Column(name = "IS_ACTIVE", length = 1)
    private String isActive = "Y";

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    public KeywordAlert(User user, String keyword) {
        this.user = user;
        this.keyword = keyword.trim();
        this.isActive = "Y";
        this.createdAt = LocalDateTime.now();
    }

    public void deactivate() {
        this.isActive = "N";
    }

    public boolean isActive() {
        return "Y".equalsIgnoreCase(this.isActive);
    }
}