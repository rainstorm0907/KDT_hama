package com.used.service.repository;

import com.used.service.entity.KeywordAlert;
import com.used.service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface KeywordAlertRepository extends JpaRepository<KeywordAlert, Long> {

    List<KeywordAlert> findByUserAndIsActiveOrderByCreatedAtDesc(User user, String isActive);

    Optional<KeywordAlert> findByUserAndKeyword(User user, String keyword);

    Optional<KeywordAlert> findByKeywordAlertIdAndUser(Long keywordAlertId, User user);
}