package com.example.ffff.chatbot.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "SEARCH_LOGS")
@Getter
@Setter
public class SearchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "search_log_seq_gen")
    @SequenceGenerator(
            name = "search_log_seq_gen",
            sequenceName = "SEARCH_LOG_SEQ",
            allocationSize = 1
    )
    @Column(name = "LOG_ID")
    private Long logId;

    @Column(name = "USER_ID")
    private Long userId;

    @Column(name = "KEYWORD", nullable = false, length = 100)
    private String keyword;

    @Column(name = "CLICKED_ITEM_ID")
    private Long clickedItemId;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}