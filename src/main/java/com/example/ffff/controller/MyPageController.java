package com.example.ffff.controller;

import com.example.ffff.dto.*;
import com.example.ffff.service.MyPageService;
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
}