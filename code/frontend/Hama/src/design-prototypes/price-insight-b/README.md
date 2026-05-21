# Price Insight B - Steam Volume Prototype

## 디자인 의도

Steam 장터처럼 가격만 보여주는 그래프가 아니라, 가격선과 거래량을 같은 시야에 둔 시장형 차트입니다. Hama의 둥근 모서리와 pill 버튼 톤은 유지하되, 차트 내부는 어두운 마켓 터미널 느낌으로 과감하게 바꿨습니다.

핵심 구성은 다음과 같습니다.

- 상단: 키워드 선택 버튼
- 중앙: 가격 흐름 라인 + 평균선 + 현재가 라벨 + 최저가 라벨
- 하단: 거래량 막대
- 우측: 평균가, 거래 밀도, 평균 대비 가격 요약

현재 프론트 타입에는 거래량 필드가 없어서, 프로토타입 내부에서 임시 거래량을 계산합니다. 실제 통합 시에는 백엔드가 키워드별 매물 수/거래량을 내려주면 이 임시 계산을 제거하면 됩니다.

## 장점

- 가격이 내려갔는지뿐 아니라, 해당 구간에 매물이 얼마나 몰렸는지 같이 읽을 수 있습니다.
- 평균선과 현재 위치가 분리되어 있어 현재 가격이 비싼지 싼지 빠르게 판단됩니다.
- 기존 `PricePoint[]`를 그대로 받을 수 있어서 현재 화면에 붙이는 비용이 낮습니다.
- loading, empty, error 상태를 컴포넌트 안에 포함했습니다.

## 통합 위치

실제 `PriceInsightChart`에 반영하려면 아래 흐름으로 옮기면 됩니다.

1. `src/components/PriceInsightChart.tsx`에서 Steam 프리셋 렌더링 함수를 이 프로토타입 구조로 교체합니다.
2. 현재 `PricePoint`가 `label`, `price`만 갖고 있으므로, 백엔드가 거래량을 주기 전까지는 `buildMarketModel()`의 임시 volume 계산을 유지합니다.
3. 백엔드 연결 후에는 `PricePoint` 또는 별도 DTO에 `volume` 필드를 추가하고, `syntheticVolumes` 계산을 API 값으로 바꿉니다.
4. 상품 상세 팝업에서는 기존처럼 `points={visibleProduct.priceHistory}`와 `keywordOptions={...}`만 넘기면 됩니다.

## 파일

- `SteamVolumePriceInsightPrototype.tsx`
