# 프로젝트 구조 문서

현재 로컬 저장소(`kdtproject`)의 주요 폴더와 파일 역할을 정리합니다.

## 전체 구조

```text
kdtproject
├── README.md
├── code
│   ├── backend
│   │   ├── build.gradle
│   │   ├── settings.gradle
│   │   ├── gradlew
│   │   ├── gradlew.bat
│   │   ├── gradle
│   │   └── src/main
│   │       ├── java/com/used/service
│   │       ├── python
│   │       └── resources/application.yaml
│   ├── frontend/Hama
│   └── supabase/migrations
└── docs
```

## Backend Java

기준 위치:

```text
code/backend/src/main/java/com/used/service
```

현재 이 위치에는 Spring Boot API 구현이 통합되어 있습니다.

```text
com/used/service
├── chatbot
├── config
├── controller
├── dto
├── entity
├── exception
├── notification
├── repository
├── scheduler
└── service
```

Spring Boot 프로젝트 루트는 `code/backend`입니다. 기본 포트는 Python FastAPI `8000`과 분리하기 위해 `8080`으로 설정되어 있습니다.

주요 API 영역:

- `controller`, `service`, `repository`, `entity`, `dto`: 인증, 상품, 마이페이지 API
- `chatbot`: 챗봇, Gemini 연동, 추천/FAQ/검색 로그 관련 API
- `config`: Security, CORS, WebClient 설정
- `resources/application.yaml`: DB, JPA, Gemini, logging 설정

## Backend Python

기준 위치:

```text
code/backend/src/main/python
```

현재 Python 영역은 **로컬 MVP** 기준으로 API, Supabase 적재, 상품명 매칭 파이프라인, 크롤링 입력값, 분석 결과를 관리합니다. 백엔드 서버 배포 없이 개발 PC에서 실행하는 것을 전제로 합니다.

```text
python
├── README.md                  # Python 백엔드 전체 가이드
├── api_server.py              # 로컬 FastAPI (127.0.0.1:8000)
├── import_csv_to_supabase.py  # DB 적재 진입점
├── requirements.txt
├── .env.example
├── lib/                       # 핵심 라이브러리 (import 전용)
│   ├── hama_data_pipeline.py
│   ├── keyword_preprocessing.py
│   ├── product_matching.py
│   ├── item_rating.py
│   └── supabase_repository.py
├── tools/                     # 유지보수 스크립트
│   ├── apply_supabase_schema.py
│   ├── generate_config_reference_csv.py
│   └── generate_supabase_erd.py
├── analysis/                  # 연구·검증 (README.md 참고)
│   ├── notebooks/             # keyword_final.ipynb 등
│   ├── scripts/               # 정확성·플랫폼·bracket 분석 CLI
│   ├── handoff/               # DB 적재 handoff CSV
│   ├── review/                # 중간 검토 CSV
│   ├── results/               # 분석 리포트 (gitignore)
│   └── archive/               # 레거시 결과 (gitignore)
├── config/
└── crawling/
    ├── blacklist_keywords.csv
    ├── blacklist_tokens.csv
    ├── keyword_list.csv
    └── update_keyword_list.py
```

역할:

- `api_server.py`: 로컬 MVP FastAPI 서버입니다. `127.0.0.1:8000`에서 상품 검색, 추천, 상세 API를 제공합니다.
- `lib/supabase_repository.py`: Supabase 상품 조회와 CSV fallback을 분리합니다.
- `lib/hama_data_pipeline.py`, `lib/product_matching.py`, `lib/item_rating.py`, `lib/keyword_preprocessing.py`: 상품명 정규화, 토큰 매칭, rating·클러스터 전처리 파이프라인입니다.
- `import_csv_to_supabase.py`: `analysis/handoff/keyword_db_input_df.csv` 등을 Supabase에 적재합니다.
- `tools/apply_supabase_schema.py`: Supabase/PostgreSQL 스키마를 로컬에서 적용합니다.
- `config`: 상품 토큰 사전, 카테고리 규칙, 제외 토큰 CSV와 참고 CSV를 관리합니다.
- `crawling`: 추적되는 키워드/블랙리스트 설정과 키워드 갱신 스크립트를 관리합니다.
- `crawling/archive`, `crawling/results`: 크롤링 대용량 결과물 로컬 보관 (gitignore).
- `README.md`: Python 백엔드 전체 구조·실행 가이드.
- `analysis/notebooks`: 전처리·클러스터링·rating 최종 파이프라인 (`keyword_final.ipynb`).
- `analysis/scripts`: 데이터 확인용 CLI 분석 스크립트.
- `analysis/handoff`: DB 적재 handoff CSV. `import_csv_to_supabase.py`가 읽습니다.

분석 결과 하위 폴더:

```text
analysis/results
├── bracket_clusters
├── platform_comparison
├── price_outliers
└── title_keyword_accuracy
```

## Frontend

기준 위치:

```text
code/frontend/Hama/src
```

현재 주요 구조:

```text
src
├── AppRoot.tsx
├── main.tsx
├── index.css
├── api/products.ts
├── components
│   ├── AuthModal.tsx
│   ├── Banner.tsx
│   ├── Header.tsx
│   ├── PlatformPill.tsx
│   ├── PriceCompare*.tsx
│   ├── PriceInsightChart.tsx
│   ├── Product*.tsx
│   ├── RecentKeywordRecommendations.tsx
│   ├── Side*.tsx
│   ├── SearchBar.tsx
│   ├── SortControls.tsx
│   ├── SiteFooter.tsx
│   └── mypage/*.tsx
├── hooks/useModalScrollLock.ts
├── lib/queryClient.ts
├── pages
│   ├── AdminPage.tsx
│   ├── HomePage.tsx
│   ├── LegalPage.tsx
│   ├── MyPage.tsx
│   └── SearchResultsPage.tsx
├── queries/productQueries.ts
├── styles/hairline.ts
├── types
└── utils
```

주요 라우트:

- `/`: 메인 검색, 배너, 최근 검색 기반 추천, 추천 상품
- `/search`: 검색 결과, 플랫폼 필터, 정렬, 페이지네이션
- `/mypage`: 찜, 최근 본 상품, 알림, 가격 비교, 설정 탭
- `/admin`: 관리자 대시보드 UI
- `/terms`, `/privacy`: 약관/개인정보 화면

`code/frontend/src`에도 일부 컴포넌트가 있지만, 현재 메인 앱은 `code/frontend/Hama`입니다.

## Supabase

```text
code/supabase/migrations
├── 20260519000000_hama_schema.sql
├── 20260608000000_service_search_schema.sql
├── 20260608120000_add_items_rating.sql
└── 20260609120000_merge_platforms_into_items.sql
```

migration 파일이 실제 적용 기준입니다. `docs/supabase_schema.sql`은 문서용 최종 스키마 사본이고, `docs/db_schema.sql`은 Oracle 계열 설계안입니다.

## Docs

```text
docs
├── api_spec.md
├── db_column_catalog.md
├── db_schema.sql
├── document_checklist.md
├── project_structure.md
├── requirements.md
├── search_relevance_plan.md
├── supabase_schema.sql
├── supabase_setup.md
├── ERD.drawio.png
├── chatbot_expected_answers.csv
└── 데이터 명세서.xlsx
```

참고:

- `db_schema.sql`: Oracle 계열 문법 기준 설계 DDL입니다.
- `supabase_schema.sql`: Supabase/PostgreSQL 기준 문서용 스키마입니다.
- `code/supabase/migrations/*.sql`: 실제 적용 기준 migration입니다.
- `ERD.drawio.png`: `code/backend/src/main/python/tools/generate_supabase_erd.py`로 재생성할 수 있습니다.
- `데이터 명세서.xlsx`: 바이너리 문서이므로 구조 변경 시 별도 도구에서 동기화해야 합니다.

## 참고 문서

- [요구사항 및 작성 기준](./requirements.md)
- [구현 파일 작성 체크리스트](./document_checklist.md)
- [검색 결과 정합성 판별 모델 진행 계획](./search_relevance_plan.md)
- [API 명세서](./api_spec.md)
- [DB 테이블 생성 SQL](./db_schema.sql)
- [Supabase 스키마](./supabase_schema.sql)
- [DB 컬럼 카탈로그](./db_column_catalog.md)
- [Python 백엔드 README](../code/backend/src/main/python/README.md)
- [Supabase 설정 문서](./supabase_setup.md)
- [ERD 이미지](./ERD.drawio.png)
- [데이터 명세서](./데이터%20명세서.xlsx)
