package com.example.ffff.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotificationSettingRequestDto {

    private Boolean lowestPriceEnabled;

    private Boolean soldStatusEnabled;

    private Boolean newItemEnabled;
}