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
│   │       └── resources/application.yml
│   └── frontend/Hama
│       ├── public
│       ├── src
│       ├── package.json
│       └── vite.config.ts
├── docs
│   ├── api_spec.md
│   ├── db_schema.sql
│   ├── document_checklist.md
│   ├── project_structure.md
│   ├── requirements.md
│   ├── search_relevance_plan.md
│   ├── ERD.drawio.png
│   └── 데이터 명세서.xlsx
└── 정지원_boot
    └── 제출용 Spring Boot API 프로젝트
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
├── ERD.drawio.png
└── 데이터 명세서.xlsx
```

참고:

- `db_schema.sql`은 Oracle 계열 문법 기준 DDL입니다.
- PostgreSQL 또는 Supabase에 적용할 경우 `NUMBER`, `VARCHAR2`, `SYSDATE` 등을 변환해야 합니다.
