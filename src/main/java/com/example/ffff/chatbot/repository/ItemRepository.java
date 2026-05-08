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
                            WHEN :useCase = 'office'
                             AND :productType = 'laptop'
                             AND (
                                  LOWER(i.TITLE) LIKE '%사무용%'
                                  OR LOWER(i.TITLE) LIKE '%업무용%'
                                  OR LOWER(i.TITLE) LIKE '%문서%'
                                  OR LOWER(i.TITLE) LIKE '%인강%'
                                  OR LOWER(i.TITLE) LIKE '%가벼운%'
                                  OR LOWER(i.TITLE) LIKE '%그램%'
                                  OR LOWER(i.TITLE) LIKE '%갤럭시북%'
                                  OR LOWER(i.TITLE) LIKE '%씽크패드%'
                                  OR LOWER(i.TITLE) LIKE '%thinkpad%'
                                  OR LOWER(i.TITLE) LIKE '%i3%'
                                  OR LOWER(i.TITLE) LIKE '%i5%'
                                  OR LOWER(i.TITLE) LIKE '%라이젠3%'
                                  OR LOWER(i.TITLE) LIKE '%라이젠5%'
                                  OR LOWER(i.TITLE) LIKE '%ryzen 3%'
                                  OR LOWER(i.TITLE) LIKE '%ryzen 5%'
                                  OR LOWER(i.TITLE) LIKE '%8gb%'
                                  OR LOWER(i.TITLE) LIKE '%16gb%'
                                  OR LOWER(i.TITLE) LIKE '%ssd%'
                             )
                            THEN 70
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN :productType = 'game_console'
                             AND (
                                  LOWER(i.TITLE) LIKE '%본체%'
                                  OR LOWER(i.TITLE) LIKE '%기기%'
                                  OR LOWER(i.TITLE) LIKE '%콘솔%'
                                  OR LOWER(i.TITLE) LIKE '%풀박스%'
                                  OR LOWER(i.TITLE) LIKE '%박스%'
                                  OR LOWER(i.TITLE) LIKE '%디스크%'
                                  OR LOWER(i.TITLE) LIKE '%디지털%'
                                  OR LOWER(i.TITLE) LIKE '%슬림%'
                                  OR LOWER(i.TITLE) LIKE '%oled%'
                             )
                            THEN 80

                            WHEN :productType = 'game_console'
                             AND (
                                  LOWER(i.TITLE) LIKE '%닌텐도 스위치%'
                                  OR LOWER(i.TITLE) LIKE '%닌텐도스위치%'
                                  OR LOWER(i.TITLE) LIKE '%스위치 oled%'
                                  OR LOWER(i.TITLE) LIKE '%스위치oled%'
                                  OR LOWER(i.TITLE) LIKE '%nintendo switch%'
                                  OR LOWER(i.TITLE) LIKE '%switch oled%'
                                  OR LOWER(i.TITLE) LIKE '%플스5%'
                                  OR LOWER(i.TITLE) LIKE '%플레이스테이션5%'
                                  OR LOWER(i.TITLE) LIKE '%ps5%'
                                  OR LOWER(i.TITLE) LIKE '%플스4%'
                                  OR LOWER(i.TITLE) LIKE '%플레이스테이션4%'
                                  OR LOWER(i.TITLE) LIKE '%ps4%'
                                  OR LOWER(i.TITLE) LIKE '%스팀덱%'
                                  OR LOWER(i.TITLE) LIKE '%steamdeck%'
                             )
                            THEN 60

                            ELSE 0
                        END
                        +
                        CASE
                            WHEN :productType = 'smartphone'
                             AND (
                                  LOWER(i.TITLE) LIKE '%128gb%'
                                  OR LOWER(i.TITLE) LIKE '%256gb%'
                                  OR LOWER(i.TITLE) LIKE '%512gb%'
                                  OR LOWER(i.TITLE) LIKE '%자급제%'
                                  OR LOWER(i.TITLE) LIKE '%정상해지%'
                                  OR LOWER(i.TITLE) LIKE '%공기계%'
                                  OR LOWER(i.TITLE) LIKE '%풀박스%'
                                  OR LOWER(i.TITLE) LIKE '%박스%'
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
                  AND NVL(i.TRADE_STATUS, 'SALE') = 'SALE'

                  AND (
                        NVL(i.IS_ACCESSORY, 'N') = 'N'
                        OR LOWER(:keyword) LIKE '%케이스%'
                        OR LOWER(:keyword) LIKE '%필름%'
                        OR LOWER(:keyword) LIKE '%충전기%'
                        OR LOWER(:keyword) LIKE '%어댑터%'
                        OR LOWER(:keyword) LIKE '%파우치%'
                        OR LOWER(:keyword) LIKE '%커버%'
                        OR LOWER(:keyword) LIKE '%보호필름%'
                        OR LOWER(:keyword) LIKE '%맥세이프%'
                        OR LOWER(:keyword) LIKE '%카드지갑%'
                        OR LOWER(:keyword) LIKE '%스트랩%'
                  )

                  AND (
                        (
                            (
                                LOWER(:keyword) LIKE '%케이스%'
                                OR LOWER(:keyword) LIKE '%필름%'
                                OR LOWER(:keyword) LIKE '%충전기%'
                                OR LOWER(:keyword) LIKE '%어댑터%'
                                OR LOWER(:keyword) LIKE '%파우치%'
                                OR LOWER(:keyword) LIKE '%커버%'
                                OR LOWER(:keyword) LIKE '%보호필름%'
                                OR LOWER(:keyword) LIKE '%맥세이프%'
                                OR LOWER(:keyword) LIKE '%카드지갑%'
                                OR LOWER(:keyword) LIKE '%스트랩%'
                            )
                            AND i.CURRENT_PRICE >= 1000
                        )
                        OR (
                            (
                                LOWER(:keyword) NOT LIKE '%케이스%'
                                AND LOWER(:keyword) NOT LIKE '%필름%'
                                AND LOWER(:keyword) NOT LIKE '%충전기%'
                                AND LOWER(:keyword) NOT LIKE '%어댑터%'
                                AND LOWER(:keyword) NOT LIKE '%파우치%'
                                AND LOWER(:keyword) NOT LIKE '%커버%'
                                AND LOWER(:keyword) NOT LIKE '%보호필름%'
                                AND LOWER(:keyword) NOT LIKE '%맥세이프%'
                                AND LOWER(:keyword) NOT LIKE '%카드지갑%'
                                AND LOWER(:keyword) NOT LIKE '%스트랩%'
                            )
                            AND (
                                (:productType = 'smartphone' AND i.CURRENT_PRICE >= 100000)
                                OR (:productType = 'desktop' AND i.CURRENT_PRICE >= 150000)
                                OR (:productType = 'laptop' AND i.CURRENT_PRICE >= 100000)
                                OR (:productType = 'game_console' AND i.CURRENT_PRICE >= 120000)
                                OR ((:productType IS NULL OR :productType = '') AND i.CURRENT_PRICE >= 50000)
                                OR (:productType NOT IN ('smartphone', 'desktop', 'laptop', 'game_console') AND i.CURRENT_PRICE >= 50000)
                            )
                        )
                  )

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
                        OR (
                            :productType = 'game_console'
                            AND (
                                LOWER(i.TITLE) LIKE '%닌텐도 스위치%'
                                OR LOWER(i.TITLE) LIKE '%닌텐도스위치%'
                                OR LOWER(i.TITLE) LIKE '%스위치 oled%'
                                OR LOWER(i.TITLE) LIKE '%스위치oled%'
                                OR LOWER(i.TITLE) LIKE '%nintendo switch%'
                                OR LOWER(i.TITLE) LIKE '%switch oled%'
                                OR LOWER(i.TITLE) LIKE '%플스5%'
                                OR LOWER(i.TITLE) LIKE '%플레이스테이션5%'
                                OR LOWER(i.TITLE) LIKE '%ps5%'
                                OR LOWER(i.TITLE) LIKE '%플스4%'
                                OR LOWER(i.TITLE) LIKE '%플레이스테이션4%'
                                OR LOWER(i.TITLE) LIKE '%ps4%'
                                OR LOWER(i.TITLE) LIKE '%xbox%'
                                OR LOWER(i.TITLE) LIKE '%엑스박스%'
                                OR LOWER(i.TITLE) LIKE '%스팀덱%'
                                OR LOWER(i.TITLE) LIKE '%steamdeck%'
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
                        OR (
                            :productType = 'game_console'
                            AND (
                                LOWER(i.TITLE) LIKE '%닌텐도 스위치%'
                                OR LOWER(i.TITLE) LIKE '%닌텐도스위치%'
                                OR LOWER(i.TITLE) LIKE '%스위치 oled%'
                                OR LOWER(i.TITLE) LIKE '%스위치oled%'
                                OR LOWER(i.TITLE) LIKE '%nintendo switch%'
                                OR LOWER(i.TITLE) LIKE '%switch oled%'
                                OR LOWER(i.TITLE) LIKE '%플스5%'
                                OR LOWER(i.TITLE) LIKE '%플레이스테이션5%'
                                OR LOWER(i.TITLE) LIKE '%ps5%'
                                OR LOWER(i.TITLE) LIKE '%플스4%'
                                OR LOWER(i.TITLE) LIKE '%플레이스테이션4%'
                                OR LOWER(i.TITLE) LIKE '%ps4%'
                                OR LOWER(i.TITLE) LIKE '%xbox%'
                                OR LOWER(i.TITLE) LIKE '%엑스박스%'
                                OR LOWER(i.TITLE) LIKE '%스팀덱%'
                                OR LOWER(i.TITLE) LIKE '%steamdeck%'
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

                  AND (
                        :useCase IS NULL
                        OR :useCase = ''
                        OR :useCase <> 'office'
                        OR (
                            :productType <> 'laptop'
                            OR i.CURRENT_PRICE <= 1200000
                        )
                  )

                  AND (
                        :productType IS NULL
                        OR :productType <> 'smartphone'
                        OR LOWER(:keyword) LIKE '%케이스%'
                        OR LOWER(:keyword) LIKE '%필름%'
                        OR LOWER(:keyword) LIKE '%충전기%'
                        OR LOWER(:keyword) LIKE '%어댑터%'
                        OR LOWER(:keyword) LIKE '%파우치%'
                        OR LOWER(:keyword) LIKE '%커버%'
                        OR (
                            LOWER(i.TITLE) NOT LIKE '%케이스%'
                            AND LOWER(i.TITLE) NOT LIKE '%필름%'
                            AND LOWER(i.TITLE) NOT LIKE '%보호필름%'
                            AND LOWER(i.TITLE) NOT LIKE '%액정%'
                            AND LOWER(i.TITLE) NOT LIKE '%배터리%'
                            AND LOWER(i.TITLE) NOT LIKE '%부품%'
                            AND LOWER(i.TITLE) NOT LIKE '%박스만%'
                            AND LOWER(i.TITLE) NOT LIKE '%충전기%'
                            AND LOWER(i.TITLE) NOT LIKE '%맥세이프%'
                            AND LOWER(i.TITLE) NOT LIKE '%카드지갑%'
                            AND LOWER(i.TITLE) NOT LIKE '%스트랩%'
                        )
                  )

                  AND (
                        :productType IS NULL
                        OR :productType <> 'laptop'
                        OR (
                            LOWER(i.TITLE) NOT LIKE '%가방%'
                            AND LOWER(i.TITLE) NOT LIKE '%백팩%'
                            AND LOWER(i.TITLE) NOT LIKE '%크로스백%'
                            AND LOWER(i.TITLE) NOT LIKE '%클러치%'
                            AND LOWER(i.TITLE) NOT LIKE '%파우치%'
                            AND LOWER(i.TITLE) NOT LIKE '%슬리브%'
                            AND LOWER(i.TITLE) NOT LIKE '%케이스%'
                            AND LOWER(i.TITLE) NOT LIKE '%충전기%'
                            AND LOWER(i.TITLE) NOT LIKE '%어댑터%'
                            AND LOWER(i.TITLE) NOT LIKE '%거치대%'
                            AND LOWER(i.TITLE) NOT LIKE '%받침대%'
                            AND LOWER(i.TITLE) NOT LIKE '%스탠드%'
                            AND LOWER(i.TITLE) NOT LIKE '%키스킨%'
                            AND LOWER(i.TITLE) NOT LIKE '%보호필름%'
                            AND LOWER(i.TITLE) NOT LIKE '%액정필름%'
                            AND LOWER(i.TITLE) NOT LIKE '%부품%'
                            AND LOWER(i.TITLE) NOT LIKE '%수리%'
                            AND LOWER(i.TITLE) NOT LIKE '%액정%'
                        )
                  )

                  AND (
                        :productType IS NULL
                        OR :productType <> 'game_console'
                        OR LOWER(:keyword) LIKE '%케이스%'
                        OR LOWER(:keyword) LIKE '%충전기%'
                        OR LOWER(:keyword) LIKE '%파우치%'
                        OR LOWER(:keyword) LIKE '%커버%'
                        OR (
                            LOWER(i.TITLE) NOT LIKE '%게임칩%'
                            AND LOWER(i.TITLE) NOT LIKE '%칩%'
                            AND LOWER(i.TITLE) NOT LIKE '%타이틀%'
                            AND LOWER(i.TITLE) NOT LIKE '%소프트%'
                            AND LOWER(i.TITLE) NOT LIKE '%소프트웨어%'
                            AND LOWER(i.TITLE) NOT LIKE '%게임팩%'
                            AND LOWER(i.TITLE) NOT LIKE '%팩%'
                            AND LOWER(i.TITLE) NOT LIKE '%듀얼센스%'
                            AND LOWER(i.TITLE) NOT LIKE '%듀얼쇼크%'
                            AND LOWER(i.TITLE) NOT LIKE '%컨트롤러%'
                            AND LOWER(i.TITLE) NOT LIKE '%조이콘%'
                            AND LOWER(i.TITLE) NOT LIKE '%프로콘%'
                            AND LOWER(i.TITLE) NOT LIKE '%케이스%'
                            AND LOWER(i.TITLE) NOT LIKE '%파우치%'
                            AND LOWER(i.TITLE) NOT LIKE '%충전기%'
                            AND LOWER(i.TITLE) NOT LIKE '%거치대%'
                            AND LOWER(i.TITLE) NOT LIKE '%스킨%'
                            AND LOWER(i.TITLE) NOT LIKE '%커버%'
                            AND LOWER(i.TITLE) NOT LIKE '%cd%'
                            AND LOWER(i.TITLE) NOT LIKE '%dvd%'
                            AND LOWER(i.TITLE) NOT LIKE '%드래곤 퀘스트%'
                            AND LOWER(i.TITLE) NOT LIKE '%드래곤퀘스트%'
                            AND LOWER(i.TITLE) NOT LIKE '%레이맨%'
                            AND LOWER(i.TITLE) NOT LIKE '%마리오카트%'
                            AND LOWER(i.TITLE) NOT LIKE '%젤다%'
                            AND LOWER(i.TITLE) NOT LIKE '%동물의숲%'
                            AND LOWER(i.TITLE) NOT LIKE '%포켓몬%'
                        )
                  )

                  AND LOWER(i.TITLE) NOT LIKE '%쿨러%'
                  AND LOWER(i.TITLE) NOT LIKE '%파워%'
                  AND LOWER(i.TITLE) NOT LIKE '%메인보드%'
                  AND LOWER(i.TITLE) NOT LIKE '%부품%'
                  AND LOWER(i.TITLE) NOT LIKE '%어댑터%'
                  AND LOWER(i.TITLE) NOT LIKE '%세팅%'
                  AND LOWER(i.TITLE) NOT LIKE '%os%'
                  AND LOWER(i.TITLE) NOT LIKE '%윈도우%'
                  AND LOWER(i.TITLE) NOT LIKE '%설치%'
                  AND LOWER(i.TITLE) NOT LIKE '%수리%'
                  AND LOWER(i.TITLE) NOT LIKE '%대행%'
                  AND LOWER(i.TITLE) NOT LIKE '%책상%'
                  AND LOWER(i.TITLE) NOT LIKE '%의자%'
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
                  AND NVL(i.TRADE_STATUS, 'SALE') = 'SALE'
                  AND (
                        NVL(i.IS_ACCESSORY, 'N') = 'N'
                        OR LOWER(:keyword) LIKE '%케이스%'
                        OR LOWER(:keyword) LIKE '%필름%'
                        OR LOWER(:keyword) LIKE '%충전기%'
                        OR LOWER(:keyword) LIKE '%어댑터%'
                        OR LOWER(:keyword) LIKE '%파우치%'
                        OR LOWER(:keyword) LIKE '%커버%'
                  )
                  AND (
                        i.CURRENT_PRICE >= 50000
                        OR LOWER(:keyword) LIKE '%케이스%'
                        OR LOWER(:keyword) LIKE '%필름%'
                        OR LOWER(:keyword) LIKE '%충전기%'
                        OR LOWER(:keyword) LIKE '%어댑터%'
                        OR LOWER(:keyword) LIKE '%파우치%'
                        OR LOWER(:keyword) LIKE '%커버%'
                  )
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