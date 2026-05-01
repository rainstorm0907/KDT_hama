package com.example.ffff.chatbot.repository;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.repository.projection.RecommendedItemProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {

    @Query(value = """
        SELECT *
        FROM (
            SELECT
                ITEM_ID AS itemId,
                TITLE AS title,
                CURRENT_PRICE AS currentPrice,
                LOWEST_PRICE AS lowestPrice,
                CATEGORY_NAME AS categoryName,
                THUMBNAIL_URL AS thumbnailUrl,
                ITEM_URL AS itemUrl,
                SCORE AS score
            FROM (
                SELECT
                    i.ITEM_ID,
                    i.TITLE,
                    i.CURRENT_PRICE,
                    i.LOWEST_PRICE,
                    i.CATEGORY_NAME,
                    i.THUMBNAIL_URL,
                    i.ITEM_URL,
                    (
                        CASE
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 80
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 30
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM USER_PREFERENCES up
                                WHERE up.USER_ID = :userId
                                  AND (
                                      LOWER(i.TITLE) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                      OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  )
                            ) THEN 35
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM SEARCH_LOGS sl
                                WHERE sl.USER_ID = :userId
                                  AND sl.CREATED_AT >= SYSTIMESTAMP - INTERVAL '30' DAY
                                  AND LOWER(i.TITLE) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                            ) THEN 20
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN i.LOWEST_PRICE IS NOT NULL
                             AND i.LOWEST_PRICE > 0
                             AND i.CURRENT_PRICE <= i.LOWEST_PRICE THEN 30
                            WHEN i.LOWEST_PRICE IS NOT NULL
                             AND i.LOWEST_PRICE > 0
                             AND i.CURRENT_PRICE <= i.LOWEST_PRICE * 1.05 THEN 20
                            WHEN i.LOWEST_PRICE IS NOT NULL
                             AND i.LOWEST_PRICE > 0
                             AND i.CURRENT_PRICE <= i.LOWEST_PRICE * 1.10 THEN 10
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN i.CRAWLED_AT >= SYSTIMESTAMP - INTERVAL '1' DAY THEN 15
                            WHEN i.CRAWLED_AT >= SYSTIMESTAMP - INTERVAL '3' DAY THEN 10
                            WHEN i.CRAWLED_AT >= SYSTIMESTAMP - INTERVAL '7' DAY THEN 5
                            ELSE 0
                        END
                    ) AS SCORE
                FROM ITEMS i
                WHERE NVL(i.IS_DELETED, 'N') = 'N'
                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR EXISTS (
                            SELECT 1
                            FROM USER_PREFERENCES up
                            WHERE up.USER_ID = :userId
                              AND (
                                  LOWER(i.TITLE) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                              )
                        )
                  )
            )
            WHERE SCORE > 0
            ORDER BY SCORE DESC, CURRENT_PRICE ASC
        )
        WHERE ROWNUM <= :limit
        """, nativeQuery = true)
    List<RecommendedItemProjection> findRecommendedItems(
            @Param("userId") Long userId,
            @Param("keyword") String keyword,
            @Param("limit") int limit
    );

    @Query(value = """
        SELECT *
        FROM (
            SELECT
                ITEM_ID AS itemId,
                TITLE AS title,
                CURRENT_PRICE AS currentPrice,
                LOWEST_PRICE AS lowestPrice,
                CATEGORY_NAME AS categoryName,
                THUMBNAIL_URL AS thumbnailUrl,
                ITEM_URL AS itemUrl,
                SCORE AS score
            FROM (
                SELECT
                    i.ITEM_ID,
                    i.TITLE,
                    i.CURRENT_PRICE,
                    i.LOWEST_PRICE,
                    i.CATEGORY_NAME,
                    i.THUMBNAIL_URL,
                    i.ITEM_URL,
                    (
                        CASE
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 80
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 30
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN i.LOWEST_PRICE IS NOT NULL
                             AND i.LOWEST_PRICE > 0
                             AND i.CURRENT_PRICE <= i.LOWEST_PRICE THEN 30
                            WHEN i.LOWEST_PRICE IS NOT NULL
                             AND i.LOWEST_PRICE > 0
                             AND i.CURRENT_PRICE <= i.LOWEST_PRICE * 1.05 THEN 20
                            WHEN i.LOWEST_PRICE IS NOT NULL
                             AND i.LOWEST_PRICE > 0
                             AND i.CURRENT_PRICE <= i.LOWEST_PRICE * 1.10 THEN 10
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN i.CRAWLED_AT >= SYSTIMESTAMP - INTERVAL '1' DAY THEN 15
                            WHEN i.CRAWLED_AT >= SYSTIMESTAMP - INTERVAL '3' DAY THEN 10
                            WHEN i.CRAWLED_AT >= SYSTIMESTAMP - INTERVAL '7' DAY THEN 5
                            ELSE 0
                        END
                    ) AS SCORE
                FROM ITEMS i
                WHERE NVL(i.IS_DELETED, 'N') = 'N'
                  AND i.CURRENT_PRICE <= :maxPrice
                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                  )
            )
            WHERE SCORE > 0
            ORDER BY CURRENT_PRICE ASC, SCORE DESC
        )
        WHERE ROWNUM <= :limit
        """, nativeQuery = true)
    List<RecommendedItemProjection> findItemsByKeywordAndMaxPrice(
            @Param("keyword") String keyword,
            @Param("maxPrice") Long maxPrice,
            @Param("limit") int limit
    );

    long countByIsDeleted(String isDeleted);
}