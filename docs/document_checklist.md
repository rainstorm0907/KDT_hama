# 구현 파일 작성 체크리스트

현재 로컬 저장소의 실제 파일 기준으로 작성 상태를 정리합니다.

## Backend Java

기준 위치:

```text
code/backend/src/main/java/com/used/service
```

현재 상태: Spring Boot API 구현이 통합되어 있습니다.

- [x] `build.gradle`
- [x] `settings.gradle`
- [x] `gradlew`, `gradlew.bat`
- [x] `config`: Security, CORS, WebClient 설정
- [x] `controller`: 인증, 상품, 마이페이지, 사용자 API
- [x] `service`: 사용자, 상품, 마이페이지 서비스
- [x] `repository`: 사용자, 찜, 알림, 최근 본 상품 저장소
- [x] `dto`: 요청/응답 DTO
- [x] `entity`: 사용자, 찜, 알림 등 JPA 엔티티
- [x] `chatbot`: 챗봇, Gemini, 추천, FAQ 관련 API/서비스
- [ ] `exception`: 공통 예외 처리 전용 패키지
- [ ] `scheduler`: 정기 작업 패키지
- [x] `resources/application.yaml`: Spring 설정 파일

## Backend Python

기준 위치:

```text
code/backend/src/main/python
```

- [x] `api_server.py`: 로컬 MVP FastAPI 서버
- [x] `import_csv_to_supabase.py`
- [x] `requirements.txt`
- [x] `.env.example`
- [x] `lib/hama_data_pipeline.py`
- [x] `lib/keyword_preprocessing.py`
- [x] `lib/product_matching.py`
- [x] `lib/item_rating.py`
- [x] `lib/supabase_repository.py`
- [x] `tools/apply_supabase_schema.py`
- [x] `tools/generate_config_reference_csv.py`
- [x] `tools/generate_supabase_erd.py`
- [x] `crawling/keyword_list.csv`
- [x] `crawling/blacklist_keywords.csv`
- [x] `crawling/blacklist_tokens.csv`
- [x] `crawling/update_keyword_list.py`
- [x] `analysis/scripts/check_title_keyword_accuracy.py`
- [x] `analysis/scripts/cluster_bracket_contents.py`
- [x] `analysis/scripts/compare_platform_data.py`
- [x] 키워드 중복 조회 상품 제거 로직 작성
- [ ] 크롤링 결과 저장 방식 최종 정책 정리
- [ ] DB 저장 연동 운영 절차 정리

참고:

- `crawling/archive/**`, `crawling/results/**`는 로컬 크롤링 스크립트/결과 보관 위치이며 Git 추적 대상에서 제외될 수 있습니다.
- `archive/TEST/**`는 테스트/검토용 데이터 영역으로 제출 대상이 아닙니다.

### `analysis`

- [x] `analysis/scripts/cluster_bracket_contents.py`: no-filter 크롤링 결과의 상품명 대괄호(`[]`) 내부 텍스트 추출/클러스터링
- [x] `results/bracket_contents`: 대괄호 내부 텍스트 추출 결과 CSV 보관
- [x] `results/bracket_clusters`: 대괄호 내부 텍스트 클러스터링 결과 CSV 보관
- [x] `results/platform_comparison`: 플랫폼별/키워드별 비교 결과 보관
- [x] `results/title_keyword_accuracy`: 키워드-상품명 정합성 검증 결과 보관
- [x] `results/price_outliers`: 키워드별 가격 통계와 이상치 후보 결과 보관
- [x] `analysis/notebooks/keyword_final.ipynb`: 최종 DB handoff 파이프라인
- [x] `analysis/notebooks/keyword_price_outliers.ipynb`: 가격 이상치 분석 노트북
- [x] `analysis/notebooks/keyword_price_outliers_first_filter.ipynb`: 1차 필터 기준 가격 이상치 분석 노트북
- [x] `analysis/notebooks/cluster_splits.ipynb`: 클러스터 분리 검토 노트북

### `config` 및 파이프라인

- [x] `config/README.md`: Hama 파이프라인 설정 CSV 작성 가이드
- [x] `config/product_token_dictionary.csv`: 상품 토큰 사전
- [x] `config/category_rules.csv`: 카테고리 배정 규칙
- [x] `config/token_exclude_list.csv`: 제외 토큰 목록
- [x] `config/reference/*.csv`: 설정 수동 검토용 참고 CSV
- [x] `tools/generate_config_reference_csv.py`: 설정 참고 CSV 생성 스크립트
- [x] `lib/product_matching.py`: 상품명 정규화/토큰화/매칭 보조 모듈
- [x] `lib/hama_data_pipeline.py`: 설정 CSV 기반 상품 매칭 파이프라인
- [x] `lib/keyword_preprocessing.py`: keyword_final 전처리·클러스터 규칙
- [x] `api_server.py`: 상품 검색/추천/상세 FastAPI 서버 (로컬)
- [x] `lib/supabase_repository.py`: Supabase 상품 조회 및 CSV fallback 저장소 모듈
- [x] `tools/apply_supabase_schema.py`: Supabase/PostgreSQL 스키마 적용 스크립트
- [x] `import_csv_to_supabase.py`: 크롤링 CSV의 Supabase 적재 스크립트
- [x] `.env.example`: Supabase·OpenSearch 로컬 환경 변수 예시 파일

### `lib` 전처리·클러스터

- [x] `lib/keyword_preprocessing.py`: 블랙리스트, 가격 이상치, `cluster_product_name` 규칙
- [x] `analysis/notebooks/keyword_final.ipynb`: 최종 handoff CSV 생성 노트북
- [ ] `HamaCollectionPipeline` 크롤러 fetch 연동 (현재 TODO)

## Frontend

기준 위치:

```text
code/frontend/Hama/src
```

### App

- [x] `main.tsx`
- [x] `AppRoot.tsx`
- [x] `index.css`

### API / Query

- [x] `api/products.ts`
- [x] `queries/productQueries.ts`
- [x] `lib/queryClient.ts`

### Pages

- [x] `pages/HomePage.tsx`
- [x] `pages/SearchResultsPage.tsx`
- [x] `pages/MyPage.tsx`
- [x] `pages/AdminPage.tsx`
- [x] `pages/LegalPage.tsx`

### Components

- [x] `components/AuthModal.tsx`
- [x] `components/Banner.tsx`
- [x] `components/Header.tsx`
- [x] `components/PlatformPill.tsx`
- [x] `components/PriceInsightChart.tsx`
- [x] `components/ProductCard.tsx`
- [x] `components/ProductDetailModal.tsx`
- [x] `components/ProductVisual.tsx`
- [x] `components/RefreshProductsButton.tsx`
- [x] `components/RowsMenu.tsx`
- [x] `components/SearchBar.tsx`
- [x] `components/SiteFooter.tsx`
- [x] `components/SortControls.tsx`
- [x] `components/RecentKeywordRecommendations.tsx`
- [x] `components/PriceCompareChart.tsx`
- [x] `components/PriceCompareModal.tsx`
- [x] `components/PriceCompareProductCard.tsx`
- [x] `components/PriceCompareProductPicker.tsx`
- [x] `components/PriceCompareWorkspace.tsx`
- [x] `components/SideButtons.tsx`
- [x] `components/SideChatbotButton.tsx`
- [x] `components/SideNotificationButton.tsx`
- [x] `components/SidePriceCompareButton.tsx`
- [x] `components/sideButtonStyles.ts`
- [x] `components/mypage/MyPageProductListTab.tsx`
- [x] `components/mypage/MyPageNotificationsTab.tsx`
- [x] `components/mypage/MyPagePriceCompareTab.tsx`
- [x] `components/mypage/MyPageSettingsTab.tsx`
- [x] `components/mypage/MyPageShared.tsx`

### Hooks / Types / Utils

- [x] `hooks/useModalScrollLock.ts`
- [x] `types/product.ts`
- [x] `types/productList.ts`
- [x] `utils/format.ts`
- [x] `utils/recentSearches.ts`
- [x] `utils/userProductLists.ts`
- [x] `styles/hairline.ts`

## Docs

- [x] `api_spec.md`
- [x] `db_schema.sql`
- [x] `document_checklist.md`
- [x] `project_structure.md`
- [x] `requirements.md`
- [x] `search_relevance_plan.md`
- [x] `supabase_schema.sql`
- [x] `supabase_setup.md`
- [x] `chatbot_expected_answers.csv`
- [x] `ERD.drawio.png`
- [x] `데이터 명세서.xlsx`

## Spring Boot 통합 상태

기준 위치:

```text
code/backend
```

- [x] Gradle 프로젝트 파일
- [x] Java 패키지 `com.used.service`로 정리
- [x] Entity
- [x] DTO Request / Response
- [x] Repository
- [x] Service
- [x] Controller
- [x] `application.yaml`

참고:

- 현재 프론트 MVP의 기본 API 대상은 Python FastAPI입니다.
- Spring Boot는 인증, 상품, 마이페이지, 챗봇 구현을 포함하며 기본 포트는 `8080`입니다.
- 현재 Gradle wrapper에는 `gradle-wrapper.jar`가 없어 로컬 빌드 시 wrapper 재생성 또는 시스템 Gradle 설치가 필요할 수 있습니다.
