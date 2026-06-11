package com.used.service.service;

import com.used.service.dto.AdminUserResponseDto;
import com.used.service.entity.User;
import com.used.service.repository.UserRepository;
import com.used.service.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final WishlistRepository wishlistRepository;

    @Transactional(readOnly = true)
    public List<AdminUserResponseDto> getUsers(Authentication authentication) {
        requireAdmin(authentication);

        Map<Long, Long> wishlistCounts = new HashMap<>();
        for (Object[] row : wishlistRepository.countGroupedByUser()) {
            wishlistCounts.put((Long) row[0], (Long) row[1]);
        }

        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getUserId).reversed())
                .map(user -> new AdminUserResponseDto(
                        user.getUserId(),
                        user.getName(),
                        user.getNickname(),
                        user.getEmail(),
                        user.getCreatedAt(),
                        user.getUpdatedAt(),
                        user.getAccountStatus(),
                        user.getRole(),
                        wishlistCounts.getOrDefault(user.getUserId(), 0L)
                ))
                .toList();
    }

    private void requireAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        String email = authentication.getName();

        if (email == null || email.equals("anonymousUser")) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("사용자를 찾을 수 없습니다."));

        if (!user.isAdmin()) {
            throw new AccessDeniedException("관리자 권한이 필요합니다.");
        }
    }
}
