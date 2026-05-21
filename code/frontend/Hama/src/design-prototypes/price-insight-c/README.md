# Price Insight Design Session C

## 디자인 의도

`HamaDecisionInsightPrototype`는 기존 리셀/거래소형 시세 차트를 그대로 따라가지 않고, 사용자가 상품 상세 팝업 안에서 바로 구매 판단을 할 수 있게 만든 프로토타입입니다.

핵심은 가격선을 단순히 보여주는 것이 아니라 평균가를 기준으로 화면을 세 구간으로 나누는 것입니다.

- `기다림`: 평균보다 높은 가격대
- `관찰`: 평균가 근처의 애매한 가격대
- `구매`: 평균보다 낮아 구매 판단이 쉬운 가격대

시계열 가격선 위에 현재가, 최저가, 평균선, 평균 대비 퍼센트를 함께 올려서 한 화면에서 읽히도록 구성했습니다. Hama의 기존 둥근 모서리와 밝은 상품 상세 팝업 안에 들어갈 수 있도록 큰 radius, 부드러운 보더, 깨끗한 흰색 표면은 유지했습니다.

## 장점

- 진짜 시계열 그래프입니다. 날짜별 가격 흐름을 선형 path로 표시합니다.
- 평균가를 기준으로 `기다림 / 관찰 / 구매` 판단 구간이 바로 보입니다.
- 현재가와 최저가가 그래프 위에 직접 붙어 있어 숫자 박스를 따로 훑지 않아도 됩니다.
- `평균 대비`가 현재 포인트 옆에 붙어 가격 메리트가 즉시 보입니다.
- 키워드 전환 버튼을 포함해 추후 백엔드 키워드별 가격 흐름 API와 연결하기 쉽습니다.
- 기존 파일을 수정하지 않는 독립 프로토타입이라 다른 디자인 세션과 충돌하지 않습니다.

## 실제 통합 방법

현재 상품 상세 팝업은 아래 위치에서 기존 그래프를 사용합니다.

```tsx
// src/components/ProductDetailModal.tsx
<PriceInsightChart
  points={visibleProduct.priceHistory}
  keywordOptions={insightKeywords}
/>
```

이 프로토타입을 바로 시험하려면 import와 JSX만 바꾸면 됩니다.

```tsx
import { HamaDecisionInsightPrototype } from '../design-prototypes/price-insight-c/HamaDecisionInsightPrototype';

<HamaDecisionInsightPrototype
  points={visibleProduct.priceHistory}
  keywordOptions={insightKeywords}
  title="가격 인사이트"
/>
```

최종 반영 시에는 기존 `src/components/PriceInsightChart.tsx` 내부 구현을 이 구조로 교체하거나, 컴포넌트명을 `PriceInsightChart`로 옮긴 뒤 `ProductDetailModal.tsx`의 import는 그대로 유지하면 됩니다.

## 백엔드 연결 메모

현재 프로토타입의 판단 점수와 키워드별 가격 변형은 프론트 미리보기용 계산입니다. 실제 MVP 이후에는 백엔드에서 아래 값을 내려주는 방향이 더 좋습니다.

- 키워드별 가격 히스토리
- 평균가
- 최저가
- 현재가
- 평균 대비 퍼센트
- 구매 판단 상태 또는 점수

프론트는 최종적으로 계산보다 표시 역할에 집중하는 구조가 좋습니다.
