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
                            WHEN LOWER(NVL(i.MODEL_NAME, '')) = LOWER(:keyword) THEN 120
                            WHEN LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 100
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 80
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            WHEN LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 55
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN LOWER(NVL(i.BRAND, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 25
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 30
                            ELSE 0
                        END
                        +
                        CASE
                            /*
                             * 4단계 게임 추천 점수:
                             * LOW / MID / HIGH / EXTREME
                             *
                             * 핵심:
                             * 무조건 최고 사양을 먼저 보여주는 게 아니라,
                             * 사용자가 요청한 게임 등급에 가까운 충분한 사양을 우선한다.
                             */

                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'LOW'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'LOW'
                            THEN 150
                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'LOW'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'MID'
                            THEN 125
                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'LOW'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'HIGH'
                            THEN 95
                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'LOW'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'EXTREME'
                            THEN 70

                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'MID'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'MID'
                            THEN 160
                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'MID'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'HIGH'
                            THEN 135
                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'MID'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'EXTREME'
                            THEN 85

                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'HIGH'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'HIGH'
                            THEN 165
                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'HIGH'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'EXTREME'
                            THEN 130

                            WHEN :useCase = 'gaming'
                             AND :performanceLevel = 'EXTREME'
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'EXTREME'
                            THEN 180

                            /*
                             * performanceLevel이 비어 있는 gaming 질문일 때만
                             * 일반 게임용 후보를 넓게 점수화한다.
                             */
                            WHEN :useCase = 'gaming'
                             AND (:performanceLevel IS NULL OR :performanceLevel = '')
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'MID'
                            THEN 130
                            WHEN :useCase = 'gaming'
                             AND (:performanceLevel IS NULL OR :performanceLevel = '')
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'HIGH'
                            THEN 125
                            WHEN :useCase = 'gaming'
                             AND (:performanceLevel IS NULL OR :performanceLevel = '')
                             AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'EXTREME'
                            THEN 100

                            ELSE 0
                        END
                        +
                        CASE
                            /*
                             * 제목 기반 보조 점수.
                             * PERFORMANCE_LEVEL이 들어간 상품이 우선이고,
                             * 제목 단서는 약하게만 보정한다.
                             */
                            WHEN :useCase = 'gaming'
                             AND (
                                  LOWER(i.TITLE) LIKE '%게이밍%'
                                  OR LOWER(i.TITLE) LIKE '%게임%'
                                  OR LOWER(i.TITLE) LIKE '%배그%'
                                  OR LOWER(i.TITLE) LIKE '%배틀그라운드%'
                                  OR LOWER(i.TITLE) LIKE '%에이펙스%'
                                  OR LOWER(i.TITLE) LIKE '%에이팩스%'
                                  OR LOWER(i.TITLE) LIKE '%사이버펑크%'
                                  OR LOWER(i.TITLE) LIKE '%그래픽카드%'
                                  OR LOWER(i.TITLE) LIKE '%그래픽%'
                                  OR LOWER(i.TITLE) LIKE '%rtx%'
                                  OR LOWER(i.TITLE) LIKE '%gtx%'
                                  OR LOWER(i.TITLE) LIKE '%rx%'
                             )
                            THEN 25
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN :useCase = 'student'
                             AND (
                                  LOWER(i.TITLE) LIKE '%아이폰 se%'
                                  OR LOWER(i.TITLE) LIKE '%아이폰 11%'
                                  OR LOWER(i.TITLE) LIKE '%아이폰 12%'
                                  OR LOWER(i.TITLE) LIKE '%아이폰 13%'
                                  OR LOWER(i.TITLE) LIKE '%미니%'
                                  OR LOWER(i.TITLE) LIKE '%64gb%'
                                  OR LOWER(i.TITLE) LIKE '%128gb%'
                             )
                            THEN 45
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
                  AND NVL(i.IS_ACCESSORY, 'N') = 'N'
                  AND NVL(i.TRADE_STATUS, 'SALE') = 'SALE'
                  AND i.CURRENT_PRICE >= 50000

                  AND (:minPrice IS NULL OR i.CURRENT_PRICE >= :minPrice)
                  AND (:maxPrice IS NULL OR i.CURRENT_PRICE <= :maxPrice)

                  AND (
                        :productType IS NULL
                        OR :productType = ''
                        OR LOWER(NVL(i.PRODUCT_TYPE, '')) = LOWER(:productType)
                        OR (
                            :productType = 'desktop'
                            AND (
                                LOWER(i.TITLE) LIKE '%컴퓨터%'
                                OR LOWER(i.TITLE) LIKE '%데스크탑%'
                                OR LOWER(i.TITLE) LIKE '%본체%'
                                OR LOWER(i.TITLE) LIKE '%pc%'
                            )
                        )
                        OR (
                            :productType = 'laptop'
                            AND (
                                LOWER(i.TITLE) LIKE '%노트북%'
                                OR LOWER(i.TITLE) LIKE '%랩탑%'
                            )
                        )
                        OR (
                            :productType = 'smartphone'
                            AND (
                                LOWER(i.TITLE) LIKE '%아이폰%'
                                OR LOWER(i.TITLE) LIKE '%갤럭시%'
                                OR LOWER(i.TITLE) LIKE '%스마트폰%'
                                OR LOWER(i.TITLE) LIKE '%휴대폰%'
                            )
                        )
                  )

                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.BRAND, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR (
                            :productType = 'desktop'
                            AND (
                                LOWER(i.TITLE) LIKE '%컴퓨터%'
                                OR LOWER(i.TITLE) LIKE '%데스크탑%'
                                OR LOWER(i.TITLE) LIKE '%본체%'
                                OR LOWER(i.TITLE) LIKE '%pc%'
                            )
                        )
                        OR (
                            :productType = 'laptop'
                            AND (
                                LOWER(i.TITLE) LIKE '%노트북%'
                                OR LOWER(i.TITLE) LIKE '%랩탑%'
                            )
                        )
                        OR (
                            :productType = 'smartphone'
                            AND (
                                LOWER(i.TITLE) LIKE '%아이폰%'
                                OR LOWER(i.TITLE) LIKE '%갤럭시%'
                                OR LOWER(i.TITLE) LIKE '%스마트폰%'
                                OR LOWER(i.TITLE) LIKE '%휴대폰%'
                            )
                        )
                  )

                  AND (
                        :performanceLevel IS NULL
                        OR :performanceLevel = ''
                        OR (
                            :performanceLevel = 'LOW'
                            AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') IN ('LOW', 'MID', 'HIGH', 'EXTREME')
                        )
                        OR (
                            :performanceLevel = 'MID'
                            AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') IN ('MID', 'HIGH', 'EXTREME')
                        )
                        OR (
                            :performanceLevel = 'HIGH'
                            AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') IN ('HIGH', 'EXTREME')
                        )
                        OR (
                            :performanceLevel = 'EXTREME'
                            AND NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') = 'EXTREME'
                        )
                  )

                  AND (
                        :useCase IS NULL
                        OR :useCase = ''
                        OR :useCase <> 'gaming'
                        OR (
                            NVL(i.PERFORMANCE_LEVEL, 'UNKNOWN') IN ('MID', 'HIGH', 'EXTREME')
                            OR LOWER(i.TITLE) LIKE '%게이밍%'
                            OR LOWER(i.TITLE) LIKE '%게임%'
                            OR LOWER(i.TITLE) LIKE '%배그%'
                            OR LOWER(i.TITLE) LIKE '%배틀그라운드%'
                            OR LOWER(i.TITLE) LIKE '%에이펙스%'
                            OR LOWER(i.TITLE) LIKE '%에이팩스%'
                            OR LOWER(i.TITLE) LIKE '%사이버펑크%'
                            OR LOWER(i.TITLE) LIKE '%rtx%'
                            OR LOWER(i.TITLE) LIKE '%gtx%'
                            OR LOWER(i.TITLE) LIKE '%그래픽%'
                            OR LOWER(i.TITLE) LIKE '%그래픽카드%'
                            OR LOWER(i.TITLE) LIKE '%1060%'
                            OR LOWER(i.TITLE) LIKE '%1650%'
                            OR LOWER(i.TITLE) LIKE '%1660%'
                            OR LOWER(i.TITLE) LIKE '%2060%'
                            OR LOWER(i.TITLE) LIKE '%3060%'
                            OR LOWER(i.TITLE) LIKE '%4060%'
                            OR LOWER(i.TITLE) LIKE '%4070%'
                            OR LOWER(i.TITLE) LIKE '%4080%'
                            OR LOWER(i.TITLE) LIKE '%4090%'
                            OR LOWER(i.TITLE) LIKE '%rx%'
                        )
                  )

                  AND (
                        :useCase IS NULL
                        OR :useCase = ''
                        OR :useCase <> 'student'
                        OR i.CURRENT_PRICE <= 500000
                  )

                  AND LOWER(i.TITLE) NOT LIKE '%쿨러%'
                  AND LOWER(i.TITLE) NOT LIKE '%케이스%'
                  AND LOWER(i.TITLE) NOT LIKE '%파워%'
                  AND LOWER(i.TITLE) NOT LIKE '%메인보드%'
                  AND LOWER(i.TITLE) NOT LIKE '%부품%'
                  AND LOWER(i.TITLE) NOT LIKE '%충전기%'
                  AND LOWER(i.TITLE) NOT LIKE '%어댑터%'
                  AND LOWER(i.TITLE) NOT LIKE '%세팅%'
                  AND LOWER(i.TITLE) NOT LIKE '%os%'
                  AND LOWER(i.TITLE) NOT LIKE '%윈도우%'
                  AND LOWER(i.TITLE) NOT LIKE '%설치%'
                  AND LOWER(i.TITLE) NOT LIKE '%수리%'
                  AND LOWER(i.TITLE) NOT LIKE '%대행%'
                  AND LOWER(i.TITLE) NOT LIKE '%책상%'
                  AND LOWER(i.TITLE) NOT LIKE '%의자%'
                  AND LOWER(i.TITLE) NOT LIKE '%사무용%'
                  AND LOWER(i.TITLE) NOT LIKE '%문서용%'
                  AND LOWER(i.TITLE) NOT LIKE '%인강용%'
                  AND LOWER(i.TITLE) NOT LIKE '%내장그래픽%'
                  AND LOWER(i.TITLE) NOT LIKE '%그래픽카드 없음%'
                  AND LOWER(i.TITLE) NOT LIKE '%i5-2500%'
                  AND LOWER(i.TITLE) NOT LIKE '%i5 2500%'
                  AND LOWER(i.TITLE) NOT LIKE '%i5-6400%'
                  AND LOWER(i.TITLE) NOT LIKE '%i5 6400%'
            )
            WHERE SCORE > 0
            ORDER BY SCORE DESC, CURRENT_PRICE ASC
        )
        WHERE ROWNUM <= :limit
        """, nativeQuery = true)
    List<RecommendedItemProjection> findItemsByCondition(
            @Param("keyword") String keyword,
            @Param("minPrice") Long minPrice,
            @Param("maxPrice") Long maxPrice,
            @Param("productType") String productType,
            @Param("useCase") String useCase,
            @Param("performanceLevel") String performanceLevel,
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
                            WHEN LOWER(NVL(i.MODEL_NAME, '')) = LOWER(:keyword) THEN 120
                            WHEN LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 100
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 80
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            WHEN LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 55
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN LOWER(NVL(i.BRAND, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 25
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
                                      OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                      OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
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
                                  AND sl.KEYWORD IS NOT NULL
                                  AND (
                                      LOWER(i.TITLE) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                      OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                      OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                  )
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
                  AND NVL(i.IS_ACCESSORY, 'N') = 'N'
                  AND NVL(i.TRADE_STATUS, 'SALE') = 'SALE'
                  AND i.CURRENT_PRICE >= 50000
                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.BRAND, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR EXISTS (
                            SELECT 1
                            FROM USER_PREFERENCES up
                            WHERE up.USER_ID = :userId
                              AND (
                                  LOWER(i.TITLE) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
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
                            WHEN LOWER(NVL(i.MODEL_NAME, '')) = LOWER(:keyword) THEN 120
                            WHEN LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 100
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 80
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            WHEN LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 55
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN LOWER(NVL(i.BRAND, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 25
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
                  AND NVL(i.IS_ACCESSORY, 'N') = 'N'
                  AND NVL(i.TRADE_STATUS, 'SALE') = 'SALE'
                  AND i.CURRENT_PRICE >= 50000
                  AND i.CURRENT_PRICE <= :maxPrice
                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.BRAND, '')) LIKE '%' || LOWER(:keyword) || '%'
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
                            WHEN EXISTS (
                                SELECT 1
                                FROM SEARCH_LOGS sl
                                WHERE sl.USER_ID = :userId
                                  AND sl.CREATED_AT >= SYSTIMESTAMP - INTERVAL '30' DAY
                                  AND sl.KEYWORD IS NOT NULL
                                  AND (
                                      LOWER(i.TITLE) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                      OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                      OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                  )
                            ) THEN 50
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM SEARCH_LOGS sl
                                JOIN ITEMS clicked
                                  ON clicked.ITEM_ID = sl.CLICKED_ITEM_ID
                                WHERE sl.USER_ID = :userId
                                  AND sl.CREATED_AT >= SYSTIMESTAMP - INTERVAL '30' DAY
                                  AND sl.CLICKED_ITEM_ID IS NOT NULL
                                  AND (
                                      LOWER(NVL(i.CATEGORY_NAME, '')) = LOWER(NVL(clicked.CATEGORY_NAME, ''))
                                      OR LOWER(NVL(i.PRODUCT_TYPE, '')) = LOWER(NVL(clicked.PRODUCT_TYPE, ''))
                                      OR LOWER(NVL(i.MODEL_NAME, '')) = LOWER(NVL(clicked.MODEL_NAME, ''))
                                      OR LOWER(i.TITLE) LIKE '%' || LOWER(NVL(clicked.MODEL_NAME, '')) || '%'
                                      OR LOWER(i.TITLE) LIKE '%' || LOWER(NVL(clicked.CATEGORY_NAME, '')) || '%'
                                  )
                            ) THEN 45
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
                                      OR LOWER(NVL(i.NORMALIZED_TITLE, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                      OR LOWER(NVL(i.MODEL_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                      OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  )
                            ) THEN 35
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
                  AND NVL(i.IS_ACCESSORY, 'N') = 'N'
                  AND NVL(i.TRADE_STATUS, 'SALE') = 'SALE'
                  AND i.CURRENT_PRICE >= 50000
            )
            WHERE SCORE > 0
            ORDER BY SCORE DESC, CURRENT_PRICE ASC
        )
        WHERE ROWNUM <= :limit
        """, nativeQuery = true)
    List<RecommendedItemProjection> findPersonalRecommendedItems(
            @Param("userId") Long userId,
            @Param("limit") int limit
    );

    long countByIsDeleted(String isDeleted);
}