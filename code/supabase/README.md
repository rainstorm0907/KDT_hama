# Hama Supabase 관리 폴더

이 폴더는 Hama 프로젝트에서 Supabase/Postgres 스키마를 실제로 관리하는 위치입니다.

문서용 설명은 `docs/`에 둘 수 있지만, 실제 적용 기준은 이 폴더의 `migrations/*.sql` 파일입니다.

## 현재 마이그레이션

- `migrations/20260519000000_hama_schema.sql`
  - 상품, 플랫폼, 가격 이력, 사용자 프로필, 찜, 검색 로그, 배너, 챗봇, 추천, 알림 기본 테이블입니다.
  - Supabase Auth의 `auth.users`를 로그인 원본으로 두고, `public.users`는 앱 프로필 테이블로 씁니다.

- `migrations/20260608000000_service_search_schema.sql`
  - 완성도 있는 운영을 위해 추가한 검색/분석/콘텐츠 테이블입니다.
  - `search_events`: 검색, 노출, 클릭 이벤트 로그입니다.
  - `item_search_matches`: 어떤 키워드가 어떤 상품과 매칭됐는지 근거를 저장합니다.
  - `price_stats_daily`: 표준 상품명 기준 일별 가격 통계 캐시입니다.
  - `content_pages`: 공지, 약관, 개인정보처리방침, 안내 글 같은 운영 콘텐츠입니다.

## 왜 `search_logs`와 `search_events`를 나눴나요?

`search_logs`는 사용자가 최종적으로 검색한 키워드 중심의 단순 기록입니다.

`search_events`는 검색 결과 노출, 클릭, OpenSearch/fallback 출처 같은 이벤트까지 남기는 로그입니다.
입력 중인 글자가 전부 쌓이는 문제를 피하려면 프론트에서는 검색창 변경마다 저장하지 않고, 검색 실행/결과 노출/클릭처럼 의미 있는 순간만 `search_events`에 남기는 흐름이 좋습니다.

## OpenSearch와의 관계

Supabase는 상품 데이터의 기준 DB입니다.

OpenSearch는 Supabase의 `items`를 읽어서 검색 전용 인덱스를 만드는 보조 서버입니다.
OpenSearch 관련 Docker 설정, 인덱스 매핑, 검색 모듈, 색인 배치 스크립트는 백엔드의 별도 폴더에서 관리합니다.

```text
code/backend/opensearch/
```

연결 흐름은 다음과 같습니다.

```text
크롤링 CSV
-> import_csv_to_supabase.py
-> Supabase items / price_history
-> code/backend/opensearch/sync_from_supabase.py
-> OpenSearch hama_items 인덱스
-> FastAPI /api/products/search
```

## 적용 방법

백엔드 Python 폴더에서 `.env`에 `SUPABASE_DATABASE_URL`이 준비되어 있어야 합니다.

```bash
cd code/backend/src/main/python
python3 apply_supabase_schema.py
```

`apply_supabase_schema.py`는 `code/supabase/migrations/*.sql`을 정렬된 순서대로 실행합니다.

## 주의할 점

이 프로젝트의 최신 Supabase 스키마는 사용자 id를 `uuid`로 둡니다.
이유는 Supabase Auth의 `auth.users.id`와 맞추기 위해서입니다.

예전 `docs/db_schema.sql`의 Oracle 계열 설계와 일부 Java 엔티티에는 `NUMBER`/`Long` 기반 사용자 id가 남아 있습니다.
실제 Supabase에 붙일 때는 이 폴더의 스키마를 기준으로 보고, Java 쪽을 운영 백엔드로 살릴 경우 사용자 id 타입을 맞추는 작업이 따로 필요합니다.
