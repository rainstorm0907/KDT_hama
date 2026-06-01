package com.example.ffff.chatbot.service;

import com.example.ffff.entity.User;
import com.example.ffff.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoginUserService {

    private final UserRepository userRepository;

    public Long getLoginUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        String email = authentication.getName();

        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            throw new AccessDeniedException("로그인이 필요합니다.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("로그인 사용자를 찾을 수 없습니다."));

        return user.getUserId();
    }
}