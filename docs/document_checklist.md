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
- [x] `generate_config_reference_csv.py`
- [x] `hama_data_pipeline.py`
- [x] `product_matching.py`
- [x] `requirements.txt`
- [x] `crawling/update_keyword_list.py`
- [x] `crawling/archive/crawling_20260429.py`
- [x] `crawling/archive/crawling_20260429_by_keyword.py`
- [x] `crawling/archive/crawling_20260429_no_filter.py`
- [x] `crawling/archive/integrated_crawling_initial.py`
- [x] `analysis/check_title_keyword_accuracy.py`
- [x] `analysis/cluster_bracket_contents.py`
- [x] `analysis/compare_platform_data.py`
- [ ] `preprocessing`: `.gitkeep`만 있음

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
