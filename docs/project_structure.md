# 프로젝트 구조 문서

현재 프로젝트의 주요 폴더와 파일 역할을 정리합니다.

## 전체 구조

```text
kdtproject
├── README.md
├── code
│   ├── backend
│   │   └── src/main
│   │       ├── java/com/used/service
│   │       ├── python
│   │       │   ├── analysis
│   │       │   ├── config
│   │       │   ├── crawling
│   │       │   ├── preprocessing
│   │       │   ├── api_server.py
│   │       │   ├── apply_supabase_schema.py
│   │       │   ├── generate_config_reference_csv.py
│   │       │   ├── hama_data_pipeline.py
│   │       │   ├── import_csv_to_supabase.py
│   │       │   ├── product_matching.py
│   │       │   ├── supabase_repository.py
│   │       │   └── requirements.txt
│   │       └── resources
│   │           └── application.yml
│   ├── frontend
│   │   └── Hama
│   │       ├── public
│   │       │   ├── favicon.svg
│   │       │   ├── hamalogo.png
│   │       │   ├── hama_lowban1.jpg
│   │       │   └── icons.svg
│   │       ├── src
│   │       │   ├── api
│   │       │   ├── components
│   │       │   ├── data
│   │       │   ├── design-prototypes
│   │       │   ├── pages
│   │       │   ├── styles
│   │       │   ├── types
│   │       │   ├── utils
│   │       │   ├── App.css
│   │       │   ├── App.tsx
│   │       │   ├── index.css
│   │       │   └── main.tsx
│   │       ├── package.json
│   │       ├── tsconfig.json
│   │       └── vite.config.ts
│   └── supabase
│       └── migrations
│           └── 20260519000000_hama_schema.sql
└── docs
    ├── project_structure.md
    ├── requirements.md
    ├── document_checklist.md
    ├── search_relevance_plan.md
    ├── api_spec.md
    ├── db_schema.sql
    ├── supabase_schema.sql
    ├── supabase_setup.md
    ├── ERD.drawio.png
    └── 데이터 명세서.xlsx
```

## Backend Java

기준 위치:

```text
code/backend/src/main/java/com/used/service
```

현재 이 위치는 계층별 폴더만 준비되어 있고, 실제 Java 기능 코드는 아직 `.gitkeep` 상태입니다.

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

`정지원_boot` 폴더는 별도 제출용 Spring Boot 프로젝트입니다. 메인 서비스 코드 위치인 `code/backend/src/main/java`와 분리해서 관리합니다.

## Backend Python

기준 위치:

```text
code/backend/src/main/python
```

주요 파일:

```text
python
├── api_server.py
├── generate_config_reference_csv.py
├── hama_data_pipeline.py
├── product_matching.py
├── requirements.txt
├── analysis
│   ├── check_title_keyword_accuracy.py
│   ├── cluster_bracket_contents.py
│   ├── compare_platform_data.py
│   └── results
├── config
├── crawling
│   ├── update_keyword_list.py
│   ├── archive
│   └── results
└── preprocessing
```

역할:

- `crawling`: 중고거래 플랫폼 크롤링 스크립트와 결과 CSV 관리
- `analysis`: 크롤링 결과 검증, 가격 이상치 분석, 토큰/대괄호 분석
- `config`: 상품명 매칭, 카테고리 규칙, 제외 토큰 CSV 관리
- `hama_data_pipeline.py`: 설정 CSV 기반 상품 매칭 파이프라인
- `api_server.py`: Python 파이프라인 확인용 FastAPI 서버

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
├── api
│   └── products.ts
├── components
│   ├── AuthModal.tsx
│   ├── Banner.tsx
│   ├── CategoryGrid.tsx
│   ├── Header.tsx
│   ├── PlatformPill.tsx
│   ├── PriceInsightChart.tsx
│   ├── ProductCard.tsx
│   ├── ProductDetailModal.tsx
│   ├── ProductVisual.tsx
│   ├── RefreshProductsButton.tsx
│   ├── RowsMenu.tsx
│   ├── ScrollToTopButton.tsx
│   ├── SearchBar.tsx
│   ├── SiteFooter.tsx
│   └── SortControls.tsx
├── data
│   └── categories.ts
├── lib
│   └── queryClient.ts
├── pages
│   ├── HomePage.tsx
│   ├── LegalPage.tsx
│   ├── MyPage.tsx
│   └── SearchResultsPage.tsx
├── queries
│   └── productQueries.ts
├── styles
│   └── hairline.ts
├── types
│   ├── product.ts
│   └── productList.ts
└── utils
    ├── format.ts
    ├── recentSearches.ts
    └── userProductLists.ts
```

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
└── 데이터 명세서.xlsx
```

참고:

- `db_schema.sql`은 Oracle 계열 문법 기준 DDL입니다.
- PostgreSQL 또는 Supabase에 적용할 경우 `NUMBER`, `VARCHAR2`, `SYSDATE` 등을 변환해야 합니다.
- `code/backend`: Spring Boot 기반 백엔드 코드 영역입니다.
- `code/backend/src/main/java/com/used/service/controller`: 사용자 요청을 받는 REST API 컨트롤러를 작성합니다.
- `code/backend/src/main/java/com/used/service/service`: 회원, 상품, 찜, 추천, 검색 등 핵심 비즈니스 로직을 작성합니다.
- `code/backend/src/main/java/com/used/service/repository`: DB 접근 코드를 작성합니다.
- `code/backend/src/main/java/com/used/service/entity`: DB 테이블과 매핑되는 Entity 클래스를 작성합니다.
- `code/backend/src/main/java/com/used/service/dto`: API 요청/응답 데이터 객체를 작성합니다.
- `code/backend/src/main/java/com/used/service/scheduler`: 가격 갱신, 최저가 알림, 검색 순위 집계 같은 정기 작업을 작성합니다.
- `code/backend/src/main/java/com/used/service/notification`: 알림 생성, 조회, 읽음 처리 로직을 작성합니다.
- `code/backend/src/main/java/com/used/service/chatbot`: 챗봇 관련 API와 서비스 로직을 작성합니다.
- `code/backend/src/main/python`: Python 크롤링, 분석, 상품 매칭, 파이프라인 API 코드를 관리합니다.
- `code/backend/src/main/python/analysis`: 크롤링 결과를 검토하기 위한 분석용 스크립트와 결과 CSV를 보관합니다.
- `code/backend/src/main/python/analysis/results/bracket_contents`: 상품명 대괄호(`[]`) 내부 텍스트 추출 결과를 보관합니다.
- `code/backend/src/main/python/analysis/results/bracket_clusters`: 대괄호 내부 텍스트 클러스터링 결과를 보관합니다.
- `code/backend/src/main/python/config`: 상품명 매칭, 카테고리, 제외 토큰 CSV 설정과 참고 CSV를 관리합니다.
- `code/backend/src/main/python/crawling`: 크롤링 입력 키워드, 실행 스크립트, 원본 결과 CSV를 관리합니다.
- `code/backend/src/main/python/preprocessing`: 향후 DB 저장 전 전처리 스크립트를 둘 예정이며 현재는 `.gitkeep`만 있습니다.
- `code/backend/src/main/python/supabase_repository.py`: Supabase 상품 조회와 CSV fallback을 분리하기 위한 Python 저장소 모듈입니다.
- `code/backend/src/main/python/apply_supabase_schema.py`: Supabase/PostgreSQL 스키마를 로컬에서 적용하는 스크립트입니다.
- `code/backend/src/main/python/import_csv_to_supabase.py`: 크롤링 CSV 데이터를 Supabase 테이블로 적재하는 스크립트입니다.
- `code/frontend/Hama`: Vite + React + TypeScript 기반 프론트엔드 앱 영역입니다.
- `code/supabase/migrations`: Supabase/PostgreSQL 테이블 생성 migration을 보관합니다.
- `code/frontend/Hama/src/App.tsx`: 페이지 전환과 앱 최상위 레이아웃을 관리합니다.
- `code/frontend/Hama/src/api`: 프론트엔드에서 백엔드 또는 목 API 형태로 상품 데이터를 읽는 모듈을 관리합니다.
- `code/frontend/Hama/src/components`: 검색바, 상품 카드, 가격 차트, 인증 모달 등 재사용 UI 컴포넌트를 작성합니다.
- `code/frontend/Hama/src/data`: 카테고리와 목 상품 데이터를 관리합니다.
- `code/frontend/Hama/src/design-prototypes`: 가격 인사이트 화면 시안과 설명 문서를 보관합니다.
- `code/frontend/Hama/src/pages`: 홈, 검색 결과, 마이페이지, 디자인 랩 등 페이지 단위 컴포넌트를 작성합니다.
- `code/frontend/Hama/src/styles`: 공통 스타일 유틸리티를 관리합니다.
- `code/frontend/Hama/src/types`: 프론트엔드에서 사용하는 TypeScript 타입을 정의합니다.
- `code/frontend/Hama/src/utils`: 포맷팅, 최근 검색어, 임시 계산 로직 같은 유틸리티를 관리합니다.
- `code/frontend/Hama/public`: 로고, 배너, 아이콘 같은 정적 파일을 보관합니다.
- `docs`: 요구사항, 구현 파일 체크리스트, API 명세, DB 스키마, ERD, 데이터 명세서를 보관합니다.

## 참고 문서

- [프로젝트 구조 문서](./project_structure.md): 프로젝트 폴더 구조, 폴더별 설명, 참고 문서 링크
- [프로젝트 구조 및 파일 작성 가이드](./requirements.md): 프로젝트 구조 및 파일 작성 가이드
- [구현 파일 작성 체크리스트](./document_checklist.md): 백엔드/프론트엔드 구현 파일 작성 상태 체크리스트
- [검색 결과 정합성 판별 모델 진행 계획](./search_relevance_plan.md): 크롤링 결과 정합성 판별 모델의 현재 진행 상황과 다음 작업 계획
- [API 명세서](./api_spec.md): API 명세서
- [DB 테이블 생성 SQL](./db_schema.sql): 18개 테이블 기준 DB 테이블 생성 SQL
- [Supabase 스키마](./supabase_schema.sql): Supabase/PostgreSQL 기준 테이블 생성 SQL
- [Supabase 설정 문서](./supabase_setup.md): 로컬 환경 변수, 스키마 적용, CSV 적재 방법
- [ERD 이미지](./ERD.drawio.png): ERD 이미지
- [데이터 명세서](./데이터%20명세서.xlsx): 18개 테이블 기준 데이터 명세서
