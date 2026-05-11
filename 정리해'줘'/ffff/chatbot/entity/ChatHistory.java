package com.example.ffff.chatbot.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "CHAT_HISTORY")
@Getter
@Setter
public class ChatHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "chat_history_seq_gen")
    @SequenceGenerator(
            name = "chat_history_seq_gen",
            sequenceName = "CHAT_HISTORY_SEQ",
            allocationSize = 1
    )
    @Column(name = "CHAT_ID")
    private Long chatId;

    @Column(name = "USER_ID")
    private Long userId;

    @Lob
    @Column(name = "USER_MESSAGE")
    private String userMessage;

    @Lob
    @Column(name = "BOT_RESPONSE")
    private String botResponse;

    @Column(name = "INTENT", length = 50)
    private String intent;

    @Column(name = "RESPONSE_TYPE", length = 30)
    private String responseType;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}