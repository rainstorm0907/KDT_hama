package com.used.service.chatbot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

@Entity
@Table(name = "PLATFORMS")
@Getter
public class Platform {

    @Id
    @Column(name = "PLATFORM_ID")
    private Long platformId;

    @Column(name = "PLATFORM_NAME", nullable = false, unique = true, length = 50)
    private String platformName;

    @Column(name = "IS_ACTIVE", length = 1)
    private String isActive = "Y";
}

