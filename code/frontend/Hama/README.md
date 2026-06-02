# Hama Front-end

Hama 프론트엔드는 중고거래 플랫폼의 상품을 검색하고, 플랫폼별 가격과 상품 상태를 비교한 뒤, 관심 상품을 찜 목록과 알림 화면에서 다시 확인할 수 있게 만든 React/Vite 앱입니다.

현재 화면은 발표와 로컬 시연을 기준으로 구성되어 있습니다. 검색, 상품 상세, 마이페이지, 관리자 대시보드의 흐름은 실제 사용자 동선처럼 연결되어 있고, 로그인/찜/알림/관리자 통계 일부는 백엔드 API 연결 전에도 화면 흐름을 확인할 수 있도록 로컬 상태와 예시 데이터로 동작합니다.

## 주요 화면

- `/`: 메인 화면입니다. 검색창, 배너, 카테고리, 추천 상품 그리드를 보여줍니다.
- `/search?q=검색어`: 검색 결과 화면입니다. 플랫폼 필터, 정렬, 4열 상품 그리드, 가격 요약, 페이지네이션을 제공합니다.
- `/mypage`: 마이페이지입니다. 찜 목록, 최근 본 상품, 알림, 설정 탭을 제공합니다.
- `/admin`: 관리자 화면입니다. 홈 방문수, 검색 수, 미매칭 상품, 판별결과 이상, 유저 조회 UI를 한 화면에 정리합니다.
- `/terms`, `/privacy`: 약관과 개인정보 안내 화면입니다.

상품 상세는 별도 페이지가 아니라 메인과 검색 결과에서 공통으로 여는 팝업입니다. 사용자는 상품 카드 선택 후 상세 이미지, 가격 인사이트, 원본 판매 링크, 찜/알림 버튼을 확인할 수 있습니다.

## 사용자 흐름

1. 메인 화면에서 상품명을 검색합니다.
2. 검색 결과에서 플랫폼, 정렬, 표시 줄 수를 조정합니다.
3. 상품 카드를 눌러 상세 팝업을 확인합니다.
4. 관심 상품을 찜하거나 알림을 켭니다.
5. 마이페이지에서 찜 목록, 최근 본 상품, 알림 후보를 다시 확인합니다.
6. 관리자 화면에서 검색/방문/이상 데이터 확인 UI를 확인합니다.

## 기술 스택

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- lucide-react

## 실행 방법

아래 명령어는 저장소 폴더명이 `HamaMain`인 기준입니다.

프론트만 확인할 때:

```bash
cd HamaMain
cd code/frontend/Hama
npm install
npm run dev -- --host 127.0.0.1 --port 5178 --strictPort --force
```
ㅂ
브라우저에서 접속합니다.

```text
http://127.0.0.1:5178/
```

검색 API와 추천 상품 API까지 확인하려면 백엔드 MVP 서버를 먼저 실행합니다.

```bash
cd HamaMain
cd code/backend/src/main/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api_server:app --reload --host 127.0.0.1 --port 8000
```

프론트는 Vite 프록시를 통해 같은 origin의 `/api` 요청을 백엔드 서버로 전달합니다. 기본 API 주소를 명시하고 싶으면 프론트 폴더에서 `.env.example`을 참고해 `.env`를 만들 수 있습니다.

```bash
cd HamaMain
cd code/frontend/Hama
cp .env.example .env
```

## 검증 명령

프론트 변경 후에는 아래 명령으로 기본 품질을 확인합니다.

```bash
cd HamaMain
cd code/frontend/Hama
npm run lint
npx tsc --noEmit
npm run build
```

- `npm run lint`: 코드 규칙과 실수 가능성이 있는 패턴을 검사합니다.
- `npx tsc --noEmit`: TypeScript 타입 오류를 검사합니다. 파일을 새로 만들지는 않습니다.
- `npm run build`: 실제 배포용 번들이 만들어지는지 확인합니다.

발표 때 이 명령을 직접 실행할 필요는 보통 없습니다. 다만 프로젝트 설명이나 질의응답에서 “로컬에서 lint, 타입 체크, 빌드 검증을 통과했다”고 말할 수 있는 근거가 됩니다. 시연 직전에는 한 번 실행해두는 것이 좋습니다.

## 백엔드 연결 상태

상품 검색과 추천 상품은 `src/api/products.ts`와 `src/queries/productQueries.ts`를 통해 호출합니다.

```http
GET /api/products/search?q=아이폰&platforms=번개장터,중고나라&sort=low-price&page=1&limit=16
GET /api/products/recommended?limit=16
GET /api/products/{platform}/{pid}
```

프론트가 기대하는 검색 응답 형태는 아래와 같습니다.

```ts
type SearchProductsResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  summary: {
    lowestPrice: number;
    averagePrice: number;
    updatedAt: string;
  };
};
```

현재 찜 목록, 최근 본 상품, 알림 후보는 로컬스토리지 기반으로 동작합니다. 실제 사용자 계정 API가 연결되면 `src/utils/userProductLists.ts`와 마이페이지의 저장/삭제 로직을 백엔드 API 호출로 교체하면 됩니다.

관리자 화면은 아직 실제 관리자 API에 연결되지 않은 UI 계약입니다. 백엔드에서 유저 조회, item 전체 컬럼, 미매칭 상품, 방문수, 검색 수를 내려주면 `src/pages/AdminPage.tsx`의 예시 데이터를 API 응답으로 교체하는 구조입니다.

## 폴더 구조

```text
src
├── api
│   └── products.ts
├── components
│   ├── AuthModal.tsx
│   ├── Banner.tsx
│   ├── CategoryGrid.tsx
│   ├── Header.tsx
│   ├── PlatformPill.tsx
│   ├── PriceInsightChart.tsx
│   ├── ProductCard.tsx
│   ├── ProductDetailModal.tsx
│   ├── ProductVisual.tsx
│   ├── RefreshProductsButton.tsx
│   ├── RowsMenu.tsx
│   ├── ScrollToTopButton.tsx
│   ├── SearchBar.tsx
│   ├── SiteFooter.tsx
│   └── SortControls.tsx
├── data
│   └── categories.ts
├── lib
│   └── queryClient.ts
├── pages
│   ├── AdminPage.tsx
│   ├── HomePage.tsx
│   ├── LegalPage.tsx
│   ├── MyPage.tsx
│   └── SearchResultsPage.tsx
├── queries
│   └── productQueries.ts
├── styles
│   └── hairline.ts
├── types
│   ├── product.ts
│   └── productList.ts
├── utils
│   ├── format.ts
│   ├── recentSearches.ts
│   └── userProductLists.ts
├── AppRoot.tsx
├── index.css
└── main.tsx
```

## 구현 상태

완료된 흐름:

- 메인 검색창에서 `/search` 화면으로 이동
- 검색 결과 카드 그리드, 플랫폼 필터, 정렬, 페이지네이션
- 4줄 기준 상품 표시와 표시 줄 수 선택
- 상품 상세 팝업, 가격 인사이트, 원본 판매 페이지 이동
- 최근 검색어 저장/삭제
- 찜 목록과 최근 본 상품 로컬 저장
- 마이페이지 알림 탭 UI
- 설정 화면과 관리자 페이지 진입 버튼
- 관리자 대시보드 UI
- 약관/개인정보 안내 화면
- 로딩, 빈 상태, 에러 상태 UI

남은 작업:

- 로그인/회원가입 API 실제 연결
- 찜, 최근 본 상품, 알림 설정의 계정 기반 저장
- 관리자 대시보드 API 연결
- 챗봇 UI와 챗봇 API 연결
- 모바일 좁은 화면에서 주요 페이지 최종 점검
- 발표 전 `/`, `/search`, `/mypage`, `/admin` 시연 동선 확인

## 발표 전 확인 순서

1. 백엔드 서버를 실행합니다.
2. 프론트 서버를 `5178` 포트로 실행합니다.
3. 메인에서 검색어를 입력해 검색 결과로 이동합니다.
4. 검색 결과에서 필터, 정렬, 페이지네이션을 확인합니다.
5. 상품 상세 팝업에서 이미지, 가격 그래프, 찜/알림 버튼을 확인합니다.
6. 마이페이지에서 찜 목록, 최근 본 상품, 알림 탭을 확인합니다.
7. 관리자 페이지에서 대시보드와 유저 조회 UI를 확인합니다.
