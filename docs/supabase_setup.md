# Hama Supabase 연결 방법

## 1. 환경 준비

아래 명령어는 프로젝트 루트(`c:\project\kdtproject\kdtproject`)에서 시작하는 기준입니다.

PowerShell:

```powershell
cd code/backend/src/main/python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

macOS/Linux:

```bash
cd code/backend/src/main/python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

`code/backend/src/main/python/.env`를 만들고 아래 값을 채웁니다.

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DATABASE_URL=postgresql://postgres.your-project-ref:your-database-password@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

`SUPABASE_SERVICE_ROLE_KEY`와 DB 비밀번호는 로컬 `.env`에만 두고, 프론트엔드 코드나 GitHub에는 절대 올리지 않습니다.

## 2. 테이블 생성

스키마 적용 기준 원본은 `code/supabase/migrations/*.sql` 입니다.

주요 migration:

- `20260519000000_hama_schema.sql` — 기본 테이블
- `20260608000000_service_search_schema.sql` — 검색/분석 확장
- `20260608120000_add_items_rating.sql` — `items` rating·클러스터 점수 컬럼
- `20260609120000_merge_platforms_into_items.sql` — `platforms` 제거, `items.platform_name` 흡수

문서용 전체 스키마는 `docs/supabase_schema.sql`을 참고합니다.

로컬에서는 migration을 스크립트로 적용합니다.

```bash
python tools/apply_supabase_schema.py
```

## 3. CSV 데이터를 Supabase에 넣기

전처리·클러스터링·rating 계산이 끝난 preview CSV를 적재하는 것을 권장합니다.

```bash
python import_csv_to_supabase.py --use-cluster-preview  # 입력: analysis/handoff/keyword_db_input_df.csv
```

크롤링 원본 CSV만 바로 넣을 때:

```bash
python import_csv_to_supabase.py
```

스크립트는 CSV를 읽어 아래 테이블에 저장합니다.

- `items` (`platform_name`, `original_id`, `cluster_product_name`, `rating` 등)
- `price_history`

`items.platform_name`에 번개장터·중고나라 같은 플랫폼명이 직접 저장됩니다. 별도 `platforms` 테이블은 사용하지 않습니다.

전체 migration에는 향후 계정 기반 기능을 위한 아래 테이블도 포함되어 있습니다.

- `wishlists`
- `search_logs`
- `search_rankings`
- `user_preferences`
- `banners`
- `chat_history`
- `chat_faq`
- `recommended_items`

현재 프론트 MVP에서 찜, 최근 본 상품, 알림 후보, 가격 비교 리스트는 로컬스토리지로 동작하므로 위 사용자 기능 테이블과 아직 직접 연결되지 않았습니다.

## 4. API 서버 실행

```bash
python -m uvicorn api_server:app --host 127.0.0.1 --port 8000 --reload
```

로컬 MVP 기준으로 `127.0.0.1`에서만 실행합니다. Supabase 환경변수가 있으면 DB를 읽고, 없으면 `crawling/results` CSV fallback으로 동작합니다. OpenSearch는 `.env.example` 기본값(`HAMA_OPENSEARCH_ENABLED=false`)에서 꺼져 있습니다.

확인:

```bash
curl http://127.0.0.1:8000/api/health
curl "http://127.0.0.1:8000/api/products/search?q=아이폰"
```
