package com.used.service.entity;

import com.used.service.chatbot.entity.Item;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "NOTIFICATIONS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SequenceGenerator(
        name = "NOTIFICATION_SEQ_GENERATOR",
        sequenceName = "NOTIFICATION_SEQ",
        allocationSize = 1
)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "NOTIFICATION_SEQ_GENERATOR")
    @Column(name = "NOTIFICATION_ID")
    private Long notificationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ITEM_ID")
    private Item item;

    @Column(name = "NOTIFICATION_TYPE", nullable = false, length = 30)
    private String notificationType;

    @Column(name = "TITLE", nullable = false, length = 200)
    private String title;

    @Column(name = "MESSAGE", length = 1000)
    private String message;

    @Column(name = "PAYLOAD", columnDefinition = "TEXT")
    private String payload;

    @Column(name = "IS_READ", length = 1)
    private String isRead = "N";

    @Column(name = "SEND_STATUS", length = 20)
    private String sendStatus = "PENDING";

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @Column(name = "SENT_AT")
    private LocalDateTime sentAt;

    @Column(name = "READ_AT")
    private LocalDateTime readAt;

    public void markAsRead() {
        this.isRead = "Y";
        this.readAt = LocalDateTime.now();
    }

    public boolean isRead() {
        return "Y".equalsIgnoreCase(this.isRead);
    }
}
