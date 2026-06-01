import { useMemo, useState } from 'react';
import { ChevronRight, CircleDollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import type { PricePoint } from '../../types/product';
import { formatWon } from '../../utils/format';

type MarketDirection = 'up' | 'down' | 'flat';

type ResaleMarketPoint = PricePoint & {
  x: number;
  y: number;
  bidPrice: number;
  askPrice: number;
  bidY: number;
  askY: number;
  volume: number;
  direction: MarketDirection;
};

export type PremiumResalePriceInsightProps = {
  points: PricePoint[];
  keywordOptions?: string[];
  productName?: string;
  currentPrice?: number;
  isLoading?: boolean;
  errorMessage?: string | null;
  className?: string;
};

const chartWidth = 760;
const chartHeight = 390;
const plot = {
  top: 58,
  right: 64,
  bottom: 84,
  left: 58,
};
const plotLeft = plot.left;
const plotRight = chartWidth - plot.right;
const plotTop = plot.top;
const plotBottom = chartHeight - plot.bottom;
const plotWidth = plotRight - plotLeft;
const plotHeight = plotBottom - plotTop;

const demoPoints: PricePoint[] = [
  { label: '4/18', price: 1600000 },
  { label: '4/21', price: 1585000 },
  { label: '4/24', price: 1598000 },
  { label: '4/27', price: 1550000 },
  { label: '4/30', price: 1531000 },
  { label: '5/03', price: 1547000 },
  { label: '5/06', price: 1542000 },
  { label: '5/09', price: 1550000 },
];

export function PremiumResalePriceInsightPrototype({
  points,
  keywordOptions = ['아이폰 17', '아이폰', '512GB'],
  productName = '프리미엄 리셀 시세',
  currentPrice,
  isLoading = false,
  errorMessage = null,
  className,
}: PremiumResalePriceInsightProps) {
  const safeKeywords = keywordOptions.length > 0 ? keywordOptions.slice(0, 4) : ['현재 상품'];
  const [activeKeyword, setActiveKeyword] = useState(safeKeywords[0]);
  const sourcePoints = points.length > 0 ? points : demoPoints;

  const market = useMemo(
    () => buildMarket(sourcePoints, activeKeyword, currentPrice),
    [activeKeyword, currentPrice, sourcePoints]
  );

  if (isLoading) {
    return <PrototypeShell className={className} state="loading" />;
  }

  if (errorMessage) {
    return <PrototypeShell className={className} state="error" message={errorMessage} />;
  }

  if (sourcePoints.length === 0) {
    return <PrototypeShell className={className} state="empty" />;
  }

  const latest = market.points[market.points.length - 1];
  const first = market.points[0];
  const changeRate = first.price === 0 ? 0 : ((latest.price - first.price) / first.price) * 100;
  const spreadRate =
    latest.price === 0 ? 0 : ((latest.askPrice - latest.bidPrice) / latest.price) * 100;
  const isBelowAverage = latest.price <= market.averagePrice;
  const deltaFromAverage =
    market.averagePrice === 0 ? 0 : ((latest.price - market.averagePrice) / market.averagePrice) * 100;

  return (
    <section
      className={[
        'overflow-hidden rounded-[28px] border border-[#172033] bg-[#0A0F1C] text-white',
        'shadow-[0_26px_70px_rgba(7,12,23,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${productName} 가격 인사이트 프로토타입 A`}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(89,255,190,0.2),transparent_32%),radial-gradient(circle_at_92%_4%,rgba(117,142,255,0.2),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_44%)]" />

        <div className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
                <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                resale market
              </div>
              <h3 className="text-[22px] font-black leading-tight tracking-[-0.01em] text-white">
                실거래가 중심 시세
              </h3>
              <p className="mt-1 text-sm font-semibold text-white/52">
                최근 체결가, 호가 스프레드, 평균선을 한 번에 비교합니다.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-right">
              <MarketStat label="최근 체결" value={formatWon(latest.price)} />
              <MarketStat label="스프레드" value={`${spreadRate.toFixed(1)}%`} />
              <MarketStat
                label="평균 대비"
                value={`${deltaFromAverage > 0 ? '+' : ''}${deltaFromAverage.toFixed(1)}%`}
                tone={isBelowAverage ? 'good' : 'watch'}
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
            {safeKeywords.map((keyword) => {
              const isActive = keyword === activeKeyword;

              return (
                <button
                  key={keyword}
                  type="button"
                  onClick={() => setActiveKeyword(keyword)}
                  className={[
                    'h-10 shrink-0 rounded-full border px-4 text-sm font-black transition duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#0A0F1C]',
                    isActive
                      ? 'border-emerald-300 bg-emerald-300 text-[#07120D] shadow-[0_10px_28px_rgba(45,228,164,0.22)]'
                      : 'border-white/12 bg-white/[0.06] text-white/68 hover:border-white/24 hover:bg-white/[0.1] hover:text-white',
                  ].join(' ')}
                >
                  {keyword}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/10 bg-[#0E1526]/88 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label={`${activeKeyword} 실거래 시세 그래프`}
              className="h-auto w-full"
            >
              <defs>
                <linearGradient id="prototype-a-band" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.36" />
                  <stop offset="48%" stopColor="#2DD4BF" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.04" />
                </linearGradient>
                <linearGradient id="prototype-a-line-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2DE4A4" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#2DE4A4" stopOpacity="0" />
                </linearGradient>
                <filter id="prototype-a-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect
                x="1"
                y="1"
                width={chartWidth - 2}
                height={chartHeight - 2}
                rx="24"
                fill="#0B1220"
                stroke="rgba(255,255,255,0.08)"
              />

              {market.gridLines.map((line) => (
                <g key={line.price}>
                  <line
                    x1={plotLeft}
                    x2={plotRight}
                    y1={line.y}
                    y2={line.y}
                    stroke="rgba(226,232,240,0.13)"
                    strokeDasharray="6 12"
                    strokeLinecap="round"
                  />
                  <text x={plotRight + 12} y={line.y + 4} fill="rgba(226,232,240,0.36)" fontSize="12" fontWeight="800">
                    {compactWon(line.price)}
                  </text>
                </g>
              ))}

              <path d={market.spreadPath} fill="url(#prototype-a-band)" />
              <path
                d={market.areaPath}
                fill="url(#prototype-a-line-fill)"
                opacity="0.88"
              />

              <line
                x1={plotLeft}
                x2={plotRight}
                y1={market.averageY}
                y2={market.averageY}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1.8"
                strokeDasharray="8 9"
                strokeLinecap="round"
              />
              <text
                x={plotRight - 112}
                y={market.averageY - 10}
                fill="rgba(255,255,255,0.64)"
                fontSize="13"
                fontWeight="900"
              >
                평균선
              </text>

              {market.points.map((point, index) => (
                <g key={`${point.label}-${point.price}`}>
                  <line
                    x1={point.x}
                    x2={point.x}
                    y1={plotBottom + 22}
                    y2={plotBottom + 22 - point.volume}
                    stroke={point.direction === 'up' ? '#7CFFB2' : '#6EA8FF'}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                  <circle
                    cx={point.x}
                    cy={plotBottom + 22 - point.volume}
                    r="4.5"
                    fill={point.direction === 'up' ? '#7CFFB2' : '#6EA8FF'}
                    opacity="0.84"
                  />
                  {index % 2 === 0 ? (
                    <text
                      x={point.x}
                      y={plotBottom + 56}
                      fill="rgba(226,232,240,0.38)"
                      fontSize="12"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {point.label}
                    </text>
                  ) : null}
                </g>
              ))}

              <path
                d={market.linePath}
                fill="none"
                stroke="#2DE4A4"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#prototype-a-soft-glow)"
              />
              <path
                d={market.linePath}
                fill="none"
                stroke="#EFFFF8"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {market.points.map((point, index) => {
                const isLatest = index === market.points.length - 1;
                const isLow = point.price === market.lowestPoint.price;

                return (
                  <g key={`${point.label}-dot`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isLatest || isLow ? 8 : 5.5}
                      fill={isLatest ? '#2DE4A4' : isLow ? '#FBBF24' : '#0A0F1C'}
                      stroke={isLatest || isLow ? '#FFFFFF' : '#EFFFF8'}
                      strokeWidth="3"
                    />
                  </g>
                );
              })}

              <g transform={`translate(${market.lowestPoint.x - 66}, ${market.lowestPoint.y + 18})`}>
                <rect width="132" height="34" rx="17" fill="#FBBF24" fillOpacity="0.16" stroke="#FBBF24" strokeOpacity="0.54" />
                <text x="66" y="22" textAnchor="middle" fill="#FDE68A" fontSize="13" fontWeight="950">
                  저점 {formatWon(market.lowestPoint.price)}
                </text>
              </g>

              <g transform={`translate(${Math.min(latest.x - 116, plotRight - 158)}, ${Math.max(latest.y - 58, plotTop + 4)})`}>
                <rect width="158" height="46" rx="18" fill="rgba(255,255,255,0.92)" />
                <text x="15" y="18" fill="#64748B" fontSize="11" fontWeight="900">
                  최근 체결가
                </text>
                <text x="15" y="35" fill="#0A0F1C" fontSize="15" fontWeight="950">
                  {formatWon(latest.price)}
                </text>
              </g>

              <g transform={`translate(${plotLeft}, 24)`}>
                <text fill="rgba(255,255,255,0.84)" fontSize="13" fontWeight="900">
                  Bid / Ask 스프레드
                </text>
                <circle cx="144" cy="-4" r="5" fill="#8B5CF6" opacity="0.84" />
                <circle cx="162" cy="-4" r="5" fill="#2DD4BF" opacity="0.84" />
              </g>
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard label="최저 체결" value={formatWon(market.lowestPoint.price)} tone="green" />
            <SummaryCard label="평균 체결" value={formatWon(market.averagePrice)} tone="blue" />
            <SummaryCard
              label="흐름"
              value={`${changeRate > 0 ? '+' : ''}${changeRate.toFixed(1)}%`}
              tone={changeRate <= 0 ? 'green' : 'amber'}
              icon={changeRate <= 0 ? 'down' : 'up'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function PrototypeShell({
  className,
  state,
  message,
}: {
  className?: string;
  state: 'loading' | 'empty' | 'error';
  message?: string;
}) {
  const label =
    state === 'loading'
      ? '시세 데이터를 불러오는 중입니다.'
      : state === 'error'
        ? (message ?? '시세 데이터를 불러오지 못했습니다.')
        : '표시할 시세 데이터가 없습니다.';

  return (
    <section
      className={[
        'rounded-[28px] border border-[#D5DBE6] bg-white/82 p-6 text-[#111827]',
        'shadow-[0_18px_44px_rgba(15,23,42,0.08)] backdrop-blur-xl',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex min-h-[280px] items-center justify-center rounded-[22px] border border-dashed border-[#C9D2DF] bg-[#F8FAFC]">
        <p className="text-sm font-black text-[#64748B]">{label}</p>
      </div>
    </section>
  );
}

function MarketStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'watch';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-emerald-200'
      : tone === 'watch'
        ? 'text-amber-200'
        : 'text-white';

  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.07] px-3 py-2.5">
      <p className="text-[11px] font-black text-white/40">{label}</p>
      <p className={`mt-1 text-sm font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'green' | 'blue' | 'amber';
  icon?: 'up' | 'down';
}) {
  const toneClass = {
    green: 'border-emerald-300/24 bg-emerald-300/[0.09] text-emerald-100',
    blue: 'border-blue-300/20 bg-blue-300/[0.08] text-blue-100',
    amber: 'border-amber-300/24 bg-amber-300/[0.1] text-amber-100',
  }[tone];
  const Icon = icon === 'up' ? TrendingUp : icon === 'down' ? TrendingDown : null;

  return (
    <div className={`rounded-[18px] border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] opacity-58">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" /> : null}
        <p className="text-base font-black">{value}</p>
      </div>
    </div>
  );
}

function buildMarket(points: PricePoint[], keyword: string, currentPrice?: number) {
  const adjustedPoints = points.map((point, index) => {
    const keywordInfluence = deterministicRatio(`${keyword}-${point.label}`) - 0.5;
    const indexBias = Math.sin(index * 0.72 + keyword.length) * 0.015;
    const price = Math.max(1, Math.round(point.price * (1 + keywordInfluence * 0.025 + indexBias)));

    return index === points.length - 1 && currentPrice ? { ...point, price: currentPrice } : { ...point, price };
  });

  const prices = adjustedPoints.map((point) => point.price);
  const averagePrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const spreadSeed = 0.018 + deterministicRatio(keyword) * 0.022;
  const bidPrices = adjustedPoints.map((point, index) =>
    Math.max(1, Math.round(point.price * (1 - spreadSeed - index * 0.0008)))
  );
  const askPrices = adjustedPoints.map((point, index) =>
    Math.round(point.price * (1 + spreadSeed * 0.82 + index * 0.0005))
  );
  const allPrices = [...prices, ...bidPrices, ...askPrices, averagePrice];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const range = Math.max(maxPrice - minPrice, 1);
  const lowerBound = Math.max(0, minPrice - range * 0.22);
  const upperBound = maxPrice + range * 0.2;

  const yForPrice = (price: number) =>
    plotBottom - ((price - lowerBound) / Math.max(upperBound - lowerBound, 1)) * plotHeight;

  const marketPoints: ResaleMarketPoint[] = adjustedPoints.map((point, index) => {
    const previousPrice = index === 0 ? point.price : adjustedPoints[index - 1].price;
    const direction: MarketDirection =
      point.price > previousPrice ? 'up' : point.price < previousPrice ? 'down' : 'flat';
    const x = plotLeft + (index / Math.max(adjustedPoints.length - 1, 1)) * plotWidth;
    const volume = 14 + Math.round(deterministicRatio(`${keyword}-volume-${index}`) * 34);
    const bidPrice = bidPrices[index];
    const askPrice = askPrices[index];

    return {
      ...point,
      x,
      y: yForPrice(point.price),
      bidPrice,
      askPrice,
      bidY: yForPrice(bidPrice),
      askY: yForPrice(askPrice),
      volume,
      direction,
    };
  });

  const linePath = buildSmoothPath(marketPoints.map(({ x, y }) => ({ x, y })));
  const areaPath = `${linePath} L ${marketPoints[marketPoints.length - 1].x} ${plotBottom} L ${plotLeft} ${plotBottom} Z`;
  const askPath = buildSmoothPath(marketPoints.map(({ x, askY }) => ({ x, y: askY })));
  const bidPath = buildSmoothPath([...marketPoints].reverse().map(({ x, bidY }) => ({ x, y: bidY })));
  const spreadPath = `${askPath} L ${marketPoints[marketPoints.length - 1].x} ${marketPoints[marketPoints.length - 1].bidY} ${bidPath.replace(/^M\s?/, 'L ')} Z`;
  const lowestPoint = marketPoints.reduce((lowest, point) => (point.price < lowest.price ? point : lowest), marketPoints[0]);
  const gridLines = Array.from({ length: 4 }, (_, index) => {
    const price = lowerBound + ((upperBound - lowerBound) / 3) * index;

    return {
      price: Math.round(price),
      y: yForPrice(price),
    };
  });

  return {
    points: marketPoints,
    linePath,
    areaPath,
    spreadPath,
    averagePrice,
    averageY: yForPrice(averagePrice),
    lowestPoint,
    gridLines,
  };
}

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
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
    const controlX = previous.x + (point.x - previous.x) * 0.5;

    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
}

function deterministicRatio(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }

  return hash / 100000;
}

function compactWon(price: number) {
  if (price >= 1000000) {
    return `${(price / 10000).toFixed(0)}만`;
  }

  if (price >= 10000) {
    return `${Math.round(price / 10000)}만`;
  }

  return formatWon(price);
}

export function PriceInsightAIntegrationHint() {
  return (
    <div className="rounded-[20px] border border-[#D5DBE6] bg-white p-5 text-sm font-semibold text-[#374151]">
      <p className="font-black text-[#111827]">통합 힌트</p>
      <p className="mt-2">
        기존 <code>PriceInsightChart</code> 대신 상품 상세 팝업에서 이 컴포넌트를 import하면 같은
        <code> PricePoint[]</code> 데이터로 바로 비교할 수 있습니다.
      </p>
      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#111827] px-3 py-1.5 text-xs font-black text-white">
        README 보기 <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
    </div>
  );
}
