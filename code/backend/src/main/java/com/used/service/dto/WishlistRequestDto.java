package com.used.service.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class WishlistRequestDto {

    private Long itemId;

    private Long targetPrice;

    private Boolean lowestAlert;
}