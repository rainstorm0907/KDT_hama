package com.example.ffff.chatbot.entity;


import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "RECOMMENDED_ITEMS")
@Getter
@Setter
public class RecommendedItem {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "recommended_items_seq_gen")
    @SequenceGenerator(
            name = "recommended_items_seq_gen",
            sequenceName = "RECOMMENDED_ITEMS_SEQ",
            allocationSize = 1
    )
    @Column(name = "RECOMMEND_ID")
    private Long recommendId;

    @Column(name = "USER_ID", nullable = false)
    private Long userId;

    @Column(name = "ITEM_ID", nullable = false)
    private Long itemId;

    @Column(name = "SCORE")
    private Integer score;

    @Column(name = "RECOMMEND_TYPE", length = 50)
    private String recommendType;

    @Column(name = "CREATED_AT")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}