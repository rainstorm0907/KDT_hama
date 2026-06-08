package com.used.service.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NotificationSettingRequestDto {

    private Boolean lowestPriceEnabled;

    private Boolean soldStatusEnabled;

    private Boolean newItemEnabled;
}