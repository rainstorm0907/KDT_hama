import { useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { PricePoint } from '../../types/product';
import { formatWon } from '../../utils/format';

type JudgmentTone = 'buy' | 'watch' | 'wait';

type HamaDecisionInsightPrototypeProps = {
  points: PricePoint[];
  keywordOptions?: string[];
  title?: string;
  className?: string;
};

type ChartPoint = PricePoint & {
  x: number;
  y: number;
};

type Judgment = {
  tone: JudgmentTone;
  label: string;
  detail: string;
  score: number;
};

const chartWidth = 760;
const chartHeight = 360;
const chartPadding = {
  top: 54,
  right: 82,
  bottom: 70,
  left: 70,
};
const chartLeft = chartPadding.left;
const chartRight = chartWidth - chartPadding.right;
const chartTop = chartPadding.top;
const chartBottom = chartHeight - chartPadding.bottom;
const chartInnerWidth = chartRight - chartLeft;
const chartInnerHeight = chartBottom - chartTop;

const demoPoints: PricePoint[] = [
  { label: '4/20', price: 1580000 },
  { label: '4/23', price: 1562000 },
  { label: '4/26', price: 1538000 },
  { label: '4/29', price: 1549000 },
  { label: '5/02', price: 1518000 },
  { label: '5/05', price: 1509000 },
  { label: '5/08', price: 1523000 },
  { label: '오늘', price: 1512000 },
];

const keywordDemo = ['아이폰 17', '아이폰', '512GB'];

export function HamaDecisionInsightPrototype({
  points,
  keywordOptions = keywordDemo,
  title = '가격 인사이트',
  className = '',
}: HamaDecisionInsightPrototypeProps) {
  const gradientId = useId().replace(/:/g, '');
  const availableKeywords =
    keywordOptions.length > 0 ? keywordOptions : ['현재 상품'];
  const safePoints = points.length > 0 ? points : demoPoints;
  const [keywordIndex, setKeywordIndex] = useState(0);
  const activeKeyword =
    availableKeywords[keywordIndex % availableKeywords.length] ?? '현재 상품';

  const model = useMemo(
    () => buildDecisionModel(safePoints, activeKeyword),
    [activeKeyword, safePoints]
  );

  const {
    coordinates,
    averagePrice,
    minPoint,
    latestPoint,
    latestPrice,
    minPrice,
    averageY,
    buyZoneY,
    waitZoneY,
    linePath,
    areaPath,
    judgment,
    deltaPercent,
  } = model;

  const isPositive = deltaPercent <= 0;
  const statusTone = getToneStyle(judgment.tone);
  const canMoveKeyword = availableKeywords.length > 1;

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-[#D8DEE8] bg-[#FAFBFD] p-5 text-[#0B1220] shadow-[0_24px_64px_rgba(15,23,42,0.10)] ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-black text-[#7B8798]">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-black ${statusTone.badge}`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {judgment.label}
            </span>
            <span className="rounded-full border border-[#DDE3EE] bg-white/80 px-3 py-1.5 text-sm font-extrabold text-[#556070]">
              판단 점수 {judgment.score}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-[#697386]">
            {judgment.detail}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="이전 키워드"
            disabled={!canMoveKeyword}
            onClick={() =>
              setKeywordIndex((current) =>
                current === 0 ? availableKeywords.length - 1 : current - 1
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D6DEE9] bg-white text-[#111827] shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-[#AEB8C8] disabled:opacity-35"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-28 rounded-full border border-[#C7D0DE] bg-white px-4 py-2 text-center text-sm font-black text-[#111827] shadow-[0_8px_18px_rgba(15,23,42,0.07)]">
            {activeKeyword}
          </div>
          <button
            type="button"
            aria-label="다음 키워드"
            disabled={!canMoveKeyword}
            onClick={() =>
              setKeywordIndex((current) => (current + 1) % availableKeywords.length)
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D6DEE9] bg-white text-[#111827] shadow-[0_8px_18px_rgba(15,23,42,0.08)] transition hover:border-[#AEB8C8] disabled:opacity-35"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-[24px] border border-[#E0E6EF] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
        <svg
          className="h-auto w-full overflow-visible"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${activeKeyword} 가격 흐름 그래프. 현재가는 ${formatWon(
            latestPrice
          )}, 평균가는 ${formatWon(averagePrice)}입니다.`}
        >
          <defs>
            <linearGradient
              id={`${gradientId}-line-fill`}
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#2F6BFF" stopOpacity="0.24" />
              <stop offset="62%" stopColor="#2F6BFF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#2F6BFF" stopOpacity="0" />
            </linearGradient>
            <filter
              id={`${gradientId}-soft-shadow`}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="10"
                floodColor="#1D4ED8"
                floodOpacity="0.16"
                stdDeviation="10"
              />
            </filter>
          </defs>

          <rect
            x={chartLeft}
            y={chartTop}
            width={chartInnerWidth}
            height={waitZoneY - chartTop}
            rx="18"
            fill="#FFF4ED"
          />
          <rect
            x={chartLeft}
            y={waitZoneY}
            width={chartInnerWidth}
            height={buyZoneY - waitZoneY}
            fill="#F8FAFC"
          />
          <rect
            x={chartLeft}
            y={buyZoneY}
            width={chartInnerWidth}
            height={chartBottom - buyZoneY}
            rx="18"
            fill="#ECFFF6"
          />

          <ZoneLabel x={chartLeft + 18} y={chartTop + 28} label="기다림" />
          <ZoneLabel x={chartLeft + 18} y={waitZoneY + 28} label="관찰" />
          <ZoneLabel x={chartLeft + 18} y={buyZoneY + 28} label="구매" />

          {Array.from({ length: 4 }, (_, index) => {
            const y = chartTop + (index / 3) * chartInnerHeight;

            return (
              <line
                key={index}
                x1={chartLeft}
                x2={chartRight}
                y1={y}
                y2={y}
                stroke="#DCE3EE"
                strokeDasharray="6 10"
                strokeWidth="1.4"
              />
            );
          })}

          <path
            d={areaPath}
            fill={`url(#${gradientId}-line-fill)`}
            pointerEvents="none"
          />
          <line
            x1={chartLeft}
            x2={chartRight}
            y1={averageY}
            y2={averageY}
            stroke="#8B95A7"
            strokeDasharray="10 9"
            strokeWidth="1.8"
          />
          <text
            x={chartRight - 4}
            y={averageY - 9}
            fill="#7A8494"
            fontSize="13"
            fontWeight="900"
            textAnchor="end"
          >
            평균 {formatCompactWon(averagePrice)}
          </text>

          <path
            d={linePath}
            fill="none"
            filter={`url(#${gradientId}-soft-shadow)`}
            stroke="#2F6BFF"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="7"
          />

          {coordinates.map((point, index) => (
            <circle
              key={`${point.label}-${index}`}
              cx={point.x}
              cy={point.y}
              r={index === coordinates.length - 1 ? 7.5 : 6}
              fill="#FFFFFF"
              stroke="#2F6BFF"
              strokeWidth="4"
            />
          ))}

          <line
            x1={latestPoint.x}
            x2={latestPoint.x}
            y1={chartTop + 8}
            y2={chartBottom}
            stroke="#BBC5D4"
            strokeDasharray="5 8"
            strokeWidth="1.5"
          />
          <circle
            cx={latestPoint.x}
            cy={latestPoint.y}
            r="9"
            fill={isPositive ? '#16A66A' : '#F97316'}
            stroke="#FFFFFF"
            strokeWidth="4"
          />

          <FloatingLabel
            x={latestPoint.x - 112}
            y={Math.max(chartTop + 12, latestPoint.y - 62)}
            title="현재가"
            value={formatWon(latestPrice)}
            tone={isPositive ? 'good' : 'warn'}
          />
          <FloatingLabel
            x={Math.max(chartLeft + 10, minPoint.x - 88)}
            y={Math.min(chartBottom - 42, minPoint.y + 34)}
            title="최저가"
            value={formatWon(minPrice)}
            tone="good"
          />
          <DeltaTag
            x={Math.min(chartRight - 138, latestPoint.x - 130)}
            y={latestPoint.y + 18}
            percent={deltaPercent}
          />

          <text
            x={chartLeft}
            y={chartBottom + 42}
            fill="#8A94A6"
            fontSize="13"
            fontWeight="800"
          >
            {coordinates[0]?.label}
          </text>
          <text
            x={chartRight}
            y={chartBottom + 42}
            fill="#8A94A6"
            fontSize="13"
            fontWeight="800"
            textAnchor="end"
          >
            {latestPoint.label}
          </text>
        </svg>

        <div className="grid grid-cols-3 gap-2.5">
          <MetricPill label="최저가" value={formatWon(minPrice)} tone="green" />
          <MetricPill label="평균가" value={formatWon(averagePrice)} tone="plain" />
          <MetricPill
            label="평균 대비"
            value={`${deltaPercent > 0 ? '+' : ''}${deltaPercent.toFixed(1)}%`}
            tone={isPositive ? 'green' : 'orange'}
          />
        </div>
      </div>
    </section>
  );
}

function buildDecisionModel(points: PricePoint[], keyword: string) {
  const keywordPoints = createKeywordAdjustedPoints(points, keyword);
  const prices = keywordPoints.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const averagePrice = Math.round(
    prices.reduce((sum, price) => sum + price, 0) / prices.length
  );
  const latestPrice = prices[prices.length - 1] ?? averagePrice;
  const rawRange = Math.max(maxPrice - minPrice, averagePrice * 0.08, 1);
  const lowerBound = Math.max(0, Math.min(minPrice, averagePrice * 0.94) - rawRange * 0.18);
  const upperBound = Math.max(maxPrice, averagePrice * 1.07) + rawRange * 0.16;

  const toY = (price: number) =>
    chartBottom -
    ((price - lowerBound) / Math.max(upperBound - lowerBound, 1)) *
      chartInnerHeight;

  const coordinates = keywordPoints.map((point, index) => {
    const x =
      chartLeft +
      (index / Math.max(keywordPoints.length - 1, 1)) * chartInnerWidth;

    return {
      ...point,
      x,
      y: toY(point.price),
    };
  });

  const latestPoint = coordinates[coordinates.length - 1] ?? {
    label: '현재',
    price: latestPrice,
    x: chartRight,
    y: toY(latestPrice),
  };
  const minPoint = coordinates.reduce(
    (candidate, point) => (point.price < candidate.price ? point : candidate),
    coordinates[0] ?? latestPoint
  );
  const averageY = toY(averagePrice);
  const waitZoneY = toY(averagePrice * 1.035);
  const buyZoneY = toY(averagePrice * 0.985);
  const linePath = buildSmoothPath(coordinates);
  const areaPath = `${linePath} L ${latestPoint.x} ${chartBottom} L ${chartLeft} ${chartBottom} Z`;
  const deltaPercent =
    averagePrice === 0 ? 0 : ((latestPrice - averagePrice) / averagePrice) * 100;
  const recentTrend = getRecentTrend(keywordPoints);
  const judgment = buildJudgment(deltaPercent, recentTrend);

  return {
    coordinates,
    averagePrice,
    minPoint,
    latestPoint,
    latestPrice,
    minPrice,
    averageY,
    buyZoneY,
    waitZoneY,
    linePath,
    areaPath,
    judgment,
    deltaPercent,
  };
}

function createKeywordAdjustedPoints(points: PricePoint[], keyword: string) {
  const ratio = deterministicRatio(keyword);

  return points.map((point, index) => {
    const wave = Math.sin(index * 0.92 + ratio * 4.5) * 0.018;
    const drift = (ratio - 0.5) * 0.045;

    return {
      ...point,
      price: Math.max(1, Math.round(point.price * (1 + wave + drift))),
    };
  });
}

function buildJudgment(deltaPercent: number, recentTrend: number): Judgment {
  const rawScore = 68 - deltaPercent * 5.2 - recentTrend * 2.4;
  const score = Math.round(clamp(rawScore, 12, 96));

  if (score >= 74) {
    return {
      tone: 'buy',
      label: '구매 신호',
      detail: '현재가가 평균선 아래에 있고 최근 흐름도 부담이 낮습니다.',
      score,
    };
  }

  if (score >= 54) {
    return {
      tone: 'watch',
      label: '관찰 구간',
      detail: '평균가 근처라 가격이 한 번 더 내려오는지 보는 구간입니다.',
      score,
    };
  }

  return {
    tone: 'wait',
    label: '기다림 추천',
    detail: '현재가는 평균보다 높거나 최근 반등 폭이 있어 급하게 살 이유가 적습니다.',
    score,
  };
}

function getRecentTrend(points: PricePoint[]) {
  if (points.length < 2) {
    return 0;
  }

  const previous = points[points.length - 2]?.price ?? points[0].price;
  const latest = points[points.length - 1]?.price ?? previous;

  return previous === 0 ? 0 : ((latest - previous) / previous) * 100;
}

function buildSmoothPath(points: ChartPoint[]) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }

    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) * 0.46;

    return `${path} C ${previous.x + controlDistance} ${previous.y}, ${
      point.x - controlDistance
    } ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function deterministicRatio(input: string) {
  const total = Array.from(input).reduce(
    (sum, character, index) => sum + character.charCodeAt(0) * (index + 7),
    0
  );

  return (total % 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getToneStyle(tone: JudgmentTone) {
  if (tone === 'buy') {
    return {
      badge: 'border-[#BDEFD8] bg-[#EFFFF7] text-[#04784F]',
    };
  }

  if (tone === 'watch') {
    return {
      badge: 'border-[#D5DDEC] bg-[#F8FAFE] text-[#304056]',
    };
  }

  return {
    badge: 'border-[#FFD8B5] bg-[#FFF5EC] text-[#B45309]',
  };
}

function formatCompactWon(price: number) {
  if (price >= 100000000) {
    return `${Math.round(price / 10000000) / 10}억`;
  }

  if (price >= 10000) {
    return `${Math.round(price / 10000)}만`;
  }

  return `${price.toLocaleString('ko-KR')}원`;
}

function ZoneLabel({
  x,
  y,
  label,
}: {
  x: number;
  y: number;
  label: string;
}) {
  return (
    <g>
      <rect x={x - 8} y={y - 18} width="62" height="28" rx="14" fill="#FFFFFFA8" />
      <text x={x + 23} y={y} fill="#7B8798" fontSize="12" fontWeight="900" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}

function FloatingLabel({
  x,
  y,
  title,
  value,
  tone,
}: {
  x: number;
  y: number;
  title: string;
  value: string;
  tone: 'good' | 'warn';
}) {
  const color = tone === 'good' ? '#04784F' : '#B45309';
  const background = tone === 'good' ? '#ECFFF6' : '#FFF5EC';
  const border = tone === 'good' ? '#BDEFD8' : '#FFD8B5';

  return (
    <g>
      <rect
        x={x}
        y={y}
        width="124"
        height="54"
        rx="16"
        fill={background}
        stroke={border}
        strokeWidth="1.5"
      />
      <text x={x + 16} y={y + 21} fill={color} fontSize="12" fontWeight="900">
        {title}
      </text>
      <text x={x + 16} y={y + 40} fill="#0B1220" fontSize="16" fontWeight="950">
        {value}
      </text>
    </g>
  );
}

function DeltaTag({
  x,
  y,
  percent,
}: {
  x: number;
  y: number;
  percent: number;
}) {
  const isPositive = percent <= 0;
  const label = `${isPositive ? '▼' : '▲'} 평균 대비 ${
    percent > 0 ? '+' : ''
  }${percent.toFixed(1)}%`;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width="148"
        height="34"
        rx="17"
        fill={isPositive ? '#EFFFF7' : '#FFF5EC'}
        stroke={isPositive ? '#BDEFD8' : '#FFD8B5'}
        strokeWidth="1.5"
      />
      <text
        x={x + 74}
        y={y + 22}
        fill={isPositive ? '#04784F' : '#B45309'}
        fontSize="13"
        fontWeight="950"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

function MetricPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'green' | 'orange' | 'plain';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-[#BDEFD8] bg-[#F0FFF8] text-[#057A51]'
      : tone === 'orange'
        ? 'border-[#FFD8B5] bg-[#FFF6ED] text-[#B45309]'
        : 'border-[#DDE3EE] bg-white text-[#344054]';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="text-xs font-black opacity-70">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
