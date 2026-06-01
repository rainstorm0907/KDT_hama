# 구현 파일 작성 체크리스트

현재 실제 파일 기준으로 작성 상태를 정리합니다.

## Backend Java

기준 위치:

```text
code/backend/src/main/java/com/used/service
```

현재 상태: 폴더 구조만 있고 실제 기능 코드는 아직 없습니다.

- [ ] `config`: `.gitkeep`만 있음
- [ ] `controller`: `.gitkeep`만 있음
- [ ] `service`: `.gitkeep`만 있음
- [ ] `repository`: `.gitkeep`만 있음
- [ ] `dto`: `.gitkeep`만 있음
- [ ] `entity`: `.gitkeep`만 있음
- [ ] `scheduler`: `.gitkeep`만 있음
- [ ] `notification`: `.gitkeep`만 있음
- [ ] `chatbot`: `.gitkeep`만 있음
- [ ] `exception`: `.gitkeep`만 있음
- [x] `resources/application.yml`: 파일 있음

## Backend Python

기준 위치:

```text
code/backend/src/main/python
```

- [x] `api_server.py`
- [x] `apply_supabase_schema.py`
- [x] `generate_config_reference_csv.py`
- [x] `hama_data_pipeline.py`
- [x] `import_csv_to_supabase.py`
- [x] `product_matching.py`
- [x] `requirements.txt`
- [x] `supabase_repository.py`
- [x] `.env.example`
- [x] `crawling/keyword_list.csv`
- [x] `crawling/update_keyword_list.py`
- [x] `crawling/archive/crawling_20260429.py`
- [x] `crawling/archive/crawling_20260429_by_keyword.py`
- [x] `crawling/archive/crawling_20260429_no_filter.py`
- [x] `crawling/archive/integrated_crawling_initial.py`
- [x] `analysis/check_title_keyword_accuracy.py`
- [x] `analysis/cluster_bracket_contents.py`
- [x] `analysis/compare_platform_data.py`
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
- [x] `supabase_repository.py`: Supabase 상품 조회 및 CSV fallback 저장소 모듈 작성 (작성일: 2026-05-27)
- [x] `apply_supabase_schema.py`: Supabase/PostgreSQL 스키마 적용 스크립트 작성 (작성일: 2026-05-27)
- [x] `import_csv_to_supabase.py`: 크롤링 CSV의 Supabase 적재 스크립트 작성 (작성일: 2026-05-27)
- [x] `.env.example`: Supabase 로컬 환경 변수 예시 파일 작성 (작성일: 2026-05-27)

### `preprocessing`

- [ ] 중복 상품 제거 스크립트 작성
- [ ] 가격, 날짜, 상태값 정규화 스크립트 작성
- [ ] DB 저장 전 데이터 검증 스크립트 작성

현재 상태:

- [ ] `preprocessing` 폴더에는 아직 `.gitkeep`만 있음

### Python 의존성

- [x] `requirements.txt`: Python 패키지 목록 파일 생성 (작성일: 2026-04-29)
- [x] 실제 실행에 필요한 패키지 목록 최신화 (작성일: 2026-05-27)

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
- [x] `pages/LegalPage.tsx`

### Components

- [x] `components/AuthModal.tsx`
- [x] `components/Banner.tsx`
- [x] `components/CategoryGrid.tsx`
- [x] `components/Header.tsx`
- [x] `components/PlatformPill.tsx`
- [x] `components/PriceInsightChart.tsx`
- [x] `components/ProductCard.tsx`
- [x] `components/ProductDetailModal.tsx`
- [x] `components/ProductVisual.tsx`
- [x] `components/RefreshProductsButton.tsx`
- [x] `components/RowsMenu.tsx`
- [x] `components/ScrollToTopButton.tsx`
- [x] `components/SearchBar.tsx`
- [x] `components/SiteFooter.tsx`
- [x] `components/SortControls.tsx`

### Data / Types / Utils

- [x] `data/categories.ts`
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
- [x] `ERD.drawio.png`
- [x] `데이터 명세서.xlsx`

## 별도 제출용 프로젝트

기준 위치:

```text
정지원_boot
```

- [x] Entity
- [x] DTO Request / Response
- [x] Repository
- [x] Service
- [x] Controller
- [x] `application.yml`
- [x] `README.md`
