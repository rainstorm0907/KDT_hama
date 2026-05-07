package com.example.ffff.chatbot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
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

    @Column(name = "PLATFORM_ID")
    private Long platformId;

    @Column(name = "ORIGINAL_ID", nullable = false, length = 100)
    private String originalId;

    @Column(name = "TITLE", nullable = false, length = 300)
    private String title;

    @Column(name = "CURRENT_PRICE", nullable = false)
    private Long currentPrice;

    @Column(name = "LOWEST_PRICE")
    private Long lowestPrice;

    @Column(name = "CATEGORY_NAME", length = 100)
    private String categoryName;

    @Column(name = "THUMBNAIL_URL", length = 500)
    private String thumbnailUrl;

    @Column(name = "ITEM_URL", nullable = false, length = 500)
    private String itemUrl;

    @Column(name = "CRAWLED_AT")
    private LocalDateTime crawledAt;

    @Column(name = "IS_DELETED", length = 1)
    private String isDeleted;

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    @Column(name = "NORMALIZED_TITLE", length = 500)
    private String normalizedTitle;

    @Column(name = "BRAND", length = 100)
    private String brand;

    @Column(name = "MODEL_NAME", length = 200)
    private String modelName;

    @Column(name = "PRODUCT_TYPE", length = 50)
    private String productType;

    @Column(name = "IS_ACCESSORY", length = 1)
    private String isAccessory;

    @Column(name = "STORAGE_GB")
    private Integer storageGb;

    @Column(name = "TRADE_STATUS", length = 20)
    private String tradeStatus;

    @Column(name = "CPU_NAME", length = 100)
    private String cpuName;

    @Column(name = "GPU_NAME", length = 100)
    private String gpuName;

    @Column(name = "RAM_GB")
    private Integer ramGb;

    @Column(name = "SSD_GB")
    private Integer ssdGb;

    @Column(name = "PERFORMANCE_LEVEL", length = 30)
    private String performanceLevel;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        if (this.crawledAt == null) {
            this.crawledAt = now;
        }

        if (this.updatedAt == null) {
            this.updatedAt = now;
        }

        applyDefaultValues();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
        applyDefaultValues();
    }

    private void applyDefaultValues() {
        if (this.isDeleted == null || this.isDeleted.isBlank()) {
            this.isDeleted = "N";
        }

        if (this.isAccessory == null || this.isAccessory.isBlank()) {
            this.isAccessory = "N";
        }

        if (this.tradeStatus == null || this.tradeStatus.isBlank()) {
            this.tradeStatus = "SALE";
        }

        if (this.normalizedTitle == null || this.normalizedTitle.isBlank()) {
            this.normalizedTitle = this.title;
        }
        if (this.performanceLevel == null || this.performanceLevel.isBlank()) {
            this.performanceLevel = "UNKNOWN";
        }
    }
}