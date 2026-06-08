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

현재 Python 영역은 MVP API, Supabase 적재, 상품명 매칭 파이프라인, 크롤링 입력값, 분석 결과를 관리합니다.

```text
python
├── api_server.py
├── apply_supabase_schema.py
├── generate_config_reference_csv.py
├── hama_data_pipeline.py
├── import_csv_to_supabase.py
├── product_matching.py
├── supabase_repository.py
├── requirements.txt
├── analysis
│   ├── check_title_keyword_accuracy.py
│   ├── cluster_bracket_contents.py
│   ├── compare_platform_data.py
│   ├── cluster_splits.ipynb
│   ├── keyword_price_outliers.ipynb
│   ├── keyword_price_outliers_first_filter.ipynb
│   └── results
├── config
├── crawling
│   ├── blacklist_keywords.csv
│   ├── blacklist_tokens.csv
│   ├── keyword_list.csv
│   └── update_keyword_list.py
└── preprocessing
```

역할:

- `api_server.py`: 현재 MVP FastAPI 서버입니다. 상품 검색, 추천, 상세 API를 제공합니다.
- `supabase_repository.py`: Supabase 상품 조회와 CSV fallback을 분리합니다.
- `hama_data_pipeline.py`, `product_matching.py`: 상품명 정규화, 토큰 매칭, 카테고리 배정 파이프라인입니다.
- `import_csv_to_supabase.py`: 크롤링 CSV를 Supabase 테이블로 적재합니다.
- `apply_supabase_schema.py`: Supabase/PostgreSQL 스키마를 적용합니다.
- `config`: 상품 토큰 사전, 카테고리 규칙, 제외 토큰 CSV와 참고 CSV를 관리합니다.
- `crawling`: 추적되는 키워드/블랙리스트 설정과 키워드 갱신 스크립트를 관리합니다.
- `crawling/archive`, `crawling/results`: 크롤링 스크립트와 대용량 결과물의 로컬 보관 위치이며 Git 추적 대상에서 제외될 수 있습니다.
- `analysis`: 정합성 검증, 플랫폼 비교, 대괄호 토큰 클러스터링, 가격 이상치 분석 노트북/결과를 관리합니다.
- `preprocessing`: 향후 DB 저장 전 전처리 스크립트를 둘 위치이며 현재는 `.gitkeep`만 있습니다.

분석 결과 하위 폴더:

```text
analysis/results
├── bracket_contents
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
└── 20260519000000_hama_schema.sql
```

이 migration은 현재 MVP Supabase/PostgreSQL 스키마의 원본입니다. `docs/supabase_schema.sql`은 문서용 사본이고, `docs/db_schema.sql`은 Oracle 계열 설계안입니다.

## Docs

```text
docs
├── api_spec.md
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
- `code/supabase/migrations/20260519000000_hama_schema.sql`: 실제 적용 기준 migration입니다.
- `ERD.drawio.png`, `데이터 명세서.xlsx`: 바이너리 문서이므로 구조 변경 시 별도 도구에서 동기화해야 합니다.

## 참고 문서

- [요구사항 및 작성 기준](./requirements.md)
- [구현 파일 작성 체크리스트](./document_checklist.md)
- [검색 결과 정합성 판별 모델 진행 계획](./search_relevance_plan.md)
- [API 명세서](./api_spec.md)
- [DB 테이블 생성 SQL](./db_schema.sql)
- [Supabase 스키마](./supabase_schema.sql)
- [Supabase 설정 문서](./supabase_setup.md)
- [ERD 이미지](./ERD.drawio.png)
- [데이터 명세서](./데이터%20명세서.xlsx)
