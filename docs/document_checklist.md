# 구현 파일 작성 체크리스트

이 문서는 `backend`와 `frontend`에 실제 코드 파일이 작성되었는지 확인하기 위한 체크리스트입니다. `docs` 폴더에 보관하지만, 체크 대상은 문서 파일이 아니라 구현 파일입니다.

## 사용 방법

- 실제 기능 코드가 작성된 파일은 `[x]`로 체크합니다.
- 체크된 항목의 날짜는 실제 코드 파일이 Git에 처음 기록된 날짜를 기준으로 작성합니다.
- 폴더만 있고 `.gitkeep`만 있는 경우는 아직 구현 파일이 없는 상태이므로 `[ ]`로 둡니다.
- 새 파일을 만들면 올바른 위치에 있는지 확인한 뒤 체크 항목을 추가합니다.
- 기능 코드가 들어간 폴더의 `.gitkeep`은 삭제해도 됩니다.

## 전체 진행 상태

- [ ] Backend Java 기본 구조 구현
- [x] Backend Python 크롤링 파일 작성 (작성일: 2026-04-21 ~ 2026-04-29)
- [ ] Backend Python 전처리 파일 작성
- [x] Frontend Hama Vite 실행 진입 파일 구성 (작성일: 2026-04-30)
- [x] Frontend 기본 App 컴포넌트 작성 (작성일: 2026-04-30)
- [x] Frontend 홈 화면 공통 컴포넌트 작성 (작성일: 2026-04-30)
- [x] Frontend 목 데이터와 타입 파일 작성 (작성일: 2026-04-30)
- [ ] Frontend API, 훅, 라우팅, 전역 상태 관리 파일 작성

## Backend Java

기준 위치: `code/backend/src/main/java/com/used/service`

### `config`

- [ ] `SecurityConfig.java`: 인증, 인가, 비밀번호 암호화 설정
- [ ] `CorsConfig.java`: 프론트엔드 요청 허용 설정
- [ ] `WebConfig.java`: 공통 Web MVC 설정
- [ ] `SupabaseConfig.java`: Supabase 연동이 필요할 경우 설정

현재 상태:

- [ ] `config` 폴더에는 아직 `.gitkeep`만 있음

### `controller`

- [ ] `UserController.java`: 회원가입, 로그인, 회원 정보 API
- [ ] `ItemController.java`: 상품 검색, 목록, 상세 API
- [ ] `WishController.java`: 찜 등록, 취소, 목록 API
- [ ] `RecommendationController.java`: 추천 상품 API
- [ ] `NotificationController.java`: 알림 조회, 읽음 처리 API
- [ ] `ChatbotController.java`: 챗봇 요청 API

현재 상태:

- [ ] `controller` 폴더에는 아직 `.gitkeep`만 있음

### `service`

- [ ] `UserService.java`: 회원 관련 비즈니스 로직
- [ ] `ItemService.java`: 상품 조회, 검색 로직
- [ ] `WishService.java`: 찜 기능 로직
- [ ] `RecommendationService.java`: 맞춤 추천 로직
- [ ] `NotificationService.java`: 알림 생성, 조회, 읽음 처리 로직
- [ ] `ChatbotService.java`: 챗봇 응답 처리 로직

현재 상태:

- [ ] `service` 폴더에는 아직 `.gitkeep`만 있음

### `repository`

- [ ] `UserRepository.java`: 사용자 테이블 접근
- [ ] `ItemRepository.java`: 상품 테이블 접근
- [ ] `WishRepository.java`: 찜 테이블 접근
- [ ] `SearchLogRepository.java`: 검색 로그 테이블 접근
- [ ] `RecommendationRepository.java`: 추천 상품 테이블 접근
- [ ] `NotificationRepository.java`: 알림 관련 테이블 접근

현재 상태:

- [ ] `repository` 폴더에는 아직 `.gitkeep`만 있음

### `dto`

- [ ] `UserRequestDto.java`: 회원가입, 로그인 요청 데이터
- [ ] `UserResponseDto.java`: 사용자 응답 데이터
- [ ] `ItemResponseDto.java`: 상품 응답 데이터
- [ ] `WishResponseDto.java`: 찜 목록 응답 데이터
- [ ] `RecommendationResponseDto.java`: 추천 상품 응답 데이터
- [ ] `ErrorResponseDto.java`: 공통 에러 응답 데이터

현재 상태:

- [ ] `dto` 폴더에는 아직 `.gitkeep`만 있음

### `entity`

- [ ] `User.java`: 사용자 테이블 매핑
- [ ] `Platform.java`: 플랫폼 테이블 매핑
- [ ] `Item.java`: 상품 테이블 매핑
- [ ] `PriceHistory.java`: 가격 이력 테이블 매핑
- [ ] `Wishlist.java`: 찜 테이블 매핑
- [ ] `SearchLog.java`: 검색 로그 테이블 매핑
- [ ] `SearchRanking.java`: 검색 순위 테이블 매핑
- [ ] `UserPreference.java`: 사용자 선호 태그 테이블 매핑
- [ ] `Banner.java`: 배너 테이블 매핑
- [ ] `ChatHistory.java`: 챗봇 대화 내역 테이블 매핑
- [ ] `ChatFaq.java`: 챗봇 FAQ 테이블 매핑
- [ ] `RecommendedItem.java`: 추천 상품 연결 테이블 매핑

현재 상태:

- [ ] `entity` 폴더에는 아직 `.gitkeep`만 있음

### `scheduler`

- [ ] `PriceUpdateScheduler.java`: 상품 가격 갱신 작업
- [ ] `LowestPriceAlertScheduler.java`: 최저가 알림 작업
- [ ] `SearchRankingScheduler.java`: 검색 순위 집계 작업

현재 상태:

- [ ] `scheduler` 폴더에는 아직 `.gitkeep`만 있음

### `notification`

- [ ] `NotificationService.java`: 알림 생성, 조회, 읽음 처리
- [ ] `NotificationType.java`: 알림 종류 정의

현재 상태:

- [ ] `notification` 폴더에는 아직 `.gitkeep`만 있음

### `chatbot`

- [ ] `ChatbotService.java`: 챗봇 응답 처리
- [ ] `ChatbotPromptBuilder.java`: 챗봇 프롬프트 생성
- [ ] `ChatbotController.java`: 챗봇 API 요청 처리

현재 상태:

- [ ] `chatbot` 폴더에는 아직 `.gitkeep`만 있음

### `exception`

- [ ] `GlobalExceptionHandler.java`: 공통 예외 처리
- [ ] `ErrorCode.java`: 에러 코드 정의
- [ ] `BusinessException.java`: 비즈니스 예외 정의

현재 상태:

- [ ] `exception` 폴더에는 아직 `.gitkeep`만 있음

### `resources`

기준 위치: `code/backend/src/main/resources`

- [x] `application.yml`: Spring Boot 설정 파일 생성 (작성일: 2026-04-29)
- [ ] DB 연결 정보 환경 변수 처리 확인
- [ ] JWT Secret 등 민감 정보 직접 기입 여부 확인

## Backend Python

기준 위치: `code/backend/src/main/python`

### `crawling`

- [x] `crawling_20260429.py`: 크롤링 스크립트 작성 (작성일: 2026-04-29)
- [x] `keyword_list.csv`: 크롤링 키워드 목록 작성 (작성일: 2026-04-29)
- [x] `archive/integrated_crawling_initial.py`: 초기 크롤링 코드 보관 (작성일: 2026-04-21)
- [ ] 크롤링 결과 저장 방식 정리
- [ ] DB 저장 연동 방식 정리

### `preprocessing`

- [ ] 중복 상품 제거 스크립트 작성
- [ ] 가격, 날짜, 상태값 정규화 스크립트 작성
- [ ] DB 저장 전 데이터 검증 스크립트 작성

현재 상태:

- [ ] `preprocessing` 폴더에는 아직 `.gitkeep`만 있음

### Python 의존성

- [x] `requirements.txt`: Python 패키지 목록 파일 생성 (작성일: 2026-04-29)
- [ ] 실제 실행에 필요한 패키지 목록 최신화

## Frontend

기준 위치: `code/frontend/Hama`

### Vite 실행 기본 파일

- [x] `package.json`: 프론트엔드 의존성 및 실행 스크립트 (작성일: 2026-04-30)
- [x] `package-lock.json`: npm 의존성 잠금 파일 (작성일: 2026-04-30)
- [x] `index.html`: Vite HTML 진입 파일 (작성일: 2026-04-30)
- [x] `src/main.tsx`: React 렌더링 진입 파일 (작성일: 2026-04-30)
- [x] `vite.config.ts`: Vite 설정 파일 (작성일: 2026-04-30)
- [x] `tsconfig.json`: TypeScript 공통 설정 파일 (작성일: 2026-04-30)
- [x] `tsconfig.app.json`: 앱 빌드용 TypeScript 설정 파일 (작성일: 2026-04-30)
- [x] `tsconfig.node.json`: Node/Vite 설정용 TypeScript 설정 파일 (작성일: 2026-04-30)
- [x] `eslint.config.js`: ESLint 설정 파일 (작성일: 2026-04-30)

### `src/App.tsx`

- [x] `src/App.tsx`: 앱 최상위 컴포넌트 작성 (작성일: 2026-04-30)
- [x] 검색 패널 열림/닫힘 상태 관리 (작성일: 2026-04-30)
- [x] 선택된 카테고리 상태 관리 (작성일: 2026-04-30)
- [x] Header, SearchPanel, HeroBanner, CategoryGrid, ProductGrid, Footer 연결 (작성일: 2026-04-30)
- [ ] API 연동 후 목 데이터 의존성 제거 또는 fixture 분리

### `src/components`

- [x] `Header.tsx`: 상단 로고와 메뉴 영역 (작성일: 2026-04-30)
- [x] `SearchPanel.tsx`: 검색 입력창과 최근 검색어 패널 (작성일: 2026-04-30)
- [x] `HeroBanner.tsx`: 홈 배너 영역 (작성일: 2026-04-30)
- [x] `CategoryGrid.tsx`: 카테고리 선택 그리드 (작성일: 2026-04-30)
- [x] `ProductGrid.tsx`: 추천 상품 목록 그리드 (작성일: 2026-04-30)
- [x] `Footer.tsx`: 하단 정보 영역 (작성일: 2026-04-30)
- [ ] 로그인/회원가입 UI가 필요하면 별도 컴포넌트 또는 페이지로 추가
- [ ] 마이페이지 UI가 필요하면 별도 컴포넌트 또는 페이지로 추가

### `src/data`

- [x] `catalog.ts`: 카테고리, 추천 상품, 최근 검색어 목 데이터 (작성일: 2026-04-30)
- [ ] 백엔드 API 연동 시 데이터 대체 방식 정리

### `src/types`

- [x] `catalog.ts`: `Category`, `Product` 타입 정의 (작성일: 2026-04-30)
- [ ] API 응답 타입 추가 필요 여부 확인

### 스타일 파일

- [x] `src/index.css`: 전역 스타일 (작성일: 2026-04-30)
- [x] `src/App.css`: 앱 화면 스타일 (작성일: 2026-04-30)
- [ ] 디자인 토큰 또는 공통 변수 분리 필요 여부 확인

### 정적 파일

- [x] `public/hamalogo.png`: 서비스 로고 (작성일: 2026-04-30)
- [x] `public/hama_lowban1.jpg`: 홈 배너 이미지 (작성일: 2026-04-30)
- [x] `public/favicon.svg`: 파비콘 (작성일: 2026-04-30)
- [x] `public/icons.svg`: 아이콘 리소스 (작성일: 2026-04-30)

### 아직 없는 기능/폴더

- [ ] `src/api`: 백엔드 API 연동 모듈
- [ ] `src/hooks`: 반복 상태 로직용 커스텀 훅
- [ ] `src/pages`: 라우팅 단위 페이지가 필요해질 경우 추가
- [ ] `src/routes`: React Router 도입 시 라우팅 설정
- [ ] `src/contexts`: 전역 상태가 필요해질 경우 추가
- [ ] `src/assets`: import 기반 에셋 관리가 필요해질 경우 추가

## 새 구현 파일을 추가할 때

- [ ] `requirements.md`의 폴더 기준에 맞는 위치인지 확인
- [ ] 이 체크리스트에 파일명을 추가
- [ ] 실제 기능 코드가 작성되면 체크
- [ ] 해당 폴더의 `.gitkeep` 필요 여부 확인
- [ ] API, DB, 화면 구조가 바뀌면 관련 문서도 함께 갱신
