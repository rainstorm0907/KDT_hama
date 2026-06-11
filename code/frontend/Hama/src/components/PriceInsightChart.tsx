import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { ClusterInsight } from '../api/products';
import type { PricePoint } from '../types/product';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';

type PriceInsightChartProps = {
  // 클러스터 트렌드가 없을 때의 fallback(단일 상품 가격 이력)
  points: PricePoint[];
  // 같은 모델 관련 클러스터별 가격 트렌드. 있으면 드롭다운/그래프의 기준이 된다.
  clusters?: ClusterInsight[];
  // 클러스터 조회가 끝나기 전에 '현재 상품'으로 단정하지 않기 위한 로딩 플래그
  isClustersLoading?: boolean;
};

type ChartPoint = PricePoint & {
  x: number;
  y: number;
};

type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PointLabelPlacement = LabelBox & {
  anchor: 'start' | 'middle' | 'end';
  baselineY: number;
  textX: number;
};

type PriceRangeId = '3m' | '1m' | '1w';

const priceRangeOptions: Array<{ id: PriceRangeId; label: string; days: number | null }> = [
  { id: '3m', label: '3달', days: null },
  { id: '1m', label: '1달', days: 30 },
  { id: '1w', label: '1주', days: 7 },
];

const chartWidth = 720;
const chartHeight = 318;
const chartPadding = {
  top: 58,
  right: 48,
  bottom: 44,
  left: 24,
};
const chartLeft = chartPadding.left;
const chartRight = chartWidth - chartPadding.right;
const chartTop = chartPadding.top;
const chartBottom = chartHeight - chartPadding.bottom;
const chartInnerWidth = chartRight - chartLeft;
const chartInnerHeight = chartBottom - chartTop;

export function PriceInsightChart({
  points,
  clusters,
  isClustersLoading = false,
}: PriceInsightChartProps) {
  const clusterList = clusters ?? [];
  const hasClusters = clusterList.length > 0;
  const keywords = hasClusters
    ? clusterList.map((cluster) => cluster.clusterName)
    : [isClustersLoading ? '시세 분류 확인 중…' : '현재 상품'];
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  const [activeRange, setActiveRange] = useState<PriceRangeId>('3m');
  const [isKeywordMenuOpen, setIsKeywordMenuOpen] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  // 클러스터 목록이 바뀌어도 인덱스가 범위를 벗어나지 않도록 보정
  const safeKeywordIndex = Math.min(activeKeywordIndex, keywords.length - 1);
  const activeKeyword = keywords[safeKeywordIndex] ?? keywords[0];
  const activeSeries = hasClusters
    ? clusterList[safeKeywordIndex]?.points ?? []
    : points;
  const activePoints = createRangePoints(activeSeries, activeRange);

  if (activePoints.length === 0) {
    return (
      <section className={`rounded-[24px] p-5 ${hairline.panelSoft}`}>
        <p className={`text-sm font-semibold ${hairline.quietText}`}>
          가격 흐름을 표시할 데이터가 없습니다.
        </p>
      </section>
    );
  }

  const prices = activePoints.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = Math.round(
    prices.reduce((sum, price) => sum + price, 0) / prices.length
  );
  const range = Math.max(maxPrice - minPrice, 1);
  const lowerBound = Math.max(0, minPrice - range * 0.22);
  const upperBound = maxPrice + range * 0.24;
  const averageY = priceToY(averagePrice, upperBound, lowerBound);
  const coordinates = activePoints.map((point, index) => {
    const x =
      chartLeft +
      (index / Math.max(activePoints.length - 1, 1)) * chartInnerWidth;
    const y = priceToY(point.price, upperBound, lowerBound);

    return { ...point, x, y };
  });
  const latest = coordinates[coordinates.length - 1];
  const minPoint = coordinates.reduce(
    (currentMin, point) => (point.price < currentMin.price ? point : currentMin),
    coordinates[0]
  );
  const maxPoint = coordinates.reduce(
    (currentMax, point) => (point.price > currentMax.price ? point : currentMax),
    coordinates[0]
  );
  const path = buildMarketPath(coordinates);
  const canMoveKeyword = keywords.length > 1;
  const activePointIndex = hoveredPointIndex ?? selectedPointIndex;
  const activeTooltipPoint =
    activePointIndex === null ? null : coordinates[activePointIndex] ?? null;
  const maxLabelText = `최고 ${formatWon(maxPrice)}`;
  const minLabelText = `최저 ${formatWon(minPrice)}`;
  // 비교 차트와 동일하게 그래프 안에 ' 평균 859,100원' 형태로 표기한다.
  const averageLabelText = `평균 ${formatWon(averagePrice)}`;
  const visibleMarkerIndexes = getVisibleMarkerIndexes(coordinates, minPoint, maxPoint);
  const maxLabelPosition = getPointLabelPlacement({
    point: maxPoint,
    text: maxLabelText,
    preferredPlacement: 'above',
    occupiedBoxes: [],
  });
  const minLabelPosition = getPointLabelPlacement({
    point: minPoint,
    text: minLabelText,
    preferredPlacement: 'below',
    occupiedBoxes: [maxLabelPosition],
  });
  const selectKeyword = (index: number) => {
    setActiveKeywordIndex(index);
    setHoveredPointIndex(null);
    setSelectedPointIndex(null);
    setIsKeywordMenuOpen(false);
  };

  const selectRange = (rangeId: PriceRangeId) => {
    setActiveRange(rangeId);
    setHoveredPointIndex(null);
    setSelectedPointIndex(null);
  };

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-[#C6CDD8]/88 bg-white/72 p-4 shadow-[0_14px_40px_rgba(29,29,31,0.05),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.74),rgba(255,255,255,0.38)_46%,rgba(248,249,251,0.5))]" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-white/95" />

      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="relative flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => setIsKeywordMenuOpen((current) => !current)}
            disabled={!canMoveKeyword}
            className={`inline-flex min-h-10 min-w-[120px] max-w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black shadow-[0_12px_28px_rgba(17,24,39,0.12),inset_0_1px_0_rgba(255,255,255,0.98)] transition disabled:cursor-default ${hairline.controlActive} ${hairline.focus}`}
            aria-expanded={isKeywordMenuOpen}
            aria-haspopup="menu"
            aria-label="가격 그래프 키워드 선택"
          >
            <span className="truncate">{activeKeyword}</span>
            {canMoveKeyword ? (
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : null}
          </button>

          {isKeywordMenuOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-12 z-50 grid min-w-[210px] gap-1.5 rounded-[22px] border border-[#AEB7C5] bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,0.24),0_8px_18px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,1)]"
            >
              {keywords.map((keyword, index) => {
                const isActive = index === safeKeywordIndex;

                return (
                  <button
                    key={`${keyword}-${index}`}
                    type="button"
                    role="menuitem"
                    onClick={() => selectKeyword(index)}
                    className={`flex min-h-11 items-center rounded-2xl border px-4 text-left text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.98)] transition ${hairline.focus} ${
                      isActive
                        ? 'border-[#111827] bg-white text-[#111827] shadow-[0_10px_24px_rgba(17,24,39,0.11),inset_0_0_0_1px_rgba(17,24,39,0.72)]'
                        : 'border-[#E3E8F0] bg-[#F8FAFC] text-[#4B5563] hover:border-[#B8C1CF] hover:bg-white hover:text-[#111827] hover:shadow-[0_8px_18px_rgba(17,24,39,0.07)]'
                    }`}
                  >
                    <span className="truncate">{keyword}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-end gap-2"
          aria-label="가격 그래프 기간 선택"
        >
          {priceRangeOptions.map((option) => {
            const isActive = option.id === activeRange;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => selectRange(option.id)}
                className={`inline-flex h-10 min-w-[58px] items-center justify-center rounded-[18px] px-4 text-sm font-black transition-colors ${hairline.focus} ${
                  isActive
                    ? hairline.controlActive
                    : `${hairline.control} ${hairline.controlHover}`
                } active:border-black active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),0_8px_20px_rgba(29,29,31,0.035)]`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-10 mt-4">
        <div className="relative min-h-[318px] overflow-hidden rounded-[28px] border border-[#C9CFDA]/92 bg-white/58 shadow-[0_12px_32px_rgba(29,29,31,0.052),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(248,249,251,0.24))]" />
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="relative h-full min-h-[318px] w-full overflow-visible"
            role="img"
            aria-label={`${activeKeyword} 가격 흐름 그래프`}
          >
            {Array.from({ length: 3 }, (_, index) => {
              const y = chartTop + (index / 2) * chartInnerHeight;

              return (
                <line
                  key={index}
                  x1={chartLeft}
                  x2={chartRight}
                  y1={y}
                  y2={y}
                  stroke="#DCE3EC"
                  strokeDasharray="7 12"
                  strokeLinecap="round"
                  opacity="0.62"
                />
              );
            })}

            <line
              x1={chartLeft}
              x2={chartRight}
              y1={averageY}
              y2={averageY}
              stroke="#2C9A72"
              strokeDasharray="8 10"
              strokeLinecap="round"
              strokeWidth="1.4"
              opacity="0.44"
            />
            <text
              x={chartLeft + 6}
              y={averageY - 9}
              fill="#2C9A72"
              fontSize="11.5"
              fontWeight="950"
              textAnchor="start"
              paintOrder="stroke"
              stroke="#FFFFFF"
              strokeWidth="4"
              strokeLinejoin="round"
            >
              {averageLabelText}
            </text>

            <path
              d={path}
              fill="none"
              stroke="#B8C8F8"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth="12"
              opacity="0.34"
            />
            <path
              d={path}
              fill="none"
              stroke="#2F63E6"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              strokeWidth="5.8"
            />

            {coordinates.map((point, index) => {
              const isActive = index === activePointIndex;
              const previousPoint = coordinates[index - 1];
              const nextPoint = coordinates[index + 1];
              const hitBoxStart =
                previousPoint === undefined ? chartLeft : (previousPoint.x + point.x) / 2;
              const hitBoxEnd =
                nextPoint === undefined ? chartRight : (point.x + nextPoint.x) / 2;
              const shouldShowMarker = isActive || visibleMarkerIndexes.has(index);

              return (
                <g
                  key={`${point.label}-${index}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${point.label} 가격 ${formatWon(point.price)}`}
                  onMouseEnter={() => setHoveredPointIndex(index)}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                  onFocus={() => setHoveredPointIndex(index)}
                  onBlur={() => setHoveredPointIndex(null)}
                  onClick={() =>
                    setSelectedPointIndex((current) =>
                      current === index ? null : index
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedPointIndex((current) =>
                        current === index ? null : index
                      );
                    }
                  }}
                  className="cursor-pointer outline-none"
                >
                  <rect
                    x={hitBoxStart}
                    y={chartTop - 28}
                    width={Math.max(hitBoxEnd - hitBoxStart, 4)}
                    height={chartInnerHeight + 56}
                    fill="transparent"
                  />
                  {shouldShowMarker ? (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isActive ? 8.2 : index === coordinates.length - 1 ? 6.8 : 4.6}
                      fill="#FFFFFF"
                      stroke={isActive ? '#111827' : '#2F63E6'}
                      strokeWidth={isActive ? 3.8 : 3}
                    />
                  ) : null}
                </g>
              );
            })}

            <circle
              cx={minPoint.x}
              cy={minPoint.y}
              r="7.8"
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth="4"
              pointerEvents="none"
            />
            <circle
              cx={maxPoint.x}
              cy={maxPoint.y}
              r="7.8"
              fill="#EF4444"
              stroke="#FFFFFF"
              strokeWidth="4"
              pointerEvents="none"
            />

            <line
              x1={latest.x}
              x2={latest.x}
              y1={chartTop}
              y2={chartBottom}
              stroke="#CBD5E1"
              strokeDasharray="4 9"
              strokeLinecap="round"
              strokeWidth="1.4"
            />
            <circle
              cx={latest.x}
              cy={latest.y}
              r="7.8"
              fill="#22C55E"
              stroke="#FFFFFF"
              strokeWidth="4.5"
              pointerEvents="none"
            />

            <PointLabel
              placement={maxLabelPosition}
              text={maxLabelText}
              color="#EF4444"
            />
            <PointLabel
              placement={minLabelPosition}
              text={minLabelText}
              color="#059669"
            />

            {activeTooltipPoint ? (
              <PricePointTooltip
                point={activeTooltipPoint}
                value={formatWon(activeTooltipPoint.price)}
              />
            ) : null}
          </svg>
        </div>
      </div>
    </section>
  );
}

function priceToY(price: number, upper: number, lower: number) {
  return chartTop + ((upper - price) / Math.max(upper - lower, 1)) * chartInnerHeight;
}

function createRangePoints(points: PricePoint[], rangeId: PriceRangeId) {
  const rangeOption =
    priceRangeOptions.find((option) => option.id === rangeId) ?? priceRangeOptions[0];

  if (!rangeOption.days) {
    return points;
  }

  // 마지막 데이터 날짜 기준 N일 윈도우. 크롤링이 멈춘 기간에도 차트가 비지 않는다.
  const lastDate = parsePointDate(points[points.length - 1]);
  if (!lastDate) {
    return points;
  }

  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - (rangeOption.days - 1));

  return points.filter((point) => {
    const pointDate = parsePointDate(point);
    return pointDate === null || pointDate >= cutoff;
  });
}

function parsePointDate(point: PricePoint | undefined): Date | null {
  if (!point?.date) {
    return null;
  }

  const parsed = new Date(point.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildMarketPath(points: ChartPoint[]) {
  if (points.length < 2) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function getVisibleMarkerIndexes(
  points: ChartPoint[],
  minPoint: ChartPoint,
  maxPoint: ChartPoint
) {
  const indexes = new Set<number>();
  const latestIndex = points.length - 1;
  const minIndex = points.findIndex((point) => point === minPoint);
  const maxIndex = points.findIndex((point) => point === maxPoint);
  const markerStep = points.length > 48 ? 12 : points.length > 20 ? 6 : 1;

  points.forEach((_, index) => {
    if (
      index === 0 ||
      index === latestIndex ||
      index === minIndex ||
      index === maxIndex ||
      index % markerStep === 0
    ) {
      indexes.add(index);
    }
  });

  return indexes;
}

function PointLabel({
  placement,
  text,
  color,
}: {
  placement: PointLabelPlacement;
  text: string;
  color: string;
}) {
  return (
    <g transform={`translate(${placement.textX}, ${placement.baselineY})`}>
      <text
        x="0"
        y="0"
        fill={color}
        fontSize="11.5"
        fontWeight="950"
        textAnchor={placement.anchor}
        paintOrder="stroke"
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinejoin="round"
      >
        {text}
      </text>
    </g>
  );
}

function PricePointTooltip({
  point,
  value,
}: {
  point: ChartPoint;
  value: string;
}) {
  const width = Math.max(116, `${point.label} ${value}`.length * 7.4);
  const height = 48;
  const x = clamp(point.x - width / 2, chartLeft, chartRight - width);
  const shouldPlaceAbove = point.y > chartTop + height + 24;
  const y = shouldPlaceAbove ? point.y - height - 18 : point.y + 18;
  const markerY = shouldPlaceAbove ? y + height : y;

  return (
    <g pointerEvents="none">
      <line
        x1={point.x}
        x2={point.x}
        y1={point.y}
        y2={markerY}
        stroke="#111827"
        strokeDasharray="3 5"
        strokeLinecap="round"
        strokeWidth="1.2"
        opacity="0.34"
      />
      <g transform={`translate(${x}, ${y})`}>
        <rect
          width={width}
          height={height}
          rx="16"
          fill="#111827"
          opacity="0.96"
        />
        <text x="14" y="19" fill="#D1D5DB" fontSize="10.5" fontWeight="800">
          {point.label}
        </text>
        <text x="14" y="36" fill="#FFFFFF" fontSize="14" fontWeight="950">
          {value}
        </text>
      </g>
    </g>
  );
}

function getPointLabelPlacement({
  point,
  text,
  preferredPlacement,
  occupiedBoxes,
}: {
  point: ChartPoint;
  text: string;
  preferredPlacement: 'above' | 'below';
  occupiedBoxes: LabelBox[];
}) {
  const width = Math.max(70, text.length * 6.9);
  const height = 18;
  const preferredY = preferredPlacement === 'above' ? point.y - 28 : point.y + 14;
  const fallbackY = preferredPlacement === 'above' ? point.y + 18 : point.y - 28;
  const candidatePositions = [
    { x: point.x + 16, y: preferredY, anchor: 'start' as const, priority: 0 },
    { x: point.x - 16, y: preferredY, anchor: 'end' as const, priority: 1 },
    { x: point.x, y: preferredY, anchor: 'middle' as const, priority: 2 },
    { x: point.x + 16, y: fallbackY, anchor: 'start' as const, priority: 3 },
    { x: point.x - 16, y: fallbackY, anchor: 'end' as const, priority: 4 },
    { x: point.x, y: fallbackY, anchor: 'middle' as const, priority: 5 },
  ];

  const candidates = candidatePositions.map((candidate) => {
    const x = getAnchoredLabelX(candidate.x, width, candidate.anchor);
    const y = clamp(candidate.y, chartTop + 2, chartBottom - height);
    const box = {
      x,
      y,
      width,
      height,
      anchor: candidate.anchor,
      baselineY: y + 13,
      textX:
        candidate.anchor === 'start'
          ? x
          : candidate.anchor === 'end'
            ? x + width
            : x + width / 2,
    };

    return {
      ...box,
      score:
        candidate.priority * 10 +
        occupiedBoxes.reduce(
          (total, occupiedBox) => total + getOverlapArea(box, occupiedBox) * 4,
          0
        ) +
        getBoundsPenalty(box),
    };
  });

  return candidates.reduce((best, candidate) =>
    candidate.score < best.score ? candidate : best
  );
}

function getAnchoredLabelX(
  preferredX: number,
  width: number,
  anchor: PointLabelPlacement['anchor']
) {
  const rawX =
    anchor === 'start'
      ? preferredX
      : anchor === 'end'
        ? preferredX - width
        : preferredX - width / 2;

  return clamp(rawX, chartLeft + 2, chartRight - width - 2);
}

function getOverlapArea(firstBox: LabelBox, secondBox: LabelBox) {
  const xOverlap = Math.max(
    0,
    Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) -
      Math.max(firstBox.x, secondBox.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height) -
      Math.max(firstBox.y, secondBox.y)
  );

  return xOverlap * yOverlap;
}

function getBoundsPenalty(box: LabelBox) {
  const leftPenalty = Math.max(0, chartLeft - box.x);
  const rightPenalty = Math.max(0, box.x + box.width - chartRight);
  const topPenalty = Math.max(0, chartTop - box.y);
  const bottomPenalty = Math.max(0, box.y + box.height - chartBottom);

  return (leftPenalty + rightPenalty + topPenalty + bottomPenalty) * 20;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
