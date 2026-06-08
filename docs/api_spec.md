# API 명세서

현재 프론트 MVP가 기본 호출하는 API는 `code/backend/src/main/python/api_server.py`의 FastAPI 서버입니다. Spring Boot API는 `code/backend` Gradle 프로젝트로 통합되어 있으며, Java 소스는 `code/backend/src/main/java/com/used/service`에 있습니다.

## 현재 API 구성

- MVP 상품 API: `code/backend/src/main/python/api_server.py`
- FastAPI 기본 주소: `http://127.0.0.1:8000`
- Spring Boot 기본 주소: `http://127.0.0.1:8080`
- 프론트 개발 서버: `/api` 요청을 `http://127.0.0.1:8000`으로 프록시
- 데이터 소스: Supabase 환경변수가 있으면 Supabase, 없으면 `crawling/results` 최신 CSV fallback
- 인증: 현재 MVP 상품 API는 인증을 요구하지 않습니다.

## FastAPI MVP

### Health Check

```http
GET /api/health
```

응답 예시:

```json
{
  "status": "ok",
  "dataSource": "supabase"
}
```

`dataSource`는 환경 설정에 따라 `supabase` 또는 `csv`가 됩니다.

### 상품 검색

```http
GET /api/products/search?q=아이폰&platforms=번개장터,중고나라&sort=recent&page=1&limit=16
```

Query parameter:

- `q`: 검색어입니다. 기본값은 빈 문자열입니다.
- `platforms`: 쉼표로 구분한 플랫폼 필터입니다. 비어 있으면 전체 플랫폼을 조회합니다.
- `sort`: 정렬 기준입니다. 프론트에서 `recent`, `price_asc`, `price_desc`, `relevance` 계열로 호출합니다.
- `page`: 1부터 시작하는 페이지 번호입니다.
- `limit`: 페이지당 개수입니다. API 허용 범위는 1~5000입니다.

응답 구조:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 16,
  "summary": {
    "lowestPrice": 0,
    "averagePrice": 0,
    "updatedAt": "2026-06-08T00:00:00"
  }
}
```

### 추천 상품

```http
GET /api/products/recommended?limit=16
```

Query parameter:

- `limit`: 추천 상품 개수입니다. API 허용 범위는 1~32입니다.

응답 구조:

```json
{
  "items": [],
  "total": 0,
  "limit": 16,
  "summary": {
    "lowestPrice": 0,
    "averagePrice": 0,
    "updatedAt": "2026-06-08T00:00:00"
  }
}
```

현재 추천은 로드된 상품 중 무작위 샘플링입니다.

### 상품 상세

```http
GET /api/products/{platform}/{pid}
```

Path parameter:

- `platform`: 플랫폼명입니다. 예: `번개장터`, `중고나라`
- `pid`: 플랫폼 원본 상품 ID입니다.

응답:

- 검색 API의 상품 객체 1개를 반환합니다.
- 저장된 `description`이 없으면 일부 외부 상세 페이지에서 설명을 가져오려고 시도합니다.

에러:

```json
{
  "detail": "상품을 찾을 수 없습니다."
}
```

- 상품을 찾지 못하면 `404`를 반환합니다.
- Supabase 조회 중 문제가 있으면 `502`를 반환합니다.

## 프론트 연동 상태

현재 `code/frontend/Hama/src/api/products.ts`와 `queries/productQueries.ts`는 아래 상품 API를 사용합니다.

```http
GET /api/products/search
GET /api/products/recommended
GET /api/products/{platform}/{pid}
```

아래 기능은 프론트 UI 또는 로컬스토리지 기반으로 동작하며, 아직 계정 기반 API와 직접 연결되지 않았습니다.

- 로그인/회원가입
- 찜 목록 서버 저장
- 최근 본 상품 서버 저장
- 알림 생성/읽음 처리
- 가격 비교 리스트 서버 저장
- 관리자 대시보드 데이터
- 챗봇 메시지

## Spring Boot 통합 API

Spring Boot 구현은 `code/backend`에 통합되어 있습니다. 실행에는 PostgreSQL 연결 정보와 `GEMINI_API_KEY`가 필요합니다.

구현된 API 영역:

- Auth: `/api/auth/signup`, `/api/auth/login`, `/api/auth/password/reset-request`
- Product: `/api/products/search`, `/api/products/recommended`, `/api/products/{platform}/{pid}`
- MyPage: 프로필, 찜, 알림, 키워드 알림, 최근 본 상품 관련 API
- Chatbot: `/api/chatbot/message`, `/api/chatbot/history/recent`
- User: `/api/me`

주의:

- Python FastAPI와 동시 실행할 수 있도록 Spring 기본 포트는 `8080`으로 분리했습니다.
- 현재 프론트 MVP의 기본 프록시는 Python FastAPI를 대상으로 합니다.

## 향후 API 문서 작성 기준

새 API를 구현하거나 기존 API를 바꾸면 아래 항목을 함께 기록합니다.

- URL
- HTTP Method
- 인증 필요 여부
- Request Parameter
- Request Body
- Response Body
- 에러 응답
- 프론트 사용 위치
