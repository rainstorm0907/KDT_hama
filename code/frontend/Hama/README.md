# Hama Frontend

Hama 프론트엔드는 여러 중고거래 플랫폼의 상품을 검색하고, 가격과 판매 상태를 비교한 뒤, 관심 상품을 찜/알림/가격 비교 흐름으로 다시 확인할 수 있게 만든 React + TypeScript + Vite 앱입니다.

현재 코드는 발표와 로컬 시연을 기준으로 정리되어 있습니다. 실제 백엔드 API가 붙은 검색/추천 흐름은 TanStack Query로 호출하고, 계정 기반 저장이 아직 확정되지 않은 찜/최근 본 상품/알림/가격 비교 후보는 로컬스토리지로 먼저 동작합니다.

## 빠른 실행

프로젝트 루트가 `/Users/wooojin/HamaMain`인 기준입니다.

```bash
cd /Users/wooojin/HamaMain/code/frontend/Hama
npm install
VITE_CACHE_DIR=/private/tmp/hama-vite-cache npm run dev -- --configLoader runner --host 127.0.0.1 --port 5178 --strictPort --force
```

브라우저에서 확인합니다.

```text
http://127.0.0.1:5178/
```

검증 명령은 아래 순서로 봅니다.

```bash
cd /Users/wooojin/HamaMain/code/frontend/Hama
npm run lint
npx tsc --noEmit
mkdir -p /Users/wooojin/HamaMain/code/frontend/Hama/dist
VITE_CACHE_DIR=/private/tmp/hama-vite-cache npm run build -- --configLoader runner
```

- `npm run lint`: ESLint 기준으로 코드 실수와 규칙 위반을 확인합니다.
- `npx tsc --noEmit`: TypeScript 타입 오류를 확인합니다.
- `npm run build`: 실제 배포 번들이 만들어지는지 확인합니다.

발표 때 명령을 직접 보여줄 필요는 보통 없습니다. 대신 “프론트는 lint, 타입 체크, build까지 통과한 상태로 시연했다”고 설명할 근거가 됩니다.

## 주요 화면

- `/`: 메인 화면입니다. 검색창, 인기 검색어, 배너, 최근 검색 기반 추천, 추천 상품, 사이드 버튼을 보여줍니다.
- `/search?q=검색어`: 검색 결과 화면입니다. 플랫폼 필터, 정렬, 표시 줄 수, 페이지네이션, 상품 상세 팝업을 제공합니다.
- `/search?search=검색어`: 메인 추천 영역의 더보기 링크에서도 들어올 수 있도록 같이 지원합니다.
- `/mypage`: 찜 목록, 최근 본 상품, 알림, 가격 비교, 설정 탭을 제공합니다.
- `/admin`: 관리자 대시보드 UI입니다. 방문수, 검색 수, 판별결과 이상, 미매칭 상품, 유저 조회 영역을 정리합니다.
- `/terms`, `/privacy`: 약관과 개인정보 안내 화면입니다.

상품 상세는 별도 페이지가 아니라 메인/검색/마이페이지에서 공통으로 여는 팝업입니다. 상세 팝업 안에서 찜, 알림, 챗봇 포커스, 가격 비교 리스트 추가 흐름이 이어집니다.

## 사용자 흐름

1. 메인에서 상품명을 검색하거나 최근 검색 기반 추천을 확인합니다.
2. 검색 결과에서 플랫폼, 정렬, 표시 줄 수, 페이지를 조정합니다.
3. 상품 카드를 눌러 상세 팝업을 확인합니다.
4. 관심 상품을 찜하거나 알림을 켜고, 가격 비교 리스트에 추가합니다.
5. 사이드 버튼이나 마이페이지에서 가격 비교 화면을 열어 여러 상품을 비교합니다.
6. 마이페이지에서 찜 목록, 최근 본 상품, 알림, 가격 비교 후보를 다시 확인합니다.
7. 관리자 화면에서 서비스 지표와 이상 데이터 확인 UI를 봅니다.

## 기술 스택

- Vite
- React
- TypeScript
- React Router
- TanStack Query
- Tailwind CSS
- lucide-react

## 폴더 구조

```text
src
├── api
│   └── products.ts
├── components
│   ├── Banner.tsx
│   ├── ProductCard.tsx
│   ├── ProductDetailModal.tsx
│   ├── PriceCompare*.tsx
│   ├── RecentKeywordRecommendations.tsx
│   ├── Side*.tsx
│   └── SearchBar.tsx
├── hooks
│   └── useModalScrollLock.ts
├── pages
│   ├── AdminPage.tsx
│   ├── HomePage.tsx
│   ├── MyPage.tsx
│   └── SearchResultsPage.tsx
├── queries
│   └── productQueries.ts
├── styles
│   └── hairline.ts
├── types
│   ├── product.ts
│   └── productList.ts
└── utils
    ├── format.ts
    ├── recentSearches.ts
    └── userProductLists.ts
```

## 폴더별 역할

- `src/api`: 백엔드 HTTP 호출 함수입니다. 지금은 상품 검색, 추천 상품, 상품 상세 API를 모아둡니다.
- `src/queries`: TanStack Query 훅과 query key를 관리합니다. 화면은 이 훅을 통해 API 데이터를 받습니다.
- `src/components`: 여러 화면에서 재사용하는 UI입니다. 상품 카드, 상세 팝업, 가격 비교, 사이드 버튼, 검색창이 여기에 있습니다.
- `src/pages`: 라우트 단위 화면입니다. 화면 배치와 페이지 상태를 담당하고, 반복 UI는 `components`로 넘깁니다.
- `src/styles/hairline.ts`: Hama의 border, shadow, button, text 톤을 모아둔 디자인 기준입니다.
- `src/utils`: 가격 포맷, 최근 검색어, 찜/알림/가격 비교 로컬 저장 로직입니다.
- `public`: 배너 이미지처럼 빌드 시 그대로 배포되는 정적 파일입니다.

큰 디자인 기준은 프로젝트 루트의 `DESIGN.md`에 정리되어 있습니다. 새 UI를 만들 때는 먼저 `hairline.ts`, `ProductCard`, `PlatformPill`, `ProductVisual`, `PriceCompare*`, `Side*` 패턴을 확인하는 것이 좋습니다.

## 핵심 컴포넌트

- `ProductCard.tsx`: 메인/검색/최근 키워드 추천에서 쓰는 상품 카드입니다. `variant="compact"`로 작은 추천 영역에도 재사용합니다.
- `ProductDetailModal.tsx`: 상품 상세 팝업입니다. 찜, 알림, 챗봇 포커스, 가격 비교 리스트 추가가 여기에서 시작됩니다.
- `RecentKeywordRecommendations.tsx`: 메인 배너 아래 최근 검색 기반 추천 영역입니다. 최근 키워드를 고르면 관련 상품 4개와 더보기 링크를 보여줍니다.
- `SideButtons.tsx`: 우측 고정 버튼 묶음입니다. 맨 위로 이동, 가격 비교, 챗봇, 알림 순서를 유지합니다.
- `SideNotificationButton.tsx`: 사이드 알림 팝업입니다. 상품 클릭 또는 `x` 클릭 흐름으로 읽음/제거 동작을 연결할 수 있게 분리했습니다.
- `PriceCompareModal.tsx`: 가격 비교를 팝업으로 띄우는 껍데기입니다.
- `PriceCompareWorkspace.tsx`: 가격 비교의 실제 상태와 화면 전환을 담당합니다. 모달과 마이페이지 탭에서 같은 로직을 재사용합니다.
- `PriceCompareProductPicker.tsx`: 비교할 상품을 고르는 내부 선택 팝업입니다. 가격 비교 리스트와 추천 상품을 키워드별로 묶어 보여줍니다.
- `PriceCompareChart.tsx`: 키워드 30일 시세 위에 선택 상품의 등록일/가격 마커를 올리는 그래프입니다.
- `MyPage.tsx`: 찜, 최근 본 상품, 알림, 가격 비교, 설정 탭을 가진 마이페이지입니다.
- `AdminPage.tsx`: 관리자 대시보드 UI입니다. 현재는 API 연결 전 예시 데이터 기반 화면입니다.

## API 연결 흐름

상품 데이터는 아래 경로로 흐릅니다.

```text
page/component
→ src/queries/productQueries.ts
→ src/api/products.ts
→ /api/products/*
```

현재 프론트가 호출하는 API입니다.

```http
GET /api/products/search?q=아이폰&platforms=번개장터,중고나라&sort=relevance&page=1&limit=16
GET /api/products/recommended?limit=16
GET /api/products/{platform}/{pid}
```

검색 응답은 `items`, `total`, `page`, `limit`, `summary`를 기대합니다.

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

## 로컬 저장 흐름

백엔드 계정 API가 붙기 전까지 아래 기능은 로컬스토리지로 동작합니다.

- 최근 검색어: `src/utils/recentSearches.ts`
- 찜 목록: `src/utils/userProductLists.ts`
- 최근 본 상품: `src/utils/userProductLists.ts`
- 알림 후보: `src/utils/userProductLists.ts`
- 가격 비교 리스트: `src/utils/userProductLists.ts`

최종 계정 기반 저장으로 바꿀 때는 화면 컴포넌트 전체를 갈아엎기보다, 이 저장/조회 유틸과 관련 API 호출부를 교체하는 방향이 안전합니다.

## 디자인 기준

Hama는 쇼핑몰 랜딩 페이지보다 “중고 상품을 검색하고 판단하는 앱”에 가깝습니다.

- 흰 배경과 밝은 회색 표면을 기본으로 둡니다.
- border는 `#C9CFDA`, `#D7DCE5`, `#AEB6C2` 계열을 사용합니다.
- shadow는 얇게 쓰고, glass/blur는 글자가 흐려지지 않을 정도로만 씁니다.
- 플랫폼 표시는 `PlatformPill`을 재사용합니다.
- 상품 이미지는 `ProductVisual`을 재사용합니다.
- 버튼과 카드 톤은 `hairline.ts`를 먼저 확인합니다.
- 과한 검정 덩어리, 과투명, 보라/파랑 위주의 템플릿 느낌은 피합니다.

## 구현 상태

완료된 흐름:

- 메인 검색창에서 `/search` 이동
- 인기 검색어와 최근 검색어 저장
- 최근 검색 기반 상품 추천 영역
- 배너 4종과 배너별 액션
- 검색 결과 그리드, 플랫폼 필터, 정렬, 표시 줄 수 선택, 페이지네이션
- 상품 상세 팝업과 가격 인사이트
- 찜 목록과 최근 본 상품 로컬 저장
- 마이페이지 알림 탭
- 사이드 버튼, 알림 팝업, 가격 비교 진입
- 가격 비교 리스트, 상품 선택 팝업, 비교 그래프
- 관리자 대시보드 UI
- 약관/개인정보 안내 화면
- 로딩, 빈 상태, 에러 상태 UI

남은 작업:

- 로그인/회원가입 API 실제 연결
- 찜/최근 본 상품/알림/가격 비교 리스트의 계정 기반 저장
- 알림 읽음 처리와 알림 생성 API 연결
- 관리자 대시보드 API 연결
- 챗봇 UI와 챗봇 API 연결
- 가격 비교 시세 API 확정 후 그래프 데이터 교체
- 모바일 좁은 화면 최종 QA

## 유지보수 메모

- `PriceCompare*` 파일은 기능이 무거워서 이미 역할별로 나누었습니다.
- `Side*` 파일은 사이드 버튼 기능이 늘어날 것을 보고 버튼별로 분리했습니다.
- `RecentKeywordRecommendations.tsx`는 홈 화면이 커지지 않도록 별도 컴포넌트로 분리했습니다.
- `MyPage.tsx`는 아직 가장 큰 파일입니다. 기능이 더 늘어나면 `MyPageNotifications`, `MyPageProductLists`, `MyPageSettings`처럼 탭 단위 분리가 다음 우선순위입니다.
- 새 기능을 붙일 때는 `pages`에 모든 코드를 넣기보다, 화면 상태만 `pages`에 두고 반복 UI는 `components`로 빼는 방향이 좋습니다.

## 발표 전 확인 순서

1. 프론트 dev 서버를 `5178` 포트로 실행합니다.
2. `/`에서 검색창, 배너, 최근 검색 기반 추천, 추천 상품을 확인합니다.
3. `/search?q=아이폰`에서 필터, 정렬, 표시 줄 수, 페이지네이션을 확인합니다.
4. 상품 상세 팝업에서 찜, 알림, 챗봇, 가격 비교 리스트 추가 버튼을 확인합니다.
5. 사이드 가격 비교 버튼으로 가격 비교 팝업을 열고 2개 이상 상품 비교를 확인합니다.
6. 사이드 알림 버튼으로 알림 팝업이 최상단에 뜨는지 확인합니다.
7. `/mypage`에서 찜, 최근 본 상품, 알림, 가격 비교, 설정 탭을 확인합니다.
8. `/admin`에서 대시보드와 유저 조회 UI를 확인합니다.
