package com.used.service.repository;

import com.used.service.chatbot.entity.Item;
import com.used.service.entity.User;
import com.used.service.entity.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    List<Wishlist> findByUserOrderByAddedAtDesc(User user);

    @Query("select w.user.userId, count(w) from Wishlist w group by w.user.userId")
    List<Object[]> countGroupedByUser();

    Optional<Wishlist> findByUserAndItem(User user, Item item);

    boolean existsByUserAndItem(User user, Item item);

    void deleteByUserAndItem(User user, Item item);
}