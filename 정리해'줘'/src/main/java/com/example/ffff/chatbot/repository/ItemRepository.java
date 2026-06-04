package com.example.ffff.chatbot.repository;

import com.example.ffff.chatbot.entity.Item;
import com.example.ffff.chatbot.repository.projection.PriceStatsProjection;
import com.example.ffff.chatbot.repository.projection.RecommendedItemProjection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

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
                            WHEN LOWER(NVL(i.CANONICAL_NAME, '')) = LOWER(:keyword) THEN 120
                            WHEN LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 100
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 90
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 70
                            WHEN LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            WHEN LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 35
                            ELSE 0
                        END
                        +
                        CASE
                            WHEN :useCase = 'gaming'
                             AND (
                                  LOWER(i.TITLE) LIKE '%게이밍%'
                                  OR LOWER(i.TITLE) LIKE '%게임%'
                                  OR LOWER(i.TITLE) LIKE '%rtx%'
                                  OR LOWER(i.TITLE) LIKE '%gtx%'
                                  OR LOWER(i.TITLE) LIKE '%rx%'
                                  OR LOWER(i.TITLE) LIKE '%그래픽%'
                                  OR LOWER(i.TITLE) LIKE '%그래픽카드%'
                             )
                            THEN 40
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
                            THEN 90
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
                WHERE i.SALE_STATUS = 'ON_SALE'

                  AND (:minPrice IS NULL OR i.CURRENT_PRICE >= :minPrice)
                  AND (:maxPrice IS NULL OR i.CURRENT_PRICE <= :maxPrice)

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

                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR (
                            :productType = 'desktop'
                            AND (
                                LOWER(i.TITLE) LIKE '%컴퓨터%'
                                OR LOWER(i.TITLE) LIKE '%데스크탑%'
                                OR LOWER(i.TITLE) LIKE '%본체%'
                                OR LOWER(i.TITLE) LIKE '%pc%'
                                OR LOWER(i.CANONICAL_NAME) LIKE '%컴퓨터%'
                            )
                        )
                        OR (
                            :productType = 'laptop'
                            AND (
                                LOWER(i.TITLE) LIKE '%노트북%'
                                OR LOWER(i.TITLE) LIKE '%랩탑%'
                                OR LOWER(i.TITLE) LIKE '%그램%'
                                OR LOWER(i.TITLE) LIKE '%갤럭시북%'
                                OR LOWER(i.TITLE) LIKE '%맥북%'
                                OR LOWER(i.CANONICAL_NAME) LIKE '%노트북%'
                            )
                        )
                        OR (
                            :productType = 'smartphone'
                            AND (
                                LOWER(i.TITLE) LIKE '%아이폰%'
                                OR LOWER(i.TITLE) LIKE '%갤럭시%'
                                OR LOWER(i.TITLE) LIKE '%스마트폰%'
                                OR LOWER(i.TITLE) LIKE '%휴대폰%'
                                OR LOWER(i.CANONICAL_NAME) LIKE '%아이폰%'
                                OR LOWER(i.CANONICAL_NAME) LIKE '%갤럭시%'
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
                            AND (
                                LOWER(i.TITLE) LIKE '%gtx1050%'
                                OR LOWER(i.TITLE) LIKE '%gtx 1050%'
                                OR LOWER(i.TITLE) LIKE '%gtx950%'
                                OR LOWER(i.TITLE) LIKE '%gtx 950%'
                                OR LOWER(i.TITLE) LIKE '%uhd%'
                                OR LOWER(i.TITLE) LIKE '%내장그래픽%'
                                OR LOWER(i.TITLE) LIKE '%iris%'
                                OR LOWER(i.TITLE) LIKE '%vega%'
                                OR LOWER(i.TITLE) LIKE '%gtx1060%'
                                OR LOWER(i.TITLE) LIKE '%gtx 1060%'
                                OR LOWER(i.TITLE) LIKE '%gtx1660%'
                                OR LOWER(i.TITLE) LIKE '%gtx 1660%'
                                OR LOWER(i.TITLE) LIKE '%rtx2060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 2060%'
                                OR LOWER(i.TITLE) LIKE '%rtx3060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 3060%'
                                OR LOWER(i.TITLE) LIKE '%rtx4060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4060%'
                                OR LOWER(i.TITLE) LIKE '%rtx4070%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4070%'
                                OR LOWER(i.TITLE) LIKE '%rtx4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx4090%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4090%'
                            )
                        )
                        OR (
                            :performanceLevel = 'MID'
                            AND (
                                LOWER(i.TITLE) LIKE '%gtx1060%'
                                OR LOWER(i.TITLE) LIKE '%gtx 1060%'
                                OR LOWER(i.TITLE) LIKE '%gtx1660%'
                                OR LOWER(i.TITLE) LIKE '%gtx 1660%'
                                OR LOWER(i.TITLE) LIKE '%gtx1650%'
                                OR LOWER(i.TITLE) LIKE '%gtx 1650%'
                                OR LOWER(i.TITLE) LIKE '%rtx2060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 2060%'
                                OR LOWER(i.TITLE) LIKE '%rtx3060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 3060%'
                                OR LOWER(i.TITLE) LIKE '%rtx4060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4060%'
                                OR LOWER(i.TITLE) LIKE '%rtx4070%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4070%'
                                OR LOWER(i.TITLE) LIKE '%rtx4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx4090%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4090%'
                                OR LOWER(i.TITLE) LIKE '%rx580%'
                                OR LOWER(i.TITLE) LIKE '%rx 580%'
                                OR LOWER(i.TITLE) LIKE '%rx570%'
                                OR LOWER(i.TITLE) LIKE '%rx 570%'
                            )
                        )
                        OR (
                            :performanceLevel = 'HIGH'
                            AND (
                                LOWER(i.TITLE) LIKE '%rtx2060 super%'
                                OR LOWER(i.TITLE) LIKE '%rtx 2060 super%'
                                OR LOWER(i.TITLE) LIKE '%rtx3060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 3060%'
                                OR LOWER(i.TITLE) LIKE '%rtx3070%'
                                OR LOWER(i.TITLE) LIKE '%rtx 3070%'
                                OR LOWER(i.TITLE) LIKE '%rtx3080%'
                                OR LOWER(i.TITLE) LIKE '%rtx 3080%'
                                OR LOWER(i.TITLE) LIKE '%rtx3090%'
                                OR LOWER(i.TITLE) LIKE '%rtx 3090%'
                                OR LOWER(i.TITLE) LIKE '%rtx4060%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4060%'
                                OR LOWER(i.TITLE) LIKE '%rtx4070%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4070%'
                                OR LOWER(i.TITLE) LIKE '%rtx4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx4090%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4090%'
                                OR LOWER(i.TITLE) LIKE '%rx6600%'
                                OR LOWER(i.TITLE) LIKE '%rx 6600%'
                                OR LOWER(i.TITLE) LIKE '%rx6700%'
                                OR LOWER(i.TITLE) LIKE '%rx 6700%'
                                OR LOWER(i.TITLE) LIKE '%rx6800%'
                                OR LOWER(i.TITLE) LIKE '%rx 6800%'
                            )
                        )
                        OR (
                            :performanceLevel = 'EXTREME'
                            AND (
                                LOWER(i.TITLE) LIKE '%rtx4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4080%'
                                OR LOWER(i.TITLE) LIKE '%rtx4090%'
                                OR LOWER(i.TITLE) LIKE '%rtx 4090%'
                                OR LOWER(i.TITLE) LIKE '%rx7900%'
                                OR LOWER(i.TITLE) LIKE '%rx 7900%'
                            )
                        )
                  )

                  AND (
                        :useCase IS NULL
                        OR :useCase = ''
                        OR :useCase <> 'gaming'
                        OR (
                            LOWER(i.TITLE) LIKE '%게이밍%'
                            OR LOWER(i.TITLE) LIKE '%게임%'
                            OR LOWER(i.TITLE) LIKE '%rtx%'
                            OR LOWER(i.TITLE) LIKE '%gtx%'
                            OR LOWER(i.TITLE) LIKE '%rx%'
                            OR LOWER(i.TITLE) LIKE '%그래픽%'
                            OR LOWER(i.TITLE) LIKE '%그래픽카드%'
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
                        OR :productType <> 'smartphone'
                        OR (
                            (
                                LOWER(:keyword) NOT LIKE '%아이폰%'
                                OR LOWER(i.TITLE) LIKE '%아이폰%'
                                OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%아이폰%'
                                OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%아이폰%'
                            )
                            AND (
                                LOWER(:keyword) NOT LIKE '%갤럭시%'
                                OR LOWER(i.TITLE) LIKE '%갤럭시%'
                                OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%갤럭시%'
                                OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%갤럭시%'
                            )
                            AND (
                                REGEXP_SUBSTR(LOWER(:keyword), '[0-9]{1,2}') IS NULL
                                OR LOWER(i.TITLE) LIKE '%' || REGEXP_SUBSTR(LOWER(:keyword), '[0-9]{1,2}') || '%'
                                OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || REGEXP_SUBSTR(LOWER(:keyword), '[0-9]{1,2}') || '%'
                                OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || REGEXP_SUBSTR(LOWER(:keyword), '[0-9]{1,2}') || '%'
                            )
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
                        OR :productType <> 'desktop'
                        OR (
                            (
                                LOWER(i.TITLE) LIKE '%컴퓨터%'
                                OR LOWER(i.TITLE) LIKE '%데스크탑%'
                                OR LOWER(i.TITLE) LIKE '%본체%'
                                OR LOWER(i.TITLE) LIKE '%pc%'
                                OR LOWER(i.TITLE) LIKE '%게이밍pc%'
                                OR LOWER(i.TITLE) LIKE '%게이밍 pc%'
                            )
                            OR (
                                LOWER(i.TITLE) NOT LIKE '%그래픽카드%'
                                AND LOWER(i.TITLE) NOT LIKE '%그래픽 카드%'
                                AND LOWER(i.TITLE) NOT LIKE '%pci-e%'
                                AND LOWER(i.TITLE) NOT LIKE '%pcie%'
                                AND LOWER(i.TITLE) NOT LIKE '%gpu%'
                                AND LOWER(i.TITLE) NOT LIKE '%vga%'
                                AND LOWER(i.TITLE) NOT LIKE '%메인보드%'
                                AND LOWER(i.TITLE) NOT LIKE '%마더보드%'
                                AND LOWER(i.TITLE) NOT LIKE '%보드%'
                                AND LOWER(i.TITLE) NOT LIKE '%램%'
                                AND LOWER(i.TITLE) NOT LIKE '%ram%'
                                AND LOWER(i.TITLE) NOT LIKE '%ssd%'
                                AND LOWER(i.TITLE) NOT LIKE '%hdd%'
                                AND LOWER(i.TITLE) NOT LIKE '%파워%'
                                AND LOWER(i.TITLE) NOT LIKE '%케이스%'
                                AND LOWER(i.TITLE) NOT LIKE '%쿨러%'
                                AND LOWER(i.TITLE) NOT LIKE '%수냉%'
                                AND LOWER(i.TITLE) NOT LIKE '%cpu만%'
                                AND LOWER(i.TITLE) NOT LIKE '%부품%'
                            )
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
                            WHEN LOWER(NVL(i.CANONICAL_NAME, '')) = LOWER(:keyword) THEN 120
                            WHEN LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 100
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 90
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 70
                            WHEN LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            WHEN LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 35
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
                                      OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                      OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
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
                                      OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                      OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
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
                WHERE i.SALE_STATUS = 'ON_SALE'
                  AND i.CURRENT_PRICE >= 50000
                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR EXISTS (
                            SELECT 1
                            FROM USER_PREFERENCES up
                            WHERE up.USER_ID = :userId
                              AND (
                                  LOWER(i.TITLE) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                  OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
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
                            WHEN LOWER(NVL(i.CANONICAL_NAME, '')) = LOWER(:keyword) THEN 120
                            WHEN LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 100
                            WHEN LOWER(i.TITLE) = LOWER(:keyword) THEN 90
                            WHEN LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%' THEN 70
                            WHEN LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 60
                            WHEN LOWER(NVL(i.CATEGORY_NAME, '')) LIKE '%' || LOWER(:keyword) || '%' THEN 35
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
                WHERE i.SALE_STATUS = 'ON_SALE'
                  AND i.CURRENT_PRICE <= :maxPrice
                  AND (
                        i.CURRENT_PRICE >= 50000
                        OR LOWER(:keyword) LIKE '%케이스%'
                        OR LOWER(:keyword) LIKE '%필름%'
                        OR LOWER(:keyword) LIKE '%충전기%'
                        OR LOWER(:keyword) LIKE '%어댑터%'
                        OR LOWER(:keyword) LIKE '%파우치%'
                        OR LOWER(:keyword) LIKE '%커버%'
                  )
                  AND (
                        LOWER(i.TITLE) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(:keyword) || '%'
                        OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(:keyword) || '%'
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
                                      OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
                                      OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(sl.KEYWORD) || '%'
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
                                      OR LOWER(NVL(i.CANONICAL_NAME, '')) = LOWER(NVL(clicked.CANONICAL_NAME, ''))
                                      OR LOWER(i.TITLE) LIKE '%' || LOWER(NVL(clicked.CANONICAL_NAME, '')) || '%'
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
                                      OR LOWER(NVL(i.CANONICAL_NAME, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
                                      OR LOWER(NVL(i.MATCHED_KEYWORDS, '')) LIKE '%' || LOWER(up.PREFERRED_TAG) || '%'
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
                WHERE i.SALE_STATUS = 'ON_SALE'
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

    List<Item> findTop20BySaleStatusOrderByItemIdDesc(String saleStatus);

    List<Item> findByCategoryNameAndSaleStatusOrderByItemIdDesc(
            String categoryName,
            String saleStatus
    );

    List<Item> findByTitleContainingAndSaleStatusOrderByItemIdDesc(
            String keyword,
            String saleStatus
    );

    Optional<Item> findByPlatform_PlatformNameAndOriginalId(
            String platformName,
            String originalId
    );

    long countBySaleStatus(String saleStatus);

    @Query(value = """
        SELECT
            target.CURRENT_PRICE AS currentPrice,

            AVG(
                CASE
                    WHEN similar.SALE_STATUS = 'ON_SALE'
                    THEN similar.CURRENT_PRICE
                END
            ) AS averageListingPrice,

            AVG(
                CASE
                    WHEN similar.SALE_STATUS = 'SOLD_OUT'
                    THEN similar.CURRENT_PRICE
                END
            ) AS averageSoldPrice,

            SUM(
                CASE
                    WHEN similar.SALE_STATUS = 'ON_SALE'
                    THEN 1
                    ELSE 0
                END
            ) AS listingCount,

            SUM(
                CASE
                    WHEN similar.SALE_STATUS = 'SOLD_OUT'
                    THEN 1
                    ELSE 0
                END
            ) AS soldCount

        FROM ITEMS target
        JOIN ITEMS similar
          ON similar.CURRENT_PRICE IS NOT NULL
         AND similar.CURRENT_PRICE > 0
         AND similar.ITEM_ID <> target.ITEM_ID
         AND (
                (
                    target.CANONICAL_NAME IS NOT NULL
                    AND similar.CANONICAL_NAME IS NOT NULL
                    AND LOWER(similar.CANONICAL_NAME) = LOWER(target.CANONICAL_NAME)
                )
                OR
                (
                    target.CATEGORY_NAME IS NOT NULL
                    AND similar.CATEGORY_NAME IS NOT NULL
                    AND LOWER(similar.CATEGORY_NAME) = LOWER(target.CATEGORY_NAME)
                )
             )
        WHERE target.ITEM_ID = :itemId
        GROUP BY target.CURRENT_PRICE
        """, nativeQuery = true)
    PriceStatsProjection findPriceStatsByItemId(@Param("itemId") Long itemId);
}
