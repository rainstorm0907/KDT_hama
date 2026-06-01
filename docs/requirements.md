# 프로젝트 구조 및 작성 기준

이 문서는 현재 프로젝트에서 코드를 작성할 위치와 문서 관리 기준을 정리합니다.

## Backend Java

기준 위치:

```text
code/backend/src/main/java/com/used/service
```

현재 메인 Java 백엔드는 폴더만 준비된 상태입니다. 실제 기능 구현 시 아래 기준으로 작성합니다.

- `config`: 보안, CORS, 외부 연동 설정
- `controller`: REST API 요청 처리
- `service`: 비즈니스 로직
- `repository`: DB 접근
- `dto`: Request/Response 객체
- `entity`: DB 테이블 매핑
- `scheduler`: 정기 실행 작업
- `notification`: 알림 생성/조회 로직
- `chatbot`: 챗봇 관련 로직
- `exception`: 공통 예외 처리

작성 기준:

- Controller는 요청/응답과 검증만 담당합니다.
- Service에 핵심 로직을 둡니다.
- Repository는 DB 접근만 담당합니다.
- Entity를 API 응답으로 직접 반환하지 않고 DTO를 사용합니다.
- 민감 정보는 코드에 직접 작성하지 않고 환경 변수 또는 설정 파일로 분리합니다.

## Backend Python

기준 위치:

```text
code/backend/src/main/python
```

현재 Python 영역은 크롤링, 분석, 상품명 매칭 파이프라인을 담당합니다.

- `crawling`: 플랫폼 크롤링 스크립트, 키워드 목록, 원본 결과 CSV
- `analysis`: 크롤링 결과 검증, 가격 이상치, 토큰 분석
- `config`: 상품명 매칭 사전, 카테고리 규칙, 제외 토큰 CSV
- `preprocessing`: DB 저장 전 전처리 스크립트 위치
- `api_server.py`: Python 파이프라인 확인용 FastAPI 서버
- `hama_data_pipeline.py`: 상품명 매칭/카테고리 배정 파이프라인
- `product_matching.py`: 상품명 정규화와 토큰 매칭 보조 로직

작성 기준:

- 크롤링 원본 결과는 `crawling/results`에 보관합니다.
- 분석 결과는 `analysis/results`에 보관합니다.
- 서비스 실행 코드와 검토용 노트북/분석 스크립트는 분리합니다.
- DB 저장 전에는 가격, 날짜, 상태값, 중복 상품을 정리합니다.

## Frontend

기준 위치:

```text
code/frontend/Hama/src
```

현재 프론트엔드는 Vite + React + TypeScript 기반입니다.

- `AppRoot.tsx`: 앱 최상위 화면 구성
- `main.tsx`: React 렌더링 진입점
- `components`: 재사용 UI 컴포넌트
- `pages`: 화면 단위 컴포넌트
- `api`: API 호출 또는 데이터 접근 함수
- `queries`: React Query 기반 데이터 조회 로직
- `lib`: 공통 클라이언트/라이브러리 설정
- `data`: 화면용 정적 데이터
- `types`: TypeScript 타입
- `utils`: 공통 유틸리티
- `styles`: 공통 스타일 유틸

작성 기준:

- 여러 화면에서 쓰는 UI는 `components`에 둡니다.
- 화면 단위 컴포넌트는 `pages`에 둡니다.
- 서버 데이터 접근은 `api` 또는 `queries`로 분리합니다.
- 여러 파일에서 공유하는 타입은 `types`에 둡니다.
- 화면 표시용 포맷팅은 `utils`에 둡니다.

## DB 문서

`docs/db_schema.sql`은 현재 Oracle 계열 문법을 기준으로 작성되어 있습니다.

PostgreSQL 또는 Supabase에 적용할 경우 아래 항목을 변환해야 합니다.

- `NUMBER` -> `BIGINT`, `INTEGER`, `NUMERIC` 등
- `VARCHAR2` -> `VARCHAR`
- `SYSDATE` -> `CURRENT_TIMESTAMP`
- 시퀀스/자동 증가 전략 별도 정의

Entity 작성 시에는 실제 사용하는 DB 문법과 `db_schema.sql`의 컬럼명이 일치하는지 확인해야 합니다.

## 제출용 Spring Boot 프로젝트

`정지원_boot` 폴더는 별도 제출용 Spring Boot REST API 프로젝트입니다.

메인 프로젝트 코드와 섞이지 않도록 `정지원_boot` 폴더 안에서만 실행하고 관리합니다.
