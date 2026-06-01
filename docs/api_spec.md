# API 명세서

현재 메인 백엔드 위치인 `code/backend/src/main/java/com/used/service`에는 실제 REST API 구현 파일이 아직 없습니다.

따라서 이 문서는 현재 구현 상태와 작성 예정 API를 구분해서 정리합니다.

## 현재 상태

- 메인 Spring Boot API: 미구현
- Python 파이프라인 확인용 FastAPI: `code/backend/src/main/python/api_server.py`
- 별도 제출용 Spring Boot API: `정지원_boot`

## 메인 백엔드 작성 예정 API

### 사용자

- 회원가입
- 로그인
- 사용자 정보 조회
- 사용자 정보 수정

### 상품

- 상품 목록 조회
- 상품 상세 조회
- 키워드 기반 상품 검색
- 가격 대시보드 조회

### 찜 / 알림

- 찜 등록
- 찜 삭제
- 찜 목록 조회
- 목표가 알림
- 최저가 알림

### 검색 / 추천

- 최근 검색어 조회
- 인기 검색어 조회
- 검색 이벤트 저장
- 맞춤 추천 상품 조회

### 챗봇

- 챗봇 메시지 전송
- 챗봇 추천 상품 조회

## 별도 제출용 API

`정지원_boot` 폴더에는 크롤링 매물 저장/조회용 Spring Boot REST API가 구현되어 있습니다.

### 매물 저장

```http
POST /api/crawling/items
```

### 매물 목록 조회

```http
GET /api/crawling/items?keyword=갤럭시&platformName=번개장터&limit=30
```

### 매물 상세 조회

```http
GET /api/crawling/items/{itemId}
```

## API 문서 작성 기준

실제 API를 구현하면 아래 항목을 함께 기록합니다.

- URL
- HTTP Method
- 인증 필요 여부
- Request Parameter
- Request Body
- Response Body
- 에러 응답
