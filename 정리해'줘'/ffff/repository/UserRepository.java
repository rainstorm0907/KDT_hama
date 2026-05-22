package com.example.ffff.repository;

import com.example.ffff.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email); // 로그인 시 이메일로 사용자 확인
    boolean existsByEmail(String email);     // 회원가입 시 중복 체크
}