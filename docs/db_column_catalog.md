# DB 컬럼 카탈로그 (작성 예정)

테이블별 컬럼 구성과 파생 컬럼 정의를 이 문서에 정리합니다.

## items

| 테이블 | 컬럼 | 타입 | 원본/파생 | 설명 | 계산/출처 |
|--------|------|------|-----------|------|-----------|
| items | platform_name | text | 원본 | 플랫폼명 (번개장터, 중고나라 등) | 크롤링 CSV `platform` |
| items | original_id | text | 원본 | 플랫폼별 상품 ID | 크롤링 CSV `pid` |
| items | cluster_product_name | text | 파생 | 클러스터 표준 상품명 | `keyword_final.ipynb` |
| items | cluster_confidence | numeric(4,2) | 파생 | 클러스터 신뢰도 | `item_rating.py` |
| items | cluster_score | numeric(5,2) | 파생 | 클러스터링 점수 | `item_rating.py` |
| items | price_score | numeric(5,2) | 파생 | 최저가 근접 점수 | 동일 cluster_product_name 그룹 min 대비 |
| items | view_score | numeric(5,2) | 파생 | 조회수 점수 | view_count 정규화 |
| items | recency_score | numeric(5,2) | 파생 | 최근성 점수 | crawled_at/last_seen_at 기준 |
| items | view_count | integer | 원본/집계 | 누적 조회수 | `item_views` 집계 예정 |
| items | rating | numeric(6,2) | 파생 | 종합 점수 | cluster/price/view/recency 가중합 |

## 적용 migration

- `code/supabase/migrations/20260608120000_add_items_rating.sql`
- `code/supabase/migrations/20260609120000_merge_platforms_into_items.sql`
