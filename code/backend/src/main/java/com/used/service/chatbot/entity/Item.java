package com.used.service.chatbot.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "ITEMS")
@Getter
@Setter
public class Item {

    @Id
    @Column(name = "ITEM_ID")
    private Long itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "PLATFORM_ID", nullable = false)
    private Platform platform;

    @Column(name = "ORIGINAL_ID", nullable = false, length = 100)
    private String originalId;

    @Column(name = "CANONICAL_NAME", nullable = false, length = 200)
    private String canonicalName;

    @Column(name = "TITLE", nullable = false, length = 300)
    private String title;

    @Column(name = "DESCRIPTION", columnDefinition = "TEXT")
    private String description;

    @Column(name = "CURRENT_PRICE", nullable = false)
    private Long currentPrice;

    @Column(name = "LOWEST_PRICE")
    private Long lowestPrice;

    @Column(name = "CATEGORY_NAME", length = 100)
    private String categoryName;

    @Column(name = "MATCHED_KEYWORDS", length = 500)
    private String matchedKeywords;

    @Column(name = "STATUS", nullable = false, length = 20)
    private String saleStatus;

    @Column(name = "SOLD_AT")
    private LocalDateTime soldAt;

    @Column(name = "THUMBNAIL_URL", length = 500)
    private String thumbnailUrl;

    @Column(name = "ITEM_URL", nullable = false, length = 500)
    private String itemUrl;

    @Column(name = "URL_CHECKED_AT")
    private LocalDateTime urlCheckedAt;

    @Column(name = "URL_STATUS", length = 20)
    private String urlStatus;

    @Column(name = "CRAWLED_AT")
    private LocalDateTime crawledAt;

    @Column(name = "LAST_SEEN_AT")
    private LocalDateTime lastSeenAt;

    public String getPlatformName() {
        return platform == null ? null : platform.getPlatformName();
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (this.crawledAt == null) {
            this.crawledAt = now;
        }
        if (this.lastSeenAt == null) {
            this.lastSeenAt = now;
        }
        if (this.saleStatus == null || this.saleStatus.isBlank()) {
            this.saleStatus = "판매중";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.lastSeenAt = LocalDateTime.now();
        if (this.saleStatus == null || this.saleStatus.isBlank()) {
            this.saleStatus = "판매중";
        }
    }
}
