package com.example.ffff.repository;

import com.example.ffff.entity.NotificationSetting;
import com.example.ffff.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {

    Optional<NotificationSetting> findByUser(User user);
}