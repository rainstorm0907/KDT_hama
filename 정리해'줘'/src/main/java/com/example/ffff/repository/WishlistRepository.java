package com.example.ffff.repository;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.entity.User;
import com.example.ffff.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    List<Wishlist> findByUserOrderByAddedAtDesc(User user);

    Optional<Wishlist> findByUserAndItem(User user, Item item);

    boolean existsByUserAndItem(User user, Item item);

    void deleteByUserAndItem(User user, Item item);
}