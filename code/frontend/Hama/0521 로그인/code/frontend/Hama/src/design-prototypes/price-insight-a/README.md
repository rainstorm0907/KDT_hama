# Price Insight Prototype A

## 방향

`KREAM/StockX`류 리셀 시세 화면을 기준으로, 상품 상세 팝업 안에서 바로 “지금 이 가격이 좋은가?”를 읽게 하는 프리미엄 마켓 그래프입니다.

핵심은 단순 가격선 하나가 아니라 다음 네 가지 정보를 한 카드 안에 겹쳐 보여주는 것입니다.

- 실거래가 라인: 최근 체결가 흐름을 가장 두껍고 밝게 표시합니다.
- Bid/Ask 스프레드 밴드: 구매 희망가와 판매 희망가 사이의 간격을 보라/민트 그라데이션 띠로 표시합니다.
- 평균선: 사용자가 현재가를 비교할 수 있도록 얇은 점선으로 유지합니다.
- 최근 체결 테이프: 하단에 거래 강도를 작은 라인/점으로 표시해 시장감이 느껴지게 합니다.

## 장점

- 막대형 범위 UI가 아니라 실제 시계열 그래프처럼 읽힙니다.
- 기존 Hama의 둥근 모서리와 글래스 톤은 유지하되, 차트 내부는 어두운 리셀 마켓 패널로 과감하게 분리했습니다.
- `PricePoint[]`만 있으면 동작하므로 현재 `Product.priceHistory`와 바로 연결 가능합니다.
- `loading`, `empty`, `error` 상태를 컴포넌트 안에 포함했습니다.
- `any` 없이 타입을 고정했습니다.

## 통합 방법

현재 상품 상세 팝업은 아래 경로에서 기존 그래프를 렌더링합니다.

```tsx
// src/components/ProductDetailModal.tsx
import { PriceInsightChart } from './PriceInsightChart';
```

프로토타입 A를 실제 화면에 꽂아보려면 import를 아래처럼 바꾸고,

```tsx
import { PremiumResalePriceInsightPrototype } from '../design-prototypes/price-insight-a';
```

렌더링 부분을 아래처럼 교체하면 됩니다.

```tsx
<PremiumResalePriceInsightPrototype
  points={visibleProduct.priceHistory}
  keywordOptions={insightKeywords}
  productName={visibleProduct.name}
  currentPrice={visibleProduct.price}
/>
```

## 실제 적용 전에 조정하면 좋은 부분

- 백엔드에서 bid/ask 또는 플랫폼별 최근 체결 데이터를 주면 `buildMarket` 내부의 임시 스프레드 계산을 제거합니다.
- 모바일 팝업에서는 카드가 세로로 길어질 수 있으므로 `chartHeight`를 340 정도로 줄이는 옵션을 추가할 수 있습니다.
- 현재 색상은 세션 A의 과감한 방향 확인용입니다. 최종 선택 시 Hama 전역 토큰으로 분리하는 편이 좋습니다.
