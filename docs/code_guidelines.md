# 프로젝트 구조 및 작성 기준

이 문서는 현재 프로젝트에서 코드를 작성할 위치와 문서 관리 기준을 정리합니다.

## Backend Java

기준 위치:

```text
code/backend/src/main/java/com/used/service
```

현재 Java 백엔드는 `code/backend`의 Spring Boot 프로젝트로 통합되어 있습니다. 기능 추가 시 아래 기준으로 작성합니다.

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

현재 Python 영역은 MVP 상품 API, 크롤링 입력값, 분석, 상품명 매칭 파이프라인, Supabase 적재를 담당합니다.

- `crawling`: 키워드 목록, 블랙리스트 설정, 키워드 갱신 스크립트
- `analysis`: 크롤링 결과 검증, 가격 이상치, 토큰 분석
- `config`: 상품명 매칭 사전, 카테고리 규칙, 제외 토큰 CSV
- `lib`: 상품명 매칭·전처리·rating·Supabase 조회 핵심 모듈
- `tools`: 스키마 적용, ERD·설정 참고 CSV 생성 유틸
- `api_server.py`: 로컬 MVP 상품 검색/추천/상세 FastAPI 서버 (`127.0.0.1:8000`)
- `lib/hama_data_pipeline.py`: 상품명 매칭/카테고리 배정 파이프라인
- `lib/keyword_preprocessing.py`: keyword_final 전처리·클러스터 규칙
- `lib/product_matching.py`: 상품명 정규화와 토큰 매칭 보조 로직
- `lib/supabase_repository.py`: Supabase 상품 조회와 CSV fallback을 분리하는 저장소 모듈
- `tools/apply_supabase_schema.py`: Supabase/PostgreSQL 스키마 적용 스크립트
- `import_csv_to_supabase.py`: 크롤링 CSV를 Supabase 테이블로 적재하는 스크립트

### `code/supabase/migrations`

Supabase/PostgreSQL 테이블 생성 migration을 관리합니다.

현재 작성된 파일:

- `20260519000000_hama_schema.sql`: Hama MVP Supabase 스키마

### `backend/src/main/python/lib`

Python 기반 데이터 전처리·매칭·rating 로직을 관리합니다.

주요 모듈:

- `lib/keyword_preprocessing.py`: 블랙리스트, 가격 이상치, 클러스터 전처리 (`keyword_final.ipynb` 규칙)
- `lib/item_rating.py`: `items.rating` 및 파생 점수 계산
- `item_rating.py`: `items.rating` 계산 공식

작성 기준:

- 크롤링 원본 결과는 `crawling/results`에 보관합니다. 이 폴더는 대용량 로컬 결과물이라 Git 추적 대상에서 제외될 수 있습니다.
- 과거/실험용 크롤링 스크립트는 `crawling/archive`에 둘 수 있지만 제출 대상인지 별도로 확인합니다.
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
- `hooks`: 화면 상태와 브라우저 동작을 분리한 React hook
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

`docs/db_schema.sql`은 라이브 Supabase(PostgreSQL) DB 기준 DDL 정리본입니다. ERD는 `docs/db_erd.md`, 적용 이력은 `code/supabase/migrations/*.sql`이 기준입니다.

Entity 작성 시에는 `db_schema.sql`의 테이블/컬럼명과 일치하는지 확인해야 합니다.

## Spring Boot 실행 기준

Spring Boot 프로젝트 루트는 `code/backend`입니다.

기본 설정:

- 패키지명: `com.used.service`
- 기본 포트: `8080`
- 설정 파일: `code/backend/src/main/resources/application.yaml`
- 환경변수 예시: `code/backend/.env.example`

현재 프론트 MVP는 기본적으로 Python FastAPI를 호출합니다. Spring API로 전환하려면 Vite 프록시, CORS, 인증 쿠키 처리를 별도 작업으로 맞춥니다.
