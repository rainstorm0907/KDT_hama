package com.used.service.chatbot.repository;

import com.used.service.chatbot.entity.Item;
import com.used.service.chatbot.repository.projection.PriceStatsProjection;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findTop20BySaleStatusOrderByItemIdDesc(String saleStatus);

    List<Item> findByCategoryNameAndSaleStatusOrderByItemIdDesc(String categoryName, String saleStatus);

    List<Item> findByTitleContainingAndSaleStatusOrderByItemIdDesc(String keyword, String saleStatus);

    Optional<Item> findByPlatform_PlatformNameAndOriginalId(String platformName, String originalId);

    long countBySaleStatus(String saleStatus);

    @Query("""
            SELECT i
            FROM Item i
            WHERE i.saleStatus = :saleStatus
              AND i.currentPrice IS NOT NULL
              AND i.currentPrice > 0
            ORDER BY i.itemId DESC
            """)
    List<Item> findAvailableItems(@Param("saleStatus") String saleStatus, Pageable pageable);

    @Query("""
            SELECT i
            FROM Item i
            WHERE i.saleStatus = :saleStatus
              AND i.currentPrice IS NOT NULL
              AND i.currentPrice > 0
              AND (:minPrice IS NULL OR i.currentPrice >= :minPrice)
              AND (:maxPrice IS NULL OR i.currentPrice <= :maxPrice)
              AND (
                    :keyword = ''
                    OR LOWER(i.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(i.canonicalName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(i.matchedKeywords, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                    OR LOWER(COALESCE(i.categoryName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    List<Item> findRecommendationCandidates(
            @Param("keyword") String keyword,
            @Param("minPrice") Long minPrice,
            @Param("maxPrice") Long maxPrice,
            @Param("saleStatus") String saleStatus,
            Pageable pageable
    );

    @Query(value = """
            SELECT
                target.current_price AS "currentPrice",
                AVG(CASE WHEN similar.status IN ('판매중', 'ON_SALE', 'SALE') THEN similar.current_price END) AS "averageListingPrice",
                AVG(CASE WHEN similar.status IN ('거래완료', '판매완료', 'SOLD_OUT', 'SOLD') THEN similar.current_price END) AS "averageSoldPrice",
                SUM(CASE WHEN similar.status IN ('판매중', 'ON_SALE', 'SALE') THEN 1 ELSE 0 END) AS "listingCount",
                SUM(CASE WHEN similar.status IN ('거래완료', '판매완료', 'SOLD_OUT', 'SOLD') THEN 1 ELSE 0 END) AS "soldCount"
            FROM items target
            JOIN items similar
              ON similar.current_price IS NOT NULL
             AND similar.current_price > 0
             AND similar.item_id <> target.item_id
             AND (
                    (
                        target.canonical_name IS NOT NULL
                        AND similar.canonical_name IS NOT NULL
                        AND LOWER(similar.canonical_name) = LOWER(target.canonical_name)
                    )
                    OR
                    (
                        target.category_name IS NOT NULL
                        AND similar.category_name IS NOT NULL
                        AND LOWER(similar.category_name) = LOWER(target.category_name)
                    )
                 )
            WHERE target.item_id = :itemId
            GROUP BY target.current_price
            """, nativeQuery = true)
    PriceStatsProjection findPriceStatsByItemId(@Param("itemId") Long itemId);
}
