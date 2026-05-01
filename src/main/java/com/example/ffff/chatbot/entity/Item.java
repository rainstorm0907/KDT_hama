package com.example.ffff.chatbot.entity;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;

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
}