package com.example.ffff.service;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.dto.*;
import com.example.ffff.entity.User;
import com.example.ffff.entity.Wishlist;
import com.example.ffff.repository.UserRepository;
import com.example.ffff.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MyPageService {

    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final WishlistRepository wishlistRepository;
    private final ProductService productService;
    private final BCryptPasswordEncoder passwordEncoder;

    private User getLoginUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        String email = authentication.getName();

        if (email == null || email.equals("anonymousUser")) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("사용자를 찾을 수 없습니다."));
    }

    private Item getItem(Long itemId) {
        return itemRepository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다. itemId=" + itemId));
    }

    @Transactional(readOnly = true)
    public ProfileResponseDto getProfile(Authentication authentication) {
        User user = getLoginUser(authentication);

        return ProfileResponseDto.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .accountStatus(user.getAccountStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    public ProfileResponseDto updateProfile(Authentication authentication, ProfileUpdateRequestDto request) {
        User user = getLoginUser(authentication);

        if (request.getNickname() == null || request.getNickname().isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }

        user.updateNickname(request.getNickname().trim());

        return ProfileResponseDto.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .nickname(user.getNickname())
                .accountStatus(user.getAccountStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    public MessageResponseDto changePassword(Authentication authentication, PasswordChangeRequestDto request) {
        User user = getLoginUser(authentication);

        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new IllegalArgumentException("현재 비밀번호를 입력해 주세요.");
        }

        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("새 비밀번호를 입력해 주세요.");
        }

        if (!request.getNewPassword().equals(request.getNewPasswordConfirm())) {
            throw new IllegalArgumentException("새 비밀번호가 일치하지 않습니다.");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("현재 비밀번호가 올바르지 않습니다.");
        }

        user.changePassword(passwordEncoder.encode(request.getNewPassword()));

        return new MessageResponseDto("비밀번호가 변경되었습니다.");
    }

    @Transactional
    public WishlistResponseDto addWishlist(Authentication authentication, Long itemId) {
        User user = getLoginUser(authentication);
        Item item = getItem(itemId);

        Wishlist wishlist = wishlistRepository.findByUserAndItem(user, item)
                .orElseGet(() -> wishlistRepository.save(new Wishlist(user, item)));

        return toWishlistResponseDto(wishlist);
    }

    @Transactional
    public MessageResponseDto removeWishlist(Authentication authentication, Long itemId) {
        User user = getLoginUser(authentication);
        Item item = getItem(itemId);

        wishlistRepository.deleteByUserAndItem(user, item);

        return new MessageResponseDto("찜 목록에서 삭제되었습니다.");
    }

    @Transactional(readOnly = true)
    public List<WishlistResponseDto> getWishlists(Authentication authentication) {
        User user = getLoginUser(authentication);

        return wishlistRepository.findByUserOrderByAddedAtDesc(user)
                .stream()
                .map(this::toWishlistResponseDto)
                .toList();
    }

    @Transactional
    public WishlistResponseDto updateWishlistAlert(Authentication authentication, WishlistRequestDto request) {
        User user = getLoginUser(authentication);

        if (request.getItemId() == null) {
            throw new IllegalArgumentException("상품 ID가 필요합니다.");
        }

        Item item = getItem(request.getItemId());

        Wishlist wishlist = wishlistRepository.findByUserAndItem(user, item)
                .orElseGet(() -> wishlistRepository.save(new Wishlist(user, item)));

        wishlist.updateAlert(request.getTargetPrice(), request.getLowestAlert());

        return toWishlistResponseDto(wishlist);
    }

    @Transactional(readOnly = true)
    public List<WishlistResponseDto> getReachedAlerts(Authentication authentication) {
        User user = getLoginUser(authentication);

        return wishlistRepository.findByUserOrderByAddedAtDesc(user)
                .stream()
                .filter(wishlist ->
                        wishlist.isTargetPriceReached()
                                || wishlist.isLowestAlertEnabled()
                                && wishlist.getItem().getLowestPrice() != null
                                && wishlist.getItem().getCurrentPrice() != null
                                && wishlist.getItem().getCurrentPrice() <= wishlist.getItem().getLowestPrice()
                )
                .map(this::toWishlistResponseDto)
                .toList();
    }

    private WishlistResponseDto toWishlistResponseDto(Wishlist wishlist) {
        Item item = wishlist.getItem();
        ProductResponseDto product = productService.getProductDetail(item.getItemId());

        return WishlistResponseDto.builder()
                .wishId(wishlist.getWishId())
                .itemId(item.getItemId())
                .itemName(item.getTitle())
                .imageUrl(item.getThumbnailUrl())
                .currentPrice(item.getCurrentPrice())
                .targetPrice(wishlist.getTargetPrice())
                .lowestAlert(wishlist.isLowestAlertEnabled())
                .targetPriceReached(wishlist.isTargetPriceReached())
                .addedAt(wishlist.getAddedAt())
                .product(product)
                .build();
    }
}