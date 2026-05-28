package com.example.ffff.repository;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.entity.ItemView;
import com.example.ffff.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ItemViewRepository extends JpaRepository<ItemView, Long> {

    List<ItemView> findTop20ByUserOrderByViewedAtDesc(User user);

    Optional<ItemView> findByUserAndItem(User user, Item item);

    void deleteByUser(User user);
}