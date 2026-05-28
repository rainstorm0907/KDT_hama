package com.example.ffff.service;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.repository.ItemRepository;
import com.example.ffff.dto.*;
import com.example.ffff.entity.*;
import com.example.ffff.repository.*;
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
    private final ItemViewRepository itemViewRepository;
    private final NotificationRepository notificationRepository;
    private final KeywordAlertRepository keywordAlertRepository;
    private final NotificationSettingRepository notificationSettingRepository;
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
        return toProfileResponseDto(user);
    }

    @Transactional
    public ProfileResponseDto updateProfile(Authentication authentication, ProfileUpdateRequestDto request) {
        User user = getLoginUser(authentication);

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim();

            if (!user.getEmail().equals(newEmail)
                    && userRepository.existsByEmailAndUserIdNot(newEmail, user.getUserId())) {
                throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
            }

            user.updateEmail(newEmail);
        }

        if (request.getNickname() != null && !request.getNickname().isBlank()) {
            String newNickname = request.getNickname().trim();

            if (!user.getNickname().equals(newNickname)
                    && userRepository.existsByNicknameAndUserIdNot(newNickname, user.getUserId())) {
                throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
            }
        }

        user.updateProfile(
                request.getName(),
                request.getNickname(),
                request.getPhoneNumber()
        );

        return toProfileResponseDto(user);
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
    public MessageResponseDto withdraw(Authentication authentication) {
        User user = getLoginUser(authentication);
        user.withdraw();

        return new MessageResponseDto("회원 탈퇴가 완료되었습니다.");
    }

    @Transactional(readOnly = true)
    public AdminStatusResponseDto checkAdmin(Authentication authentication) {
        User user = getLoginUser(authentication);
        return new AdminStatusResponseDto(user.isAdmin());
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

    @Transactional
    public MessageResponseDto saveRecentItem(Authentication authentication, Long itemId) {
        User user = getLoginUser(authentication);
        Item item = getItem(itemId);

        ItemView itemView = itemViewRepository.findByUserAndItem(user, item)
                .orElseGet(() -> itemViewRepository.save(new ItemView(user, item)));

        itemView.refreshViewedAt();

        return new MessageResponseDto("최근 본 상품에 저장되었습니다.");
    }

    @Transactional(readOnly = true)
    public List<ProductResponseDto> getRecentItems(Authentication authentication) {
        User user = getLoginUser(authentication);

        return itemViewRepository.findTop20ByUserOrderByViewedAtDesc(user)
                .stream()
                .map(itemView -> productService.getProductDetail(itemView.getItem().getItemId()))
                .toList();
    }

    @Transactional
    public MessageResponseDto clearRecentItems(Authentication authentication) {
        User user = getLoginUser(authentication);
        itemViewRepository.deleteByUser(user);

        return new MessageResponseDto("최근 본 상품 기록을 삭제했습니다.");
    }

    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getNotifications(Authentication authentication) {
        User user = getLoginUser(authentication);

        return notificationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toNotificationResponseDto)
                .toList();
    }

    @Transactional
    public MessageResponseDto readNotification(Authentication authentication, Long notificationId) {
        User user = getLoginUser(authentication);

        Notification notification = notificationRepository.findByNotificationIdAndUser(notificationId, user)
                .orElseThrow(() -> new IllegalArgumentException("알림을 찾을 수 없습니다."));

        notification.markAsRead();

        return new MessageResponseDto("알림을 읽음 처리했습니다.");
    }

    @Transactional(readOnly = true)
    public NotificationSettingResponseDto getNotificationSetting(Authentication authentication) {
        User user = getLoginUser(authentication);

        NotificationSetting setting = notificationSettingRepository.findByUser(user)
                .orElseGet(() -> new NotificationSetting(user));

        return toNotificationSettingResponseDto(setting);
    }

    @Transactional
    public NotificationSettingResponseDto updateNotificationSetting(
            Authentication authentication,
            NotificationSettingRequestDto request
    ) {
        User user = getLoginUser(authentication);

        NotificationSetting setting = notificationSettingRepository.findByUser(user)
                .orElseGet(() -> notificationSettingRepository.save(new NotificationSetting(user)));

        setting.update(
                request.getLowestPriceEnabled(),
                request.getSoldStatusEnabled(),
                request.getNewItemEnabled()
        );

        return toNotificationSettingResponseDto(setting);
    }

    @Transactional(readOnly = true)
    public List<KeywordAlertResponseDto> getKeywordAlerts(Authentication authentication) {
        User user = getLoginUser(authentication);

        return keywordAlertRepository.findByUserAndIsActiveOrderByCreatedAtDesc(user, "Y")
                .stream()
                .map(this::toKeywordAlertResponseDto)
                .toList();
    }

    @Transactional
    public KeywordAlertResponseDto addKeywordAlert(Authentication authentication, KeywordAlertRequestDto request) {
        User user = getLoginUser(authentication);

        if (request.getKeyword() == null || request.getKeyword().isBlank()) {
            throw new IllegalArgumentException("키워드를 입력해 주세요.");
        }

        String keyword = request.getKeyword().trim();

        KeywordAlert keywordAlert = keywordAlertRepository.findByUserAndKeyword(user, keyword)
                .orElseGet(() -> keywordAlertRepository.save(new KeywordAlert(user, keyword)));

        return toKeywordAlertResponseDto(keywordAlert);
    }

    @Transactional
    public MessageResponseDto removeKeywordAlert(Authentication authentication, Long keywordAlertId) {
        User user = getLoginUser(authentication);

        KeywordAlert keywordAlert = keywordAlertRepository.findByKeywordAlertIdAndUser(keywordAlertId, user)
                .orElseThrow(() -> new IllegalArgumentException("키워드 알림을 찾을 수 없습니다."));

        keywordAlert.deactivate();

        return new MessageResponseDto("키워드 알림을 삭제했습니다.");
    }

    private ProfileResponseDto toProfileResponseDto(User user) {
        return ProfileResponseDto.builder()
                .userId(user.getUserId())
                .loginId(user.getLoginId())
                .email(user.getEmail())
                .name(user.getName())
                .nickname(user.getNickname())
                .phoneNumber(user.getPhoneNumber())
                .birthDate(user.getBirthDate())
                .accountStatus(user.getAccountStatus())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();
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

    private NotificationResponseDto toNotificationResponseDto(Notification notification) {
        ProductResponseDto product = null;

        if (notification.getItem() != null) {
            product = productService.getProductDetail(notification.getItem().getItemId());
        }

        return NotificationResponseDto.builder()
                .notificationId(notification.getNotificationId())
                .itemId(notification.getItem() == null ? null : notification.getItem().getItemId())
                .notificationType(notification.getNotificationType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .payload(notification.getPayload())
                .read(notification.isRead())
                .sendStatus(notification.getSendStatus())
                .createdAt(notification.getCreatedAt())
                .sentAt(notification.getSentAt())
                .readAt(notification.getReadAt())
                .product(product)
                .build();
    }

    private NotificationSettingResponseDto toNotificationSettingResponseDto(NotificationSetting setting) {
        return NotificationSettingResponseDto.builder()
                .lowestPriceEnabled(setting.isLowestPriceEnabled())
                .soldStatusEnabled(setting.isSoldStatusEnabled())
                .newItemEnabled(setting.isNewItemEnabled())
                .updatedAt(setting.getUpdatedAt())
                .build();
    }

    private KeywordAlertResponseDto toKeywordAlertResponseDto(KeywordAlert keywordAlert) {
        return KeywordAlertResponseDto.builder()
                .keywordAlertId(keywordAlert.getKeywordAlertId())
                .keyword(keywordAlert.getKeyword())
                .active(keywordAlert.isActive())
                .createdAt(keywordAlert.getCreatedAt())
                .build();
    }
}