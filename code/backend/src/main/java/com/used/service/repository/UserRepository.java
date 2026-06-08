package com.used.service.repository;

import com.used.service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByLoginId(String loginId);

    boolean existsByNickname(String nickname);

    boolean existsByNameAndBirthDate(String name, LocalDate birthDate);

    boolean existsByEmailAndUserIdNot(String email, Long userId);

    boolean existsByNicknameAndUserIdNot(String nickname, Long userId);
}