import { useId, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, BarChart3, ChevronRight, CircleDot, Loader2, TrendingDown } from 'lucide-react';
import type { PricePoint } from '../../types/product';
import { formatWon } from '../../utils/format';

type SteamVolumePriceInsightPrototypeProps = {
  points: PricePoint[];
  keywordOptions?: string[];
  initialKeyword?: string;
  className?: string;
  isLoading?: boolean;
  errorMessage?: string;
};

type MarketPoint = PricePoint & {
  x: number;
  y: number;
  volume: number;
  volumeRatio: number;
};

type MarketMetrics = {
  lowest: number;
  highest: number;
  average: number;
  current: number;
  currentDeltaPercent: number;
  totalVolume: number;
  maxVolume: number;
};

const chartWidth = 720;
const chartHeight = 360;
const padding = {
  top: 44,
  right: 44,
  bottom: 76,
  left: 58,
};
const plotLeft = padding.left;
const plotRight = chartWidth - padding.right;
const plotTop = padding.top;
const plotBottom = chartHeight - padding.bottom;
const plotWidth = plotRight - plotLeft;
const volumeHeight = 76;
const volumeTop = plotBottom - volumeHeight;

const defaultKeywords = ['아이폰 17', '아이폰', '512GB', '새상품'];

export function SteamVolumePriceInsightPrototype({
  points,
  keywordOptions = defaultKeywords,
  initialKeyword,
  className = '',
  isLoading = false,
  errorMessage,
}: SteamVolumePriceInsightPrototypeProps) {
  const gradientId = useId().replace(/:/g, '');
  const keywords = keywordOptions.length > 0 ? keywordOptions : defaultKeywords;
  const [activeKeyword, setActiveKeyword] = useState(initialKeyword ?? keywords[0]);

  const market = useMemo(
    () => buildMarketModel(points, activeKeyword),
    [activeKeyword, points]
  );

  if (isLoading) {
    return (
      <section className={`rounded-[28px] border border-[#24384F] bg-[#081421] p-5 text-white shadow-[0_24px_70px_rgba(8,20,33,0.2)] ${className}`}>
        <div className="flex min-h-[300px] items-center justify-center gap-3 text-sm font-bold text-cyan-100/76">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          가격 시장 데이터를 불러오는 중입니다.
        </div>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section className={`rounded-[28px] border border-[#F2B8A2] bg-[#FFF8F4] p-5 shadow-[0_18px_50px_rgba(180,83,9,0.1)] ${className}`}>
        <p className="text-sm font-black text-[#9A3412]">가격 인사이트를 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm font-semibold text-[#9A3412]/70">{errorMessage}</p>
      </section>
    );
  }

  if (!market) {
    return (
      <section className={`rounded-[28px] border border-[#D9E1EA] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ${className}`}>
        <p className="text-sm font-black text-[#101722]">표시할 가격 흐름이 없습니다.</p>
        <p className="mt-2 text-sm font-semibold text-[#697586]">
          백엔드에서 가격 이력 또는 유사 키워드 데이터를 받으면 이 영역에 바로 연결합니다.
        </p>
      </section>
    );
  }

  const { coordinates, metrics, linePath, areaPath, averageY, minPoint, latestPoint } = market;
  const currentGoodDeal = metrics.current <= metrics.average;
  const deltaPrefix = currentGoodDeal ? '-' : '+';
  const deltaText = `${deltaPrefix}${Math.abs(metrics.currentDeltaPercent).toFixed(1)}%`;
  const volumeDensity = Math.round((metrics.totalVolume / Math.max(coordinates.length, 1)) * 10);
  const lineGradient = `steam-line-${gradientId}`;
  const areaGradient = `steam-area-${gradientId}`;
  const volumeGradient = `steam-volume-${gradientId}`;

  return (
    <section className={`overflow-hidden rounded-[28px] border border-[#16283C] bg-[#081421] text-white shadow-[0_28px_80px_rgba(8,20,33,0.24)] ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/48">
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            Steam Market Style
          </p>
          <h3 className="mt-2 text-[19px] font-black tracking-[-0.01em] text-white">
            거래량으로 읽는 가격 흐름
          </h3>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] p-1">
          {keywords.slice(0, 4).map((keyword) => {
            const isActive = keyword === activeKeyword;

            return (
              <button
                key={keyword}
                type="button"
                onClick={() => setActiveKeyword(keyword)}
                className={`rounded-full px-3 py-2 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 ${
                  isActive
                    ? 'bg-cyan-200 text-[#081421] shadow-[0_8px_22px_rgba(103,232,249,0.28)]'
                    : 'text-cyan-100/62 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {keyword}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1fr_176px]">
        <div className="relative p-4">
          <div className="rounded-[24px] border border-white/10 bg-[#0B1E31] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-auto w-full"
              role="img"
              aria-label={`${activeKeyword} 가격 흐름과 거래량 차트`}
            >
              <defs>
                <linearGradient id={lineGradient} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#67E8F9" />
                  <stop offset="52%" stopColor="#A7F3D0" />
                  <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
                <linearGradient id={areaGradient} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.32" />
                  <stop offset="62%" stopColor="#67E8F9" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#67E8F9" stopOpacity="0" />
                </linearGradient>
                <linearGradient id={volumeGradient} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.78" />
                  <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.12" />
                </linearGradient>
              </defs>

              <rect
                x="0"
                y="0"
                width={chartWidth}
                height={chartHeight}
                rx="22"
                fill="#0B1E31"
              />
              {renderGridLines(averageY)}
              <text x={plotLeft} y="28" fill="#B7E7F6" fontSize="13" fontWeight="900">
                가격선
              </text>
              <text x={plotLeft} y={volumeTop - 10} fill="#8DB7CC" fontSize="12" fontWeight="800">
                거래량
              </text>

              {coordinates.map((point, index) => {
                const barWidth = Math.max(22, plotWidth / coordinates.length - 16);
                const barHeight = Math.max(10, volumeHeight * point.volumeRatio);
                const isLatest = index === coordinates.length - 1;

                return (
                  <rect
                    key={`${point.label}-volume`}
                    x={point.x - barWidth / 2}
                    y={plotBottom - barHeight}
                    width={barWidth}
                    height={barHeight}
                    rx="8"
                    fill={isLatest ? '#FDE68A' : `url(#${volumeGradient})`}
                    opacity={isLatest ? '0.92' : '0.72'}
                  />
                );
              })}

              <path d={areaPath} fill={`url(#${areaGradient})`} />
              <path
                d={linePath}
                fill="none"
                stroke={`url(#${lineGradient})`}
                strokeWidth="5.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {coordinates.map((point, index) => {
                const isLatest = index === coordinates.length - 1;
                const isLow = point === minPoint;

                return (
                  <g key={`${point.label}-point`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isLatest ? 8 : isLow ? 7 : 5.5}
                      fill={isLatest ? '#FDE68A' : isLow ? '#86EFAC' : '#0B1E31'}
                      stroke={isLatest ? '#FFF7CC' : isLow ? '#D1FAE5' : '#A7F3D0'}
                      strokeWidth="3.5"
                    />
                  </g>
                );
              })}

              <g transform={`translate(${clamp(latestPoint.x - 122, plotLeft, plotRight - 160)}, ${clamp(latestPoint.y - 54, plotTop, plotBottom - 70)})`}>
                <rect width="160" height="48" rx="17" fill="#FDF7D5" stroke="#FDE68A" strokeWidth="1.5" />
                <text x="15" y="18" fill="#8A6B00" fontSize="11" fontWeight="900">
                  현재 위치
                </text>
                <text x="15" y="36" fill="#081421" fontSize="17" fontWeight="950">
                  {formatWon(metrics.current)}
                </text>
              </g>

              <g transform={`translate(${clamp(minPoint.x - 74, plotLeft, plotRight - 148)}, ${clamp(minPoint.y + 24, plotTop + 8, plotBottom - 42)})`}>
                <rect width="148" height="36" rx="18" fill="#DDFBEA" stroke="#86EFAC" strokeWidth="1.4" />
                <text x="16" y="23" fill="#047857" fontSize="13" fontWeight="950">
                  저점 {formatWon(metrics.lowest)}
                </text>
              </g>
            </svg>
          </div>
        </div>

        <aside className="flex flex-col justify-between gap-3 border-t border-white/10 p-4 lg:border-l lg:border-t-0">
          <MetricCard
            icon={<CircleDot className="h-4 w-4" aria-hidden="true" />}
            label="평균가"
            value={formatWon(metrics.average)}
            tone="cyan"
          />
          <MetricCard
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            label="거래 밀도"
            value={`${volumeDensity.toLocaleString('ko-KR')}건`}
            tone="blue"
          />
          <MetricCard
            icon={<TrendingDown className="h-4 w-4" aria-hidden="true" />}
            label="평균 대비"
            value={deltaText}
            tone={currentGoodDeal ? 'green' : 'amber'}
          />
          <button
            type="button"
            className="mt-1 flex items-center justify-between rounded-[18px] border border-white/12 bg-white/[0.06] px-4 py-3 text-sm font-black text-cyan-50 transition hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            시장 상세 보기
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </aside>
      </div>
    </section>
  );

  function renderGridLines(avgY: number) {
    return (
      <>
        {[0, 1, 2, 3].map((index) => {
          const y = plotTop + (index / 3) * (volumeTop - plotTop - 12);

          return (
            <line
              key={`price-grid-${index}`}
              x1={plotLeft}
              x2={plotRight}
              y1={y}
              y2={y}
              stroke="#244259"
              strokeDasharray="6 10"
              strokeLinecap="round"
              opacity="0.82"
            />
          );
        })}
        <line
          x1={plotLeft}
          x2={plotRight}
          y1={avgY}
          y2={avgY}
          stroke="#FDE68A"
          strokeDasharray="10 8"
          strokeLinecap="round"
          opacity="0.72"
        />
        <text
          x={plotRight - 72}
          y={clamp(avgY - 9, plotTop + 12, volumeTop - 18)}
          fill="#FDE68A"
          fontSize="12"
          fontWeight="950"
        >
          평균선
        </text>
        <line
          x1={plotLeft}
          x2={plotRight}
          y1={volumeTop}
          y2={volumeTop}
          stroke="#2F516A"
          opacity="0.88"
        />
      </>
    );
  }
}

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  tone: 'cyan' | 'blue' | 'green' | 'amber';
};

function MetricCard({ icon, label, value, tone }: MetricCardProps) {
  const toneClass = {
    cyan: 'border-cyan-100/16 bg-cyan-100/[0.08] text-cyan-50',
    blue: 'border-sky-100/16 bg-sky-100/[0.08] text-sky-50',
    green: 'border-emerald-100/18 bg-emerald-100/[0.1] text-emerald-50',
    amber: 'border-amber-100/18 bg-amber-100/[0.1] text-amber-50',
  }[tone];

  return (
    <div className={`rounded-[18px] border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-[11px] font-black text-white/52">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-[17px] font-black tracking-[-0.01em] text-white">{value}</p>
    </div>
  );
}

function buildMarketModel(points: PricePoint[], keyword: string) {
  if (points.length === 0) {
    return null;
  }

  const prices = points.map((point) => point.price);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  const current = prices[prices.length - 1];
  const rawRange = Math.max(highest - lowest, Math.max(average * 0.08, 1));
  const upper = highest + rawRange * 0.2;
  const lower = Math.max(0, lowest - rawRange * 0.28);

  const syntheticVolumes = points.map((point, index) => {
    // TODO(BE): 실제 통합 시 검색/상세 API에서 keyword별 거래량 또는 매물 수를 내려주면 이 임시 계산은 제거합니다.
    const pricePressure = 1 - Math.abs(point.price - average) / Math.max(rawRange, 1);
    const keywordNoise = deterministicRatio(`${keyword}-${point.label}-${index}`);
    return Math.max(18, Math.round((pricePressure * 72 + keywordNoise * 64 + 18) * (1 + index * 0.02)));
  });
  const maxVolume = Math.max(...syntheticVolumes);
  const totalVolume = syntheticVolumes.reduce((sum, volume) => sum + volume, 0);

  const coordinates: MarketPoint[] = points.map((point, index) => {
    const x = plotLeft + (index / Math.max(points.length - 1, 1)) * plotWidth;
    const y = plotTop + ((upper - point.price) / Math.max(upper - lower, 1)) * (volumeTop - plotTop - 12);
    const volume = syntheticVolumes[index];

    return {
      ...point,
      x,
      y,
      volume,
      volumeRatio: volume / Math.max(maxVolume, 1),
    };
  });

  const linePath = buildSmoothPath(coordinates);
  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1].x} ${volumeTop} L ${coordinates[0].x} ${volumeTop} Z`;
  const averageY =
    plotTop + ((upper - average) / Math.max(upper - lower, 1)) * (volumeTop - plotTop - 12);
  const minPoint = coordinates.reduce(
    (currentMin, point) => (point.price < currentMin.price ? point : currentMin),
    coordinates[0]
  );
  const latestPoint = coordinates[coordinates.length - 1];

  const metrics: MarketMetrics = {
    lowest,
    highest,
    average,
    current,
    currentDeltaPercent: ((current - average) / Math.max(average, 1)) * 100,
    totalVolume,
    maxVolume,
  };

  return {
    coordinates,
    metrics,
    linePath,
    areaPath,
    averageY,
    minPoint,
    latestPoint,
  };
}

function buildSmoothPath(points: MarketPoint[]) {
  if (points.length === 0) {
    return '';
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
    hash = (hash * 31 + seed.charCodeAt(index)) % 1000;
  }

  return hash / 1000;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
