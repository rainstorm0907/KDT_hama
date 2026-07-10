package com.used.service.controller;

import com.used.service.dto.*;
import com.used.service.service.MyPageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/mypage")
@RequiredArgsConstructor
public class MyPageController {

    private final MyPageService myPageService;

    @GetMapping("/profile")
    public ProfileResponseDto getProfile(Authentication authentication) {
        return myPageService.getProfile(authentication);
    }

    @PatchMapping("/profile")
    public ProfileResponseDto updateProfile(
            Authentication authentication,
            @RequestBody ProfileUpdateRequestDto request
    ) {
        return myPageService.updateProfile(authentication, request);
    }

    @PatchMapping("/password")
    public MessageResponseDto changePassword(
            Authentication authentication,
            @RequestBody PasswordChangeRequestDto request
    ) {
        return myPageService.changePassword(authentication, request);
    }

    @DeleteMapping("/me")
    public MessageResponseDto withdraw(Authentication authentication) {
        return myPageService.withdraw(authentication);
    }

    @GetMapping("/admin/check")
    public AdminStatusResponseDto checkAdmin(Authentication authentication) {
        return myPageService.checkAdmin(authentication);
    }

    @GetMapping("/wishlists")
    public List<WishlistResponseDto> getWishlists(Authentication authentication) {
        return myPageService.getWishlists(authentication);
    }

    @PostMapping("/wishlists/{itemId}")
    public WishlistResponseDto addWishlist(
            Authentication authentication,
            @PathVariable Long itemId
    ) {
        return myPageService.addWishlist(authentication, itemId);
    }

    @DeleteMapping("/wishlists/{itemId}")
    public MessageResponseDto removeWishlist(
            Authentication authentication,
            @PathVariable Long itemId
    ) {
        return myPageService.removeWishlist(authentication, itemId);
    }

    @PatchMapping("/wishlists/alert")
    public WishlistResponseDto updateWishlistAlert(
            Authentication authentication,
            @RequestBody WishlistRequestDto request
    ) {
        return myPageService.updateWishlistAlert(authentication, request);
    }

    @GetMapping("/wishlists/alerts/reached")
    public List<WishlistResponseDto> getReachedAlerts(Authentication authentication) {
        return myPageService.getReachedAlerts(authentication);
    }

    @PostMapping("/recent-items/{itemId}")
    public MessageResponseDto saveRecentItem(
            Authentication authentication,
            @PathVariable Long itemId
    ) {
        return myPageService.saveRecentItem(authentication, itemId);
    }

    @GetMapping("/recent-items")
    public List<ProductResponseDto> getRecentItems(Authentication authentication) {
        return myPageService.getRecentItems(authentication);
    }

    @DeleteMapping("/recent-items")
    public MessageResponseDto clearRecentItems(Authentication authentication) {
        return myPageService.clearRecentItems(authentication);
    }

    @GetMapping("/notifications")
    public List<NotificationResponseDto> getNotifications(Authentication authentication) {
        return myPageService.getNotifications(authentication);
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public MessageResponseDto readNotification(
            Authentication authentication,
            @PathVariable Long notificationId
    ) {
        return myPageService.readNotification(authentication, notificationId);
    }

    @GetMapping("/notification-settings")
    public NotificationSettingResponseDto getNotificationSetting(Authentication authentication) {
        return myPageService.getNotificationSetting(authentication);
    }

    @PatchMapping("/notification-settings")
    public NotificationSettingResponseDto updateNotificationSetting(
            Authentication authentication,
            @RequestBody NotificationSettingRequestDto request
    ) {
        return myPageService.updateNotificationSetting(authentication, request);
    }

    @GetMapping("/keyword-alerts")
    public List<KeywordAlertResponseDto> getKeywordAlerts(Authentication authentication) {
        return myPageService.getKeywordAlerts(authentication);
    }

    @PostMapping("/keyword-alerts")
    public KeywordAlertResponseDto addKeywordAlert(
            Authentication authentication,
            @RequestBody KeywordAlertRequestDto request
    ) {
        return myPageService.addKeywordAlert(authentication, request);
    }

    @DeleteMapping("/keyword-alerts/{keywordAlertId}")
    public MessageResponseDto removeKeywordAlert(
            Authentication authentication,
            @PathVariable Long keywordAlertId
    ) {
        return myPageService.removeKeywordAlert(authentication, keywordAlertId);
    }
}