package com.example.ffff.service;

import com.example.ffff.dto.SignupRequestDto;
import com.example.ffff.entity.User;
import com.example.ffff.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Transactional
    public void signup(SignupRequestDto requestDto) {
        validateSignupRequest(requestDto);

        String loginId = requestDto.getFinalLoginId();
        String email = requestDto.getEmail().trim();
        String name = requestDto.getFinalName();
        String nickname = requestDto.getFinalNickname();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        if (userRepository.existsByLoginId(loginId)) {
            throw new IllegalArgumentException("이미 사용 중인 로그인 ID입니다.");
        }

        if (userRepository.existsByNickname(nickname)) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        if (requestDto.getBirthDate() != null
                && userRepository.existsByNameAndBirthDate(name, requestDto.getBirthDate())) {
            throw new IllegalArgumentException("이미 가입된 사용자 정보입니다.");
        }

        String encodedPassword = passwordEncoder.encode(requestDto.getPassword());

        User user = User.builder()
                .loginId(loginId)
                .email(email)
                .password(encodedPassword)
                .name(name)
                .birthDate(requestDto.getBirthDate())
                .phoneNumber(requestDto.getFinalPhoneNumber())
                .nickname(nickname)
                .agreeMarketing(requestDto.getAgreeMarketing())
                .build();

        userRepository.save(user);
    }

    private void validateSignupRequest(SignupRequestDto requestDto) {
        if (requestDto.getEmail() == null || requestDto.getEmail().isBlank()) {
            throw new IllegalArgumentException("이메일을 입력해 주세요.");
        }

        if (requestDto.getPassword() == null || requestDto.getPassword().isBlank()) {
            throw new IllegalArgumentException("비밀번호를 입력해 주세요.");
        }

        if (requestDto.getPasswordConfirm() != null
                && !requestDto.getPassword().equals(requestDto.getPasswordConfirm())) {
            throw new IllegalArgumentException("Password confirmation does not match.");
        }

        if (requestDto.getFinalNickname() == null || requestDto.getFinalNickname().isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }

        if (requestDto.getFinalName() == null || requestDto.getFinalName().isBlank()) {
            throw new IllegalArgumentException("이름 정보를 입력해 주세요.");
        }
    }
}
