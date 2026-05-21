import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { PricePoint } from '../types/product';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';

type PriceInsightChartProps = {
  points: PricePoint[];
  keywordOptions: string[];
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

type AverageLabelPlacement = LabelBox & {
  lineGapStart: number;
  lineGapEnd: number;
  textX: number;
  textY: number;
};

type PriceRangeId = '3m' | '1m' | '1w';

const priceRangeOptions: Array<{ id: PriceRangeId; label: string; take: number | null }> = [
  { id: '3m', label: '3달', take: null },
  { id: '1m', label: '1달', take: 6 },
  { id: '1w', label: '1주', take: 4 },
];

const chartWidth = 720;
const chartHeight = 318;
const chartPadding = {
  top: 58,
  right: 48,
  bottom: 44,
  left: 132,
};
const chartLeft = chartPadding.left;
const chartRight = chartWidth - chartPadding.right;
const chartTop = chartPadding.top;
const chartBottom = chartHeight - chartPadding.bottom;
const chartInnerWidth = chartRight - chartLeft;
const chartInnerHeight = chartBottom - chartTop;

export function PriceInsightChart({
  points,
  keywordOptions,
}: PriceInsightChartProps) {
  const keywords = keywordOptions.length > 0 ? keywordOptions.slice(0, 6) : ['현재 상품'];
  const [activeKeywordIndex, setActiveKeywordIndex] = useState(0);
  const [activeRange, setActiveRange] = useState<PriceRangeId>('3m');
  const [isKeywordMenuOpen, setIsKeywordMenuOpen] = useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const activeKeyword = keywords[activeKeywordIndex] ?? keywords[0];
  const activePoints = createKeywordPoints(
    createRangePoints(points, activeRange),
    activeKeyword,
    activeRange
  );

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
  const path = buildSmoothPath(coordinates);
  const canMoveKeyword = keywords.length > 1;
  const activePointIndex = hoveredPointIndex ?? selectedPointIndex;
  const activeTooltipPoint =
    activePointIndex === null ? null : coordinates[activePointIndex] ?? null;
  const maxLabelText = `최고 ${formatWon(maxPrice)}`;
  const minLabelText = `최저 ${formatWon(minPrice)}`;
  const averageLabelText = `기간 평균 ${formatCompactWon(averagePrice)}`;
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
  const averageLabelPosition = getAverageLabelPlacement({
    averageY,
    text: averageLabelText,
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
    <section className="relative overflow-hidden rounded-[30px] border border-[#D6DEE9] bg-white/88 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.065),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-md">
      <div className="relative z-30 flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex min-w-0 items-center">
          <button
            type="button"
            onClick={() => setIsKeywordMenuOpen((current) => !current)}
            disabled={!canMoveKeyword}
            className={`inline-flex min-h-10 min-w-[120px] max-w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition disabled:cursor-default ${hairline.controlActive} ${hairline.focus}`}
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
              className="absolute left-0 top-12 z-40 grid min-w-[180px] gap-1 rounded-2xl border border-[#C9CFDA] bg-white/96 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-md"
            >
              {keywords.map((keyword, index) => {
                const isActive = index === activeKeywordIndex;

                return (
                  <button
                    key={`${keyword}-${index}`}
                    type="button"
                    role="menuitem"
                    onClick={() => selectKeyword(index)}
                    className={`flex min-h-9 items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm font-black transition ${hairline.focus} ${
                      isActive
                        ? 'border-[#111827] bg-white text-[#111827]'
                        : 'border-transparent bg-white text-[#4B5563] hover:border-[#C9CFDA] hover:bg-[#F7F9FC] hover:text-[#111827]'
                    }`}
                  >
                    <span className="truncate">{keyword}</span>
                    {isActive ? (
                      <span
                        aria-hidden="true"
                        className="rounded-full border border-[#C9CFDA] px-2 py-0.5 text-[10px] font-black text-[#6B7280]"
                      >
                        선택
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
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
        <div className="relative min-h-[318px] overflow-hidden rounded-[28px] border border-[#D7DEE9] bg-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.96)]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-full min-h-[318px] w-full overflow-visible"
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
              x2={averageLabelPosition.lineGapStart}
              y1={averageY}
              y2={averageY}
              stroke="#7D8796"
              strokeDasharray="8 10"
              strokeLinecap="round"
              strokeWidth="1.4"
              opacity="0.44"
            />
            <line
              x1={averageLabelPosition.lineGapEnd}
              x2={chartRight}
              y1={averageY}
              y2={averageY}
              stroke="#7D8796"
              strokeDasharray="8 10"
              strokeLinecap="round"
              strokeWidth="1.4"
              opacity="0.44"
            />
            <AverageLabel
              placement={averageLabelPosition}
              text={averageLabelText}
            />

            <path
              d={path}
              fill="none"
              stroke="#1D1D1F"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="6.8"
            />

            {coordinates.map((point, index) => {
              const isActive = index === activePointIndex;

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
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="15"
                    fill="transparent"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isActive ? 8.2 : index === coordinates.length - 1 ? 6.8 : 5}
                    fill="#FFFFFF"
                    stroke="#1D1D1F"
                    strokeWidth={isActive ? 3.8 : 3.2}
                  />
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

  // TODO(BE): 기간별 가격 히스토리 API가 들어오면 이 임시 slice를 제거하고 서버가 준 points를 그대로 사용합니다.
  return rangeOption.take ? points.slice(-rangeOption.take) : points;
}

function createKeywordPoints(
  points: PricePoint[],
  keyword: string,
  rangeId: PriceRangeId
) {
  // TODO(BE): 키워드별 가격 히스토리 API가 들어오면 이 임시 변형을 제거하고 서버 데이터를 그대로 사용합니다.
  const keywordShift = deterministicRatio(`${keyword}-${rangeId}`) * 0.08 - 0.04;

  return points.map((point, index) => {
    const wave = Math.sin(index + keyword.length + rangeId.length) * 0.018;
    const nextPrice = point.price * (1 + keywordShift + wave);

    return {
      ...point,
      price: Math.max(1000, Math.round(nextPrice / 1000) * 1000),
    };
  });
}

function buildSmoothPath(points: ChartPoint[]) {
  if (points.length < 2) {
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const midX = (previous.x + point.x) / 2;

    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
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

function AverageLabel({
  placement,
  text,
}: {
  placement: AverageLabelPlacement;
  text: string;
}) {
  return (
    <g transform={`translate(${placement.x}, ${placement.y})`}>
      <rect
        width={placement.width}
        height={placement.height}
        rx="12"
        fill="#FFFFFF"
        stroke="#C9CFDA"
        strokeWidth="1.1"
      />
      <text
        x={placement.textX}
        y={placement.textY}
        fill="#626873"
        fontSize="10.5"
        fontWeight="950"
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

function getAverageLabelPlacement({
  averageY,
  text,
}: {
  averageY: number;
  text: string;
}): AverageLabelPlacement {
  const width = Math.max(96, text.length * 6.45 + 22);
  const height = 24;
  const x = Math.max(10, chartLeft - width - 14);
  const y = clamp(averageY - height / 2, chartTop + 2, chartBottom - height - 2);

  return {
    x,
    y,
    width,
    height,
    lineGapStart: chartLeft,
    lineGapEnd: chartLeft,
    textX: 11,
    textY: 16,
  };
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

function deterministicRatio(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function formatCompactWon(value: number) {
  if (value >= 10000) {
    return `${Math.round(value / 10000).toLocaleString('ko-KR')}만원`;
  }

  return formatWon(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
