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
- [x] Backend Python 파이프라인/API/설정 파일 작성 (작성일: 2026-05-21)
- [x] Backend Python 분석용 스크립트 작성 (작성일: 2026-05-21)
- [ ] Backend Python 전처리 파일 작성
- [x] Frontend Hama Vite 실행 진입 파일 구성 (작성일: 2026-04-30)
- [x] Frontend 기본 App 컴포넌트 작성 (작성일: 2026-04-30)
- [x] Frontend 홈 화면 공통 컴포넌트 작성 (작성일: 2026-04-30)
- [x] Frontend 목 데이터와 타입 파일 작성 (작성일: 2026-04-30)
- [x] Frontend API 모듈과 페이지 파일 작성 (작성일: 2026-05-21)
- [ ] Frontend 훅, 라우팅 라이브러리, 전역 상태 관리 파일 작성

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
- [ ] `SearchLogRepository.java`: 기존 검색 로그 테이블 접근
- [ ] `SearchEventRepository.java`: 검색/노출/클릭 이벤트 테이블 접근
- [ ] `ItemSearchMatchRepository.java`: 상품-검색어 매칭 테이블 접근
- [ ] `ItemViewRepository.java`: 최근 본 상품 테이블 접근
- [ ] `PriceStatsDailyRepository.java`: 일별 가격 통계 테이블 접근
- [ ] `ContentPageRepository.java`: 공지사항/약관/개인정보 문서 테이블 접근
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
- [ ] `Item.java`: 상품 테이블 매핑
- [ ] `PriceHistory.java`: 가격 이력 테이블 매핑
- [ ] `Wishlist.java`: 찜 테이블 매핑
- [ ] `SearchLog.java`: 검색 로그 테이블 매핑
- [ ] `SearchEvent.java`: 검색/노출/클릭 이벤트 테이블 매핑
- [ ] `ItemSearchMatch.java`: 상품-검색어 매칭 테이블 매핑
- [ ] `ItemView.java`: 최근 본 상품 테이블 매핑
- [ ] `SearchRanking.java`: 검색 순위 테이블 매핑
- [ ] `PriceStatsDaily.java`: 일별 가격 통계 테이블 매핑
- [ ] `UserPreference.java`: 사용자 선호 태그 테이블 매핑
- [ ] `Banner.java`: 배너 테이블 매핑
- [ ] `ContentPage.java`: 공지사항/약관/개인정보 문서 테이블 매핑
- [ ] `ChatHistory.java`: 챗봇 대화 내역 테이블 매핑
- [ ] `ChatFaq.java`: 챗봇 FAQ 테이블 매핑
- [ ] `Notification.java`: 알림 테이블 매핑
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
- [x] `crawling_20260429_by_keyword.py`: 키워드별 CSV 저장용 크롤링 스크립트 작성 (작성일: 2026-05-08)
- [x] `crawling_20260429_no_filter.py`: 필터 미적용 비교용 크롤링 스크립트 작성 (작성일: 2026-05-07)
- [x] `update_keyword_list.py`: 플랫폼 인기검색어 기반 키워드 목록 갱신 스크립트 작성 (작성일: 2026-05-07)
- [x] `keyword_list.csv`: 크롤링 키워드 목록 작성 (작성일: 2026-04-29)
- [x] `archive/integrated_crawling_initial.py`: 초기 크롤링 코드 보관 (작성일: 2026-04-21)
- [x] 키워드 중복 조회 상품 제거 로직 작성 (작성일: 2026-05-06)
- [ ] 크롤링 결과 저장 방식 정리
- [ ] DB 저장 연동 방식 정리

### `analysis`

- [x] `cluster_bracket_contents.py`: no-filter 크롤링 결과의 상품명 대괄호(`[]`) 내부 텍스트 추출/클러스터링 스크립트 작성 (작성일: 2026-05-21)
- [x] `results/bracket_contents`: 대괄호 내부 텍스트 단순 추출 결과 CSV 보관 위치 정리 (작성일: 2026-05-21)
- [x] `results/bracket_clusters`: 대괄호 내부 텍스트 상세 CSV 보관 위치 정리 (작성일: 2026-05-21)
- [x] `latest_bracket_cluster_detail.csv`: 대괄호 내부 텍스트, 문구별 등장 횟수, `/`와 공백 기준 분리 토큰, 분리 토큰 조합별 등장 횟수 및 토큰별 전체 등장 횟수를 함께 담는 상세 CSV 생성 (작성일: 2026-05-21)

### `config` 및 파이프라인

- [x] `config/README.md`: Hama 파이프라인 설정 CSV 작성 가이드 작성 (작성일: 2026-05-21)
- [x] `config/product_token_dictionary.csv`: 상품 토큰 사전 작성 (작성일: 2026-05-21)
- [x] `config/category_rules.csv`: 카테고리 배정 규칙 작성 (작성일: 2026-05-21)
- [x] `config/token_exclude_list.csv`: 제외 토큰 목록 작성 (작성일: 2026-05-21)
- [x] `config/reference/*.csv`: 설정 수동 검토용 참고 CSV 생성 (작성일: 2026-05-21)
- [x] `generate_config_reference_csv.py`: 설정 참고 CSV 생성 스크립트 작성 (작성일: 2026-05-21)
- [x] `product_matching.py`: 상품명 정규화/토큰화/매칭 보조 모듈 작성 (작성일: 2026-05-21)
- [x] `hama_data_pipeline.py`: 설정 CSV 기반 상품 매칭 파이프라인 작성 (작성일: 2026-05-21)
- [x] `api_server.py`: Python 파이프라인 확인용 FastAPI 서버 작성 (작성일: 2026-05-21)

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
- [x] 페이지 전환 상태 관리 (작성일: 2026-05-21)
- [x] 홈, 검색 결과, 마이페이지, 디자인 랩 페이지 연결 (작성일: 2026-05-21)
- [ ] API 연동 후 목 데이터 의존성 제거 또는 fixture 분리

### `src/components`

- [x] `Header.tsx`: 상단 로고와 메뉴 영역 (작성일: 2026-04-30)
- [x] `SearchBar.tsx`: 검색 입력창 (작성일: 2026-05-21)
- [x] `Banner.tsx`: 홈 배너 영역 (작성일: 2026-05-21)
- [x] `CategoryGrid.tsx`: 카테고리 선택 그리드 (작성일: 2026-04-30)
- [x] `ProductCard.tsx`: 상품 카드 (작성일: 2026-05-21)
- [x] `ProductDetailModal.tsx`: 상품 상세 모달 (작성일: 2026-05-21)
- [x] `ProductVisual.tsx`: 상품 이미지/시각 요소 (작성일: 2026-05-21)
- [x] `PriceInsightChart.tsx`: 가격 인사이트 차트 (작성일: 2026-05-21)
- [x] `PlatformPill.tsx`: 플랫폼 배지 (작성일: 2026-05-21)
- [x] `SortControls.tsx`: 정렬 컨트롤 (작성일: 2026-05-21)
- [x] `AuthModal.tsx`: 로그인/회원가입 모달 (작성일: 2026-05-21)
- [x] `Footer.tsx`: 하단 정보 영역 (작성일: 2026-04-30)

### `src/data`

- [x] `categories.ts`: 카테고리 목록 데이터 (작성일: 2026-05-21)
- [x] `mockProducts.ts`: 상품 목 데이터 (작성일: 2026-05-21)
- [ ] 백엔드 API 연동 시 데이터 대체 방식 정리

### `src/api`

- [x] `products.ts`: 상품 데이터 접근 모듈 (작성일: 2026-05-21)

### `src/pages`

- [x] `HomePage.tsx`: 홈 화면 페이지 (작성일: 2026-05-21)
- [x] `SearchResultsPage.tsx`: 검색 결과 페이지 (작성일: 2026-05-21)
- [x] `MyPage.tsx`: 마이페이지 (작성일: 2026-05-21)
- [x] `DesignLabPage.tsx`: 디자인 시안 목록 페이지 (작성일: 2026-05-21)
- [x] `DesignPreviewPage.tsx`: 디자인 시안 미리보기 페이지 (작성일: 2026-05-21)

### `src/types`

- [x] `product.ts`: 상품, 플랫폼, 가격 인사이트 타입 정의 (작성일: 2026-05-21)
- [ ] API 응답 타입 추가 필요 여부 확인

### `src/utils`

- [x] `format.ts`: 화면 표시용 포맷 유틸리티 (작성일: 2026-05-21)
- [x] `recentSearches.ts`: 최근 검색어 저장/조회 유틸리티 (작성일: 2026-05-21)
- [x] `temporarySearchCalculations.ts`: 검색 화면 임시 계산 로직 (작성일: 2026-05-21)

### `src/design-prototypes`

- [x] `price-insight-a`: 가격 인사이트 시안 A와 README (작성일: 2026-05-21)
- [x] `price-insight-b`: 가격 인사이트 시안 B와 README (작성일: 2026-05-21)
- [x] `price-insight-c`: 가격 인사이트 시안 C와 README (작성일: 2026-05-21)

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

- [ ] `src/hooks`: 반복 상태 로직용 커스텀 훅
- [ ] `src/routes`: React Router 도입 시 라우팅 설정
- [ ] `src/contexts`: 전역 상태가 필요해질 경우 추가
- [ ] `src/assets`: import 기반 에셋 관리가 필요해질 경우 추가

## 새 구현 파일을 추가할 때

- [ ] `requirements.md`의 폴더 기준에 맞는 위치인지 확인
- [ ] 이 체크리스트에 파일명을 추가
- [ ] 실제 기능 코드가 작성되면 체크
- [ ] 해당 폴더의 `.gitkeep` 필요 여부 확인
- [ ] API, DB, 화면 구조가 바뀌면 관련 문서도 함께 갱신

## 추가 분석 문서

- [x] `search_relevance_plan.md`: 검색 결과 정합성 판별 모델 진행 계획 작성 (작성일: 2026-05-07)
