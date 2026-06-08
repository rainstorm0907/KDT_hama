package com.used.service.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "NOTIFICATION_SETTINGS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SequenceGenerator(
        name = "NOTIFICATION_SETTING_SEQ_GENERATOR",
        sequenceName = "NOTIFICATION_SETTING_SEQ",
        allocationSize = 1
)
public class NotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "NOTIFICATION_SETTING_SEQ_GENERATOR")
    @Column(name = "SETTING_ID")
    private Long settingId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false, unique = true)
    private User user;

    @Column(name = "LOWEST_PRICE_ENABLED", length = 1)
    private String lowestPriceEnabled = "Y";

    @Column(name = "SOLD_STATUS_ENABLED", length = 1)
    private String soldStatusEnabled = "Y";

    @Column(name = "NEW_ITEM_ENABLED", length = 1)
    private String newItemEnabled = "Y";

    @Column(name = "UPDATED_AT")
    private LocalDateTime updatedAt;

    public NotificationSetting(User user) {
        this.user = user;
        this.lowestPriceEnabled = "Y";
        this.soldStatusEnabled = "Y";
        this.newItemEnabled = "Y";
        this.updatedAt = LocalDateTime.now();
    }

    public void update(Boolean lowestPriceEnabled, Boolean soldStatusEnabled, Boolean newItemEnabled) {
        if (lowestPriceEnabled != null) {
            this.lowestPriceEnabled = lowestPriceEnabled ? "Y" : "N";
        }

        if (soldStatusEnabled != null) {
            this.soldStatusEnabled = soldStatusEnabled ? "Y" : "N";
        }

        if (newItemEnabled != null) {
            this.newItemEnabled = newItemEnabled ? "Y" : "N";
        }

        this.updatedAt = LocalDateTime.now();
    }

    public boolean isLowestPriceEnabled() {
        return "Y".equalsIgnoreCase(lowestPriceEnabled);
    }

    public boolean isSoldStatusEnabled() {
        return "Y".equalsIgnoreCase(soldStatusEnabled);
    }

    public boolean isNewItemEnabled() {
        return "Y".equalsIgnoreCase(newItemEnabled);
    }
}