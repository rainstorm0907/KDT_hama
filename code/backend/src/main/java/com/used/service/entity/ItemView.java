package com.used.service.entity;

import com.used.service.chatbot.entity.Item;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ITEM_VIEWS")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SequenceGenerator(
        name = "ITEM_VIEW_SEQ_GENERATOR",
        sequenceName = "ITEM_VIEW_SEQ",
        allocationSize = 1
)
public class ItemView {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "ITEM_VIEW_SEQ_GENERATOR")
    @Column(name = "VIEW_ID")
    private Long viewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "USER_ID", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ITEM_ID", nullable = false)
    private Item item;

    @Column(name = "VIEWED_AT")
    private LocalDateTime viewedAt;

    public ItemView(User user, Item item) {
        this.user = user;
        this.item = item;
        this.viewedAt = LocalDateTime.now();
    }

    public void refreshViewedAt() {
        this.viewedAt = LocalDateTime.now();
    }
}