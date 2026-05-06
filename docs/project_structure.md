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
│   │       │   ├── crawling
│   │       │   ├── preprocessing
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
│           │   ├── components
│           │   │   ├── CategoryGrid.tsx
│           │   │   ├── Footer.tsx
│           │   │   ├── Header.tsx
│           │   │   ├── HeroBanner.tsx
│           │   │   ├── ProductGrid.tsx
│           │   │   └── SearchPanel.tsx
│           │   ├── data
│           │   │   └── catalog.ts
│           │   ├── types
│           │   │   └── catalog.ts
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
    ├── api_spec.md
    ├── db_schema.sql
    ├── ERD.drawio.png
    └── 데이터 명세서.xlsx
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
- `code/backend/src/main/python`: Python 크롤링 및 전처리 코드를 관리합니다.
- `code/frontend/Hama`: Vite + React + TypeScript 기반 프론트엔드 앱 영역입니다.
- `code/frontend/Hama/src/App.tsx`: 홈 화면 상태와 주요 섹션 컴포넌트를 조합하는 최상위 컴포넌트입니다.
- `code/frontend/Hama/src/components`: Header, Footer, HeroBanner, SearchPanel, CategoryGrid, ProductGrid 등 홈 화면 구성 컴포넌트를 작성합니다.
- `code/frontend/Hama/src/data`: 카테고리, 상품, 최근 검색어 같은 화면 표시용 데이터를 관리합니다.
- `code/frontend/Hama/src/types`: 프론트엔드에서 사용하는 TypeScript 타입을 정의합니다.
- `code/frontend/Hama/public`: 로고, 배너, 아이콘 같은 정적 파일을 보관합니다.
- `docs`: 요구사항, 구현 파일 체크리스트, API 명세, DB 스키마, ERD, 데이터 명세서를 보관합니다.

## 참고 문서

- [프로젝트 구조 문서](./project_structure.md): 프로젝트 폴더 구조, 폴더별 설명, 참고 문서 링크
- [프로젝트 구조 및 파일 작성 가이드](./requirements.md): 프로젝트 구조 및 파일 작성 가이드
- [구현 파일 작성 체크리스트](./document_checklist.md): 백엔드/프론트엔드 구현 파일 작성 상태 체크리스트
- [API 명세서](./api_spec.md): API 명세서
- [DB 테이블 생성 SQL](./db_schema.sql): DB 테이블 생성 SQL
- [ERD 이미지](./ERD.drawio.png): ERD 이미지
- [데이터 명세서](./데이터%20명세서.xlsx): 데이터 명세서
