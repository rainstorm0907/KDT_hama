# 프로젝트 구조 문서

이 문서는 프로젝트 폴더 구조, 폴더별 역할, 참고 문서 위치를 정리합니다.

## 프로젝트 폴더 구조

```text
kdtproject
├── README.md
├── code
│   ├── backend
│   │   └── src/main
│   │       ├── java/com/used/service
│   │       │   ├── config
│   │       │   ├── controller
│   │       │   ├── service
│   │       │   ├── repository
│   │       │   ├── dto
│   │       │   ├── entity
│   │       │   ├── scheduler
│   │       │   ├── notification
│   │       │   ├── chatbot
│   │       │   └── exception
│   │       ├── python
│   │       │   ├── analysis
│   │       │   ├── archive
│   │       │   ├── config
│   │       │   ├── crawling
│   │       │   ├── preprocessing
│   │       │   ├── api_server.py
│   │       │   ├── generate_config_reference_csv.py
│   │       │   ├── hama_data_pipeline.py
│   │       │   ├── product_matching.py
│   │       │   └── requirements.txt
│   │       └── resources
│   │           └── application.yml
│   └── frontend
│       └── Hama
│           ├── public
│           │   ├── favicon.svg
│           │   ├── hamalogo.png
│           │   ├── hama_lowban1.jpg
│           │   └── icons.svg
│           ├── src
│           │   ├── api
│           │   ├── components
│           │   ├── data
│           │   ├── design-prototypes
│           │   ├── pages
│           │   ├── styles
│           │   ├── types
│           │   ├── utils
│           │   ├── App.css
│           │   ├── App.tsx
│           │   ├── index.css
│           │   └── main.tsx
│           ├── package.json
│           ├── tsconfig.json
│           └── vite.config.ts
└── docs
    ├── project_structure.md
    ├── requirements.md
    ├── document_checklist.md
    ├── search_relevance_plan.md
    ├── api_spec.md
    ├── db_schema.sql
    ├── ERD.drawio.png
    └── 데이터 명세서.xlsx
```

주요 프론트엔드 파일:

```text
code/frontend/Hama/src
├── api
│   └── products.ts
├── components
│   ├── AuthModal.tsx
│   ├── Banner.tsx
│   ├── CategoryGrid.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── PlatformPill.tsx
│   ├── PriceInsightChart.tsx
│   ├── ProductCard.tsx
│   ├── ProductDetailModal.tsx
│   ├── ProductVisual.tsx
│   ├── SearchBar.tsx
│   └── SortControls.tsx
├── data
│   ├── categories.ts
│   └── mockProducts.ts
├── design-prototypes
│   ├── price-insight-a
│   ├── price-insight-b
│   └── price-insight-c
├── pages
│   ├── DesignLabPage.tsx
│   ├── DesignPreviewPage.tsx
│   ├── HomePage.tsx
│   ├── MyPage.tsx
│   └── SearchResultsPage.tsx
├── styles
│   └── hairline.ts
├── types
│   └── product.ts
├── utils
│   ├── format.ts
│   ├── recentSearches.ts
│   └── temporarySearchCalculations.ts
├── App.css
├── App.tsx
├── index.css
└── main.tsx
```

주요 Python 분석/파이프라인 파일:

```text
code/backend/src/main/python
├── analysis
│   ├── cluster_bracket_contents.py
│   └── results
│       ├── bracket_contents
│       └── bracket_clusters
├── config
│   ├── README.md
│   ├── category_rules.csv
│   ├── product_token_dictionary.csv
│   ├── token_exclude_list.csv
│   └── reference
├── crawling
│   ├── keyword_list.csv
│   ├── update_keyword_list.py
│   ├── archive
│   └── results
├── preprocessing
│   └── .gitkeep
├── api_server.py
├── generate_config_reference_csv.py
├── hama_data_pipeline.py
├── product_matching.py
└── requirements.txt
```

## 폴더별 설명

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
- `code/frontend/Hama`: Vite + React + TypeScript 기반 프론트엔드 앱 영역입니다.
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
- [ERD 이미지](./ERD.drawio.png): ERD 이미지
- [데이터 명세서](./데이터%20명세서.xlsx): 18개 테이블 기준 데이터 명세서
