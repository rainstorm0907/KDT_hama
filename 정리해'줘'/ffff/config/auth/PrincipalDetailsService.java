package com.example.ffff.config.auth;

import com.example.ffff.entity.User;
import com.example.ffff.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PrincipalDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // 1. DB에서 사용자 조회
        User userEntity = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("해당 이메일을 찾을 수 없습니다: " + email));

        // 2. 우리가 만든 PrincipalDetails에 담아서 반환
        // 이렇게 하면 세션에서 유저의 모든 정보(닉네임 등)를 꺼내 쓰기 편해집니다.
        return new PrincipalDetails(userEntity);
    }
}