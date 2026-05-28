package com.example.ffff.repository;

import com.example.ffff.entity.Notification;
import com.example.ffff.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    Optional<Notification> findByNotificationIdAndUser(Long notificationId, User user);
}