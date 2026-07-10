import { ProductVisual } from './ProductVisual';
import { hairline } from '../styles/hairline';
import type { PricePoint, Product } from '../types/product';
import { formatWon } from '../utils/format';

type PriceCompareChartProps = {
  keyword: string;
  points: PricePoint[];
  products: Product[];
  onProductSelect?: (product: Product) => void;
};

type ChartPoint = PricePoint & {
  index: number;
  x: number;
  y: number;
};

type ProductMarker = {
  product: Product;
  color: string;
  index: number;
  rank: number;
  pointIndex: number;
  sourcePointIndex: number;
  sourceX: number;
  sourceY: number;
  x: number;
  y: number;
  dateLabel: string;
};

const chartWidth = 1180;
const chartHeight = 460;
const chartPadding = {
  top: 74,
  right: 84,
  bottom: 86,
  left: 92,
};
const chartLeft = chartPadding.left;
const chartRight = chartWidth - chartPadding.right;
const chartTop = chartPadding.top;
const chartBottom = chartHeight - chartPadding.bottom;
const chartInnerWidth = chartRight - chartLeft;
const chartInnerHeight = chartBottom - chartTop;
const markerColors = ['#3D6BE8', '#2C9A72', '#E37B35', '#7B61C7'];
const maxPriceColor = '#E5564F';
const minPriceColor = '#2F63E6';
const averagePriceColor = '#2C9A72';

export function PriceCompareChart({
  keyword,
  points,
  products,
  onProductSelect,
}: PriceCompareChartProps) {
  if (points.length === 0) {
    return (
      <section className={`rounded-[28px] p-6 ${hairline.panelSoft}`}>
        <p className="text-base font-black text-gray-950">
          가격 비교에 사용할 시세 데이터가 없습니다.
        </p>
        <p className={`mt-2 text-sm font-bold ${hairline.mutedText}`}>
          백엔드에서 키워드별 30일 가격 데이터를 받으면 이 영역에 표시합니다.
        </p>
      </section>
    );
  }

  const marketPrices = points.map((point) => point.price);
  const productPrices = products.map((product) => product.price);
  const minPrice = Math.min(...marketPrices, ...productPrices);
  const maxPrice = Math.max(...marketPrices, ...productPrices);
  const averagePrice = Math.round(
    marketPrices.reduce((sum, price) => sum + price, 0) / marketPrices.length
  );
  const range = Math.max(maxPrice - minPrice, 1);
  const lowerBound = Math.max(0, minPrice - range * 0.18);
  const upperBound = maxPrice + range * 0.2;
  const averageY = priceToY(averagePrice, upperBound, lowerBound);
  const coordinates = points.map((point, index) => ({
    ...point,
    index,
    x: chartLeft + (index / Math.max(points.length - 1, 1)) * chartInnerWidth,
    y: priceToY(point.price, upperBound, lowerBound),
  }));
  const minPoint = coordinates.reduce(
    (currentMin, point) => (point.price < currentMin.price ? point : currentMin),
    coordinates[0]
  );
  const maxPoint = coordinates.reduce(
    (currentMax, point) => (point.price > currentMax.price ? point : currentMax),
    coordinates[0]
  );
  const latestPoint = coordinates[coordinates.length - 1];
  const productMarkersWithoutRanks = products.map((product, index) => {
    const pointIndex = resolveProductPointIndex(product, points, index);
    const coordinate = coordinates[pointIndex] ?? latestPoint;
    const sourcePointIndex = clamp(pointIndex - 1, 0, coordinates.length - 1);
    const sourceCoordinate = coordinates[sourcePointIndex] ?? coordinate;
    const color = markerColors[index % markerColors.length];
    const y = priceToY(product.price, upperBound, lowerBound);

    return {
      product,
      color,
      index,
      rank: 0,
      pointIndex,
      sourcePointIndex,
      sourceX: sourceCoordinate.x,
      sourceY: sourceCoordinate.y,
      x: coordinate.x,
      y,
      dateLabel: formatPointDateLabel(points[pointIndex]?.label ?? product.date),
    };
  });
  const sortedProductMarkers = [...productMarkersWithoutRanks]
    .sort((left, right) => right.product.price - left.product.price || left.index - right.index)
    .map((marker, rankIndex) => ({
      ...marker,
      rank: rankIndex + 1,
    }));
  const rankedMarkerByIndex = new Map(
    sortedProductMarkers.map((marker) => [marker.index, marker])
  );
  const productMarkers = productMarkersWithoutRanks.map(
    (marker) => rankedMarkerByIndex.get(marker.index) ?? marker
  );
  const maxLabel = {
    x: maxPoint.x,
    y: maxPoint.y - 24,
    text: `최고 ${formatWon(maxPoint.price)}`,
    color: maxPriceColor,
  };
  const minLabel = {
    x: minPoint.x,
    y: minPoint.y + 32,
    text: `최저 ${formatWon(minPoint.price)}`,
    color: minPriceColor,
  };
  const averageLabel = {
    x: chartLeft + 10,
    y: averageY - 12,
    text: `평균 ${formatWon(averagePrice)}`,
    color: averagePriceColor,
    anchor: 'start' as const,
  };
  const markerIndexes = getVisibleMarkerIndexes(
    coordinates,
    minPoint,
    maxPoint,
    latestPoint,
    productMarkers
  );
  const dateLabelIndexes = getVisibleDateLabelIndexes(coordinates, latestPoint);
  const marketPath = buildMarketPath(coordinates);
  const fillPath = `${marketPath} L ${latestPoint.x} ${chartBottom} L ${coordinates[0].x} ${chartBottom} Z`;

  return (
    <section className={`overflow-visible rounded-[28px] p-5 ${hairline.panelSoft}`}>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`inline-flex h-10 items-center rounded-full px-5 text-sm font-black ${hairline.controlActive}`}>
            {keyword}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-9 items-center rounded-[16px] px-4 text-sm font-black ${hairline.controlActive}`}>
            30일
          </span>
          <span className={`inline-flex h-9 items-center rounded-[16px] px-4 text-sm font-black ${hairline.control}`}>
            등록일 기준
          </span>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[560px] overflow-hidden rounded-[26px] border border-[#C9CFDA]/92 bg-white/68 shadow-[0_12px_32px_rgba(29,29,31,0.052),inset_0_1px_0_rgba(255,255,255,0.96)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(248,249,251,0.28))]" />
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="relative z-10 h-[560px] w-full"
            role="img"
            aria-label={`${keyword} 30일 시세와 선택 상품 등록일 비교 그래프`}
          >
          {Array.from({ length: 4 }, (_, index) => {
            const y = chartTop + (index / 3) * chartInnerHeight;

            return (
              <line
                key={`grid-${index}`}
                x1={chartLeft}
                x2={chartRight}
                y1={y}
                y2={y}
                stroke="#DCE3EC"
                strokeDasharray="7 12"
                strokeLinecap="round"
                opacity="0.64"
              />
            );
          })}

          <line
            x1={chartLeft}
            x2={chartRight}
            y1={averageY}
            y2={averageY}
            stroke={averagePriceColor}
            strokeDasharray="8 10"
            strokeLinecap="round"
            strokeWidth="1.4"
            opacity="0.42"
          />
          <PointLabel
            x={averageLabel.x}
            y={averageLabel.y}
            text={averageLabel.text}
            color={averageLabel.color}
            anchor="start"
          />

          <path d={fillPath} fill="#E8EEF8" opacity="0.48" />
          <path
            d={marketPath}
            fill="none"
            stroke="#B8C8F8"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            strokeWidth="12"
            opacity="0.34"
          />
          <path
            d={marketPath}
            fill="none"
            stroke="#2F63E6"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            strokeWidth="5.8"
          />

          <line
            x1={latestPoint.x}
            x2={latestPoint.x}
            y1={chartTop}
            y2={chartBottom}
            stroke="#CBD5E1"
            strokeDasharray="4 9"
            strokeLinecap="round"
            strokeWidth="1.4"
          />

          {coordinates.map((point) => {
            const shouldShowMarker = markerIndexes.has(point.index);

            return shouldShowMarker ? (
              <circle
                key={`market-${point.index}`}
                cx={point.x}
                cy={point.y}
                r={point.index === latestPoint.index ? 7.8 : 4.8}
                fill="#FFFFFF"
                stroke={point.index === latestPoint.index ? '#22C55E' : '#2F63E6'}
                strokeWidth={point.index === latestPoint.index ? 4.2 : 3}
              />
            ) : null;
          })}

          <circle
            cx={minPoint.x}
            cy={minPoint.y}
            r="7.8"
            fill={minPriceColor}
            stroke="#FFFFFF"
            strokeWidth="4"
          />
          <circle
            cx={maxPoint.x}
            cy={maxPoint.y}
            r="7.8"
            fill={maxPriceColor}
            stroke="#FFFFFF"
            strokeWidth="4"
          />

          <PointLabel
            x={maxLabel.x}
            y={maxLabel.y}
            text={maxLabel.text}
            color={maxLabel.color}
          />
          <PointLabel
            x={minLabel.x}
            y={minLabel.y}
            text={minLabel.text}
            color={minLabel.color}
          />

          {productMarkers.map((marker) => (
            <g key={`marker-line-${marker.product.platform}-${marker.product.pid}`}>
              <line
                x1={marker.sourceX}
                x2={marker.x}
                y1={marker.sourceY}
                y2={marker.y}
                stroke={marker.color}
                strokeDasharray="6 8"
                strokeLinecap="round"
                strokeWidth="1.9"
                opacity="0.66"
              />
              <circle
                cx={marker.sourceX}
                cy={marker.sourceY}
                r="3.6"
                fill="#FFFFFF"
                stroke={marker.color}
                strokeWidth="1.8"
                opacity="0.78"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r="11"
                fill="#FFFFFF"
                stroke={marker.color}
                strokeWidth="2.8"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r="7.2"
                fill={marker.color}
                opacity="0.1"
              />
              <text
                x={marker.x}
                y={marker.y + 3.2}
                fill={marker.color}
                fontSize="9.2"
                fontWeight="950"
                textAnchor="middle"
              >
                {marker.rank}
              </text>
            </g>
          ))}

          {coordinates
            .filter((point) => dateLabelIndexes.has(point.index))
            .map((point) => (
              <text
                key={`x-label-${point.index}`}
                x={point.x}
                y={chartBottom + 58}
                fill="#626873"
                fontSize="14"
                fontWeight="900"
                textAnchor="middle"
              >
                {point.label}
              </text>
            ))}
          </svg>
        </div>

        <aside
          className="min-h-[560px] rounded-[26px] border border-[#C9CFDA]/92 bg-white/78 p-4 shadow-[0_12px_32px_rgba(29,29,31,0.052),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl"
          aria-label="선택 상품 가격순 목록"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-black text-gray-950">선택 상품</p>
            <span className={`rounded-full px-3 py-1 text-[11px] font-black ${hairline.control}`}>
              가격 높은 순
            </span>
          </div>
          <ol className="space-y-3">
            {sortedProductMarkers.map((marker) => (
              <ProductRankCard
                key={`rank-card-${marker.product.platform}-${marker.product.pid}`}
                marker={marker}
                onProductSelect={onProductSelect}
              />
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

function priceToY(price: number, upper: number, lower: number) {
  return chartTop + ((upper - price) / Math.max(upper - lower, 1)) * chartInnerHeight;
}

function buildMarketPath(points: ChartPoint[]) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
}

function ProductRankCard({
  marker,
  onProductSelect,
}: {
  marker: ProductMarker;
  onProductSelect?: (product: Product) => void;
}) {
  return (
    <li className="relative overflow-hidden rounded-[20px] border border-[#C9CFDA]/92 bg-white/88 shadow-[0_12px_26px_rgba(29,29,31,0.066),inset_0_1px_0_rgba(255,255,255,0.96)] transition hover:bg-white hover:shadow-[0_14px_30px_rgba(29,29,31,0.09),inset_0_1px_0_rgba(255,255,255,0.96)]">
      <span
        className="absolute bottom-4 left-0 top-4 w-[5px] rounded-full"
        style={{ backgroundColor: marker.color }}
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={() => onProductSelect?.(marker.product)}
        className={`flex w-full items-center gap-3 p-3 pl-5 text-left ${hairline.focus}`}
        aria-label={`${marker.product.name} 상세 보기`}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 bg-white text-[12px] font-black shadow-[0_7px_14px_rgba(29,29,31,0.08)]"
          style={{ borderColor: marker.color, color: marker.color }}
          aria-label={`가격순 ${marker.rank}번`}
        >
          {marker.rank}
        </span>
        <span className={`h-14 w-14 shrink-0 overflow-hidden rounded-[16px] ${hairline.image}`}>
          <ProductVisual
            imageUrl={marker.product.imageUrl}
            name={marker.product.name}
            variant="thumb"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-black text-gray-950">
            {marker.product.name}
          </span>
          <span className="mt-1 block text-[15px] font-black text-gray-950">
            {formatWon(marker.product.price)}
          </span>
          <span className={`mt-0.5 block text-[12px] font-black ${hairline.quietText}`}>
            {marker.dateLabel} 등록
          </span>
        </span>
      </button>
    </li>
  );
}

function getVisibleMarkerIndexes(
  points: ChartPoint[],
  minPoint: ChartPoint,
  maxPoint: ChartPoint,
  latestPoint: ChartPoint,
  productMarkers: ProductMarker[]
) {
  const indexes = new Set<number>();

  points.forEach((point) => {
    if (point.index % 2 === 0) {
      indexes.add(point.index);
    }
  });
  indexes.add(minPoint.index);
  indexes.add(maxPoint.index);
  indexes.add(latestPoint.index);
  productMarkers.forEach((marker) => indexes.add(marker.pointIndex));

  return indexes;
}

function getVisibleDateLabelIndexes(points: ChartPoint[], latestPoint: ChartPoint) {
  const indexes = new Set<number>();

  // 데이터가 듬성한 기간(크롤링 공백)에는 모든 일자를 보여줘야
  // "두 날짜뿐"으로 오해하지 않는다. 라벨 폭(14px 폰트) 기준 12개까지는 겹치지 않는다.
  if (points.length <= 12) {
    points.forEach((point) => indexes.add(point.index));
    return indexes;
  }

  points.forEach((point) => {
    if (point.index % 2 === 0) {
      indexes.add(point.index);
    }
  });

  if (!indexes.has(latestPoint.index)) {
    indexes.delete(latestPoint.index - 1);
    indexes.add(latestPoint.index);
  }

  return indexes;
}

function resolveProductPointIndex(
  product: Product,
  points: PricePoint[],
  productIndex: number
) {
  const targetDate = parseMonthDay(product.date);

  if (targetDate) {
    const exactIndex = points.findIndex((point) => {
      const pointDate = parseMonthDay(point.label);

      return (
        pointDate?.month === targetDate.month &&
        pointDate.day === targetDate.day
      );
    });

    if (exactIndex >= 0) {
      return exactIndex;
    }

    const nearest = points
      .map((point, index) => ({
        index,
        distance: getMonthDayDistance(parseMonthDay(point.label), targetDate),
      }))
      .filter((item) => Number.isFinite(item.distance))
      .sort((left, right) => left.distance - right.distance)[0];

    if (nearest) {
      return nearest.index;
    }
  }

  const fallbackIndex = points.length - 1 - productIndex * 3;

  return clamp(fallbackIndex, 0, points.length - 1);
}

function parseMonthDay(value: string): { month: number; day: number } | null {
  const cleanedValue = value
    .replace(/\s*최신$/, '')
    .replace(/년|월/g, '.')
    .replace(/일/g, '')
    .trim();
  const match = cleanedValue.match(/(?:(\d{4})[.\-/\s])?(\d{1,2})[.\-/\s](\d{1,2})/);

  if (!match) {
    return null;
  }

  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(month) || !Number.isFinite(day) || month > 12 || day > 31) {
    return null;
  }

  return { month, day };
}

function getMonthDayDistance(
  source: { month: number; day: number } | null,
  target: { month: number; day: number }
) {
  if (!source) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(source.month * 31 + source.day - (target.month * 31 + target.day));
}

function formatPointDateLabel(value: string) {
  const parsedDate = parseMonthDay(value);

  return parsedDate ? `${parsedDate.month}.${parsedDate.day}` : value.slice(0, 6);
}

function PointLabel({
  x,
  y,
  text,
  color,
  anchor = 'middle',
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  anchor?: 'start' | 'middle' | 'end';
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize="11.5"
      fontWeight="950"
      textAnchor={anchor}
      paintOrder="stroke"
      stroke="#FFFFFF"
      strokeWidth="4"
      strokeLinejoin="round"
    >
      {text}
    </text>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
