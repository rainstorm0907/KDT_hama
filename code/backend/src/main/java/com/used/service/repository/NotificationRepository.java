package com.used.service.repository;

import com.used.service.entity.Notification;
import com.used.service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    Optional<Notification> findByNotificationIdAndUser(Long notificationId, User user);
}