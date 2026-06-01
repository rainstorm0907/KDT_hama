package com.example.ffff.entity;

import com.example.ffff.chatbot.entity.Item;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "WISHLISTS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SequenceGenerator(
        name = "WISHLIST_SEQ_GENERATOR",
        sequenceName = "WISHLIST_SEQ",
        initialValue = 1,
        allocationSize = 1
)
public class Wishlist {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "WISHLIST_SEQ_GENERATOR")
    @Column(name = "WISH_ID")
    private Long wishId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ITEM_ID", nullable = false)
    private Item item;

    @Column(name = "TARGET_PRICE")
    private Long targetPrice;

    @Column(name = "IS_LOWEST_ALERT", length = 1)
    private String isLowestAlert = "Y";

    @CreationTimestamp
    @Column(name = "ADDED_AT")
    private LocalDateTime addedAt;

    public Wishlist(User user, Item item) {
        this.user = user;
        this.item = item;
        this.isLowestAlert = "Y";
    }

    public void updateAlert(Long targetPrice, Boolean lowestAlert) {
        this.targetPrice = targetPrice;

        if (lowestAlert != null) {
            this.isLowestAlert = lowestAlert ? "Y" : "N";
        }
    }

    public boolean isLowestAlertEnabled() {
        return "Y".equalsIgnoreCase(this.isLowestAlert);
    }

    public boolean isTargetPriceReached() {
        if (targetPrice == null || item.getCurrentPrice() == null) {
            return false;
        }

        return item.getCurrentPrice() <= targetPrice;
    }
}