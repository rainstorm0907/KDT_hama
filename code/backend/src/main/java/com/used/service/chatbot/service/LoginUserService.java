package com.used.service.chatbot.service;

import com.used.service.entity.User;
import com.used.service.repository.UserRepository;
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
            throw new AccessDeniedException("濡쒓렇?몄씠 ?꾩슂?⑸땲??");
        }

        String email = authentication.getName();

        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            throw new AccessDeniedException("濡쒓렇?몄씠 ?꾩슂?⑸땲??");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AccessDeniedException("濡쒓렇???ъ슜?먮? 李얠쓣 ???놁뒿?덈떎."));

        return user.getUserId();
    }
}
