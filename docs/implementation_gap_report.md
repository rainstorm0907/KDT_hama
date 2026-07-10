# 미구현 및 연동 전 항목 점검 보고서

작성일: 2026-06-08

이 문서는 현재 로컬 저장소 기준으로 확인한 미구현, 임시 구현, 연동 전, 검증 필요 항목을 정리합니다.

## 전체 요약

현재 프로젝트는 상품 검색 MVP를 Python FastAPI와 React 프론트로 시연할 수 있는 상태입니다. 다만 Spring Boot 통합 백엔드, 계정 기능, 마이페이지 서버 저장, 알림, 관리자, 챗봇 실연동, 전처리/DB 적재 자동화는 아직 완성 전입니다.

우선 처리 순서는 다음을 권장합니다.

1. Spring 인코딩 깨짐 복구
2. `gradle-wrapper.jar` 복구 또는 Gradle 설치 후 빌드 확인
3. Spring DB 스키마와 Supabase/PostgreSQL 구조 정합성 확보
4. 프론트 인증/API 프록시를 Spring `8080` 기준으로 연결
5. 분석 결과의 운영 반영 범위 확대 (`lib/keyword_preprocessing.py`는 이미 API·파이프라인에 연동됨)

## 가장 급한 문제

### Spring Boot 빌드 검증 불가

`code/backend` Spring Boot 프로젝트는 현재 빌드 검증이 막혀 있습니다.

- `code/backend/gradle/wrapper/gradle-wrapper.jar`가 없습니다.
- 시스템 `gradle`도 설치되어 있지 않아 `gradle -v`가 실패합니다.
- `gradlew.bat --version`은 `Unable to access jarfile ... gradle-wrapper.jar`로 실패합니다.

### Spring Java 인코딩 깨짐

Spring Java 파일 일부에 한글 인코딩 깨짐이 있어 컴파일 오류가 발생할 가능성이 큽니다.

위험 파일 예시:

- `code/backend/src/main/java/com/used/service/chatbot/entity/Item.java`
- `code/backend/src/main/java/com/used/service/chatbot/repository/ItemRepository.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/RecommendationService.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/FaqService.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/ChatbotTemplateService.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/GeminiClientService.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/GamePerformanceResolver.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/PersonalProductContextService.java`
- `code/backend/src/main/java/com/used/service/chatbot/service/PriceAdviceService.java`

### DB 스키마 불일치

Spring JPA 엔티티, Supabase migration, 문서의 Oracle 기준 DDL이 서로 완전히 일치하지 않습니다.

- Spring은 `USERS`, `NOTIFICATIONS`, `KEYWORD_ALERTS`, `ITEM_VIEWS` 등 테이블을 기대합니다.
- Supabase migration은 `auth.users` 기반 UUID 사용자와 MVP 상품 테이블 중심입니다.
- Spring은 사용자 ID를 `Long`으로 다루지만 Supabase는 `uuid`를 사용합니다.
- Spring 엔티티 일부는 sequence 기반 ID를 기대하지만 Supabase는 identity 컬럼을 사용합니다.

## Backend / Spring 미구현

Spring Boot 코드는 `code/backend`로 통합되었지만 아래 항목은 아직 미완성입니다.

- `exception` 패키지는 공통 예외 처리 구현이 없습니다.
- `scheduler` 패키지는 정기 작업 구현이 없습니다.
- `notification` 전용 패키지는 실질 구현이 없습니다.
- 비밀번호 재설정은 응답만 있고 메일 발송, 토큰 발급, 토큰 검증 로직이 없습니다.
- OAuth2 경로는 열려 있지만 실제 OAuth 설정과 컨트롤러가 없습니다.
- `UserDetailsService` 구현이 2개라 Spring 기동 시 빈 충돌 가능성이 있습니다.
- `GEMINI_API_KEY`가 없으면 Gemini 설정에서 애플리케이션 기동이 실패할 수 있습니다.
- `/api/health`는 FastAPI에만 있고 Spring에는 없습니다.
- 상품 API는 FastAPI와 Spring 양쪽에 있으나 정렬 기준, 에러 응답, 추천 로직, 날짜 형식이 다릅니다.
- `QueryDSL`, `Thymeleaf` 의존성은 선언되어 있지만 현재 코드에서 핵심적으로 사용되지 않습니다.

## Frontend 미구현

프론트는 UI 흐름은 갖춰졌지만 계정 기반 기능은 대부분 임시 구현입니다.

### 인증 / 계정

- `AuthModal.tsx`의 로그인, 회원가입, 비밀번호 찾기는 실제 API 대신 시뮬레이션으로 동작합니다.
- 로그인 상태는 `AppRoot.tsx`의 `useState` 기반이라 새로고침하면 사라집니다.
- 관리자 여부는 실제 권한 API가 아니라 로그인 여부에 가깝게 처리됩니다.
- `/admin`, `/mypage` 라우트 보호가 없습니다.
- OAuth URL은 Vite `/api` 프록시와 별도로 동작하므로 추가 설정이 필요합니다.

### 상품 / 검색

- 상품 검색, 추천, 상세 API는 연결되어 있습니다.
- 인기 검색어는 하드코딩입니다.
- 최근 검색어는 `localStorage` 기반입니다.
- 플랫폼 필터 목록은 검색 API의 facet 응답이 아니라 고정값입니다.
- 검색어가 없을 때 기본 검색어가 사용됩니다.

### 찜 / 알림 / 가격 비교

- 찜 목록, 최근 본 상품, 가격 비교 리스트는 `localStorage` 기반입니다.
- 알림 on/off 상태 일부는 React state 기반이라 새로고침하면 사라집니다.
- 사이드 알림은 실제 알림 API가 아니라 찜 상품을 알림처럼 보여주는 구조입니다.
- 가격 비교 그래프는 전용 시세 API가 아니라 상품 응답의 `priceHistory`에 의존합니다.
- 키워드별 30일 시세 API는 아직 없습니다.

### 챗봇

- `SideChatbotButton.tsx`는 `/api/chatbot/message`를 호출합니다.
- 현재 Vite 기본 프록시는 Python FastAPI `8000`을 향하므로 Spring `8080`의 챗봇 API와 연결되지 않습니다.
- 챗봇 이력 조회, 상품 클릭 기록 API는 프론트에서 아직 사용하지 않습니다.
- Spring 챗봇 API는 인증이 필요하므로 세션/쿠키 연동이 필요합니다.

### 관리자

- `AdminPage.tsx`는 목데이터 기반 UI입니다.
- KPI, 이상 데이터, 유저 목록, 검색 흐름 데이터는 실제 API와 연결되지 않았습니다.
- 필터와 검색 버튼은 표시 중심이며 실제 백엔드 조회 로직이 없습니다.

### 테스트

- 프론트 단위 테스트와 E2E 테스트 파일이 없습니다.
- `package.json`에 test script가 없습니다.
- API 응답은 런타임 검증 없이 TypeScript 타입으로 캐스팅합니다.

## Python / 데이터 파이프라인 미구현

Python 영역은 MVP API와 분석 도구는 있지만 크롤링부터 운영 적재까지 연결되지 않은 구간이 있습니다.

### 크롤링

- 주요 크롤러 본체는 `crawling/archive` 또는 로컬 ignore 영역에 있는 것으로 보이며 Git 기준으로는 없습니다.
- 추적되는 `crawling/` 파일은 `keyword_list.csv`, `blacklist_keywords.csv`, `blacklist_tokens.csv`, `update_keyword_list.py` 중심입니다.
- `update_keyword_list.py`는 운영 키워드 갱신보다 테스트용 키워드 CSV 생성에 가깝습니다.

### 전처리

- `lib/keyword_preprocessing.py`에 `keyword_final.ipynb` 규칙(블랙리스트, IQR 가격 이상치, 클러스터 전처리)이 반영되어 `lib/hama_data_pipeline.py`·`api_server.py`에서 사용됩니다.
- `HamaCollectionPipeline`의 중고나라/번개장터 fetch 함수는 TODO 상태이며 빈 리스트를 반환합니다.
- ML 카테고리 분류기는 stub 상태입니다.

### 블랙리스트 / 분석 반영

- `blacklist_keywords.csv`는 `lib/keyword_preprocessing.py` → `lib/hama_data_pipeline.py`에 연결되어 있습니다.
- 분석 결과인 `price_outliers`, `title_keyword_accuracy`, `bracket_clusters`는 검증용 CSV로 남아 있으며, Supabase 적재 필터와의 자동 동기화는 아직 없습니다.
- 가격 이상치 분석 노트북의 필터 조건 일부는 노트북 내부 하드코딩입니다.
- 분석 기준 CSV가 시점별로 섞여 있어 재현성 검증이 필요합니다.

### Supabase

- Python 적재는 `items`(`platform_name` 포함), `price_history` 중심입니다.
- `wishlists`, `search_logs`, `search_rankings`, `user_preferences`, `banners`, `chat_history`, `chat_faq`, `recommended_items`는 Python 적재/조회와 직접 연결되지 않았습니다.
- `tools/apply_supabase_schema.py`는 migration 이력 테이블 없이 SQL 파일 전체를 실행합니다.
- `import_csv_to_supabase.py`는 `--use-cluster-preview`로 `keyword_final.ipynb` 결과를 적재하거나, 크롤링 원본 CSV를 직접 적재할 수 있습니다.
- Supabase 설정이 없으면 FastAPI는 CSV fallback으로 동작하므로, 실제 DB 데이터와 API 데이터 소스가 달라질 수 있습니다.

## 주요 미연결 API

프론트에서 필요하거나 주석으로 언급되었지만 아직 미연결 또는 경로 정합이 필요한 API입니다.

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/password/reset-request`
- `GET /api/me`
- `GET /api/search/popular`
- `GET/DELETE /api/users/me/recent-searches`
- `PATCH /api/users/me/password`
- `DELETE /api/users/me`
- `GET/PATCH /api/mypage/notifications`
- `GET/POST/DELETE /api/mypage/keyword-alerts`
- `GET /api/chatbot/history/recent`
- `POST /api/chatbot/items/{itemId}/click`
- 관리자 대시보드용 API
- 키워드별 30일 가격 시계열 API

## 우선순위 제안

### 1단계: Spring 빌드 가능 상태 만들기

- 깨진 Java 파일 인코딩 복구
- `gradle-wrapper.jar` 복구 또는 Gradle 설치
- `./gradlew build` 또는 `gradlew.bat build` 실행
- `UserDetailsService` 빈 충돌 정리
- `GEMINI_API_KEY` 미설정 시 테스트가 깨지지 않도록 설정 분리

### 2단계: DB 기준 통일

- Spring JPA 엔티티 기준으로 PostgreSQL/Supabase migration을 확장할지 결정
- 또는 Supabase migration 기준으로 Spring 엔티티를 수정할지 결정
- 사용자 ID 타입을 `Long` 또는 `uuid` 중 하나로 통일
- `ddl-auto: none` 기준으로 필요한 DDL을 명확히 작성

### 3단계: 프론트 연동

- `src/api/auth.ts`, `src/api/mypage.ts`, `src/api/chatbot.ts` 추가
- Vite 프록시에서 FastAPI와 Spring API 라우팅 전략 결정
- 세션 쿠키 사용 시 `credentials: include` 처리
- 로그인 상태 복구 API 연결
- 관리자 권한 확인 API 연결

### 4단계: 데이터 파이프라인 완성

- `HamaCollectionPipeline` 크롤러 fetch 연동
- 분석 결과 CSV를 Supabase 적재 필터와 자동 동기화
- 분석 결과를 운영 필터로 반영 (블랙리스트·클러스터 규칙은 `lib/keyword_preprocessing.py`에 반영 완료)
- Supabase 적재 후 row count, 샘플 조회, `/api/health` 검증 절차 작성

### 5단계: 테스트와 문서 보강

- Spring 빌드/테스트 실행 방법 정리
- 프론트 test script 추가 여부 검토
- API 계약 문서에 FastAPI/Spring 차이와 전환 기준 명시
- DB schema 문서와 migration 원본의 역할 정리
