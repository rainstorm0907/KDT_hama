package com.used.service.repository;

import com.used.service.chatbot.entity.Item;
import com.used.service.entity.ItemView;
import com.used.service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ItemViewRepository extends JpaRepository<ItemView, Long> {

    List<ItemView> findTop20ByUserOrderByViewedAtDesc(User user);

    Optional<ItemView> findByUserAndItem(User user, Item item);

    void deleteByUser(User user);
}