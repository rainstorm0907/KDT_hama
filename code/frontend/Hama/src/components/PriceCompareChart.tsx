import { ProductVisual } from './ProductVisual';
import { hairline } from '../styles/hairline';
import type { PricePoint, Product } from '../types/product';
import { formatWon } from '../utils/format';

type PriceCompareChartProps = {
  keyword: string;
  points: PricePoint[];
  products: Product[];
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
  pointIndex: number;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  dateLabel: string;
};

type ProductMarkerBase = Omit<ProductMarker, 'labelX' | 'labelY'>;

type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
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
const productLabelBox = {
  width: 188,
  height: 66,
};
const maxPriceColor = '#E5564F';
const minPriceColor = '#2F63E6';
const averagePriceColor = '#2C9A72';

export function PriceCompareChart({
  keyword,
  points,
  products,
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
  const productMarkerBases = products.map((product, index) => {
    const pointIndex = resolveProductPointIndex(product, points, index);
    const coordinate = coordinates[pointIndex] ?? latestPoint;
    const color = markerColors[index % markerColors.length];
    const y = priceToY(product.price, upperBound, lowerBound);

    return {
      product,
      color,
      index,
      pointIndex,
      x: coordinate.x,
      y,
      dateLabel: formatPointDateLabel(points[pointIndex]?.label ?? product.date),
    };
  });
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
  const productMarkers = placeProductMarkerLabels(
    productMarkerBases,
    getReservedLabelBoxes([maxLabel, minLabel, averageLabel])
  );
  const markerGroupCounts = getMarkerGroupCounts(productMarkers);
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
    <section className={`overflow-hidden rounded-[28px] p-5 ${hairline.panelSoft}`}>
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

      <div className="relative min-h-[560px] overflow-hidden rounded-[26px] border border-[#C9CFDA]/92 bg-white/68 shadow-[0_12px_32px_rgba(29,29,31,0.052),inset_0_1px_0_rgba(255,255,255,0.96)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(248,249,251,0.28))]" />
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="relative z-10 h-[560px] w-full overflow-visible"
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
                x1={marker.x}
                x2={marker.x}
                y1={
                  (markerGroupCounts.get(marker.pointIndex) ?? 0) > 1
                    ? chartTop
                    : marker.y
                }
                y2={chartBottom}
                stroke={marker.color}
                strokeDasharray="4 7"
                strokeLinecap="round"
                strokeWidth="1.8"
                opacity={(markerGroupCounts.get(marker.pointIndex) ?? 0) > 1 ? 0.38 : 0.54}
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r="8.4"
                fill="#FFFFFF"
                stroke={marker.color}
                strokeWidth="4"
              />
              <circle
                cx={marker.x}
                cy={chartBottom}
                r="4.6"
                fill={marker.color}
                opacity="0.82"
              />
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

        {productMarkers.map((marker) => (
          <div
            key={`marker-label-${marker.product.platform}-${marker.product.pid}`}
            className="absolute z-20 w-[194px] rounded-[20px] border bg-white/94 p-3 shadow-[0_16px_34px_rgba(29,29,31,0.13),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-md"
            style={{
              borderColor: marker.color,
              left: `${(marker.labelX / chartWidth) * 100}%`,
              top: `${(marker.labelY / chartHeight) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className={`h-10 w-10 shrink-0 overflow-hidden rounded-[14px] ${hairline.image}`}>
                <ProductVisual
                  imageUrl={marker.product.imageUrl}
                  name={marker.product.name}
                  variant="thumb"
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-black text-gray-950">
                  {formatWon(marker.product.price)}
                </span>
                <span className={`mt-0.5 block text-[12px] font-black ${hairline.quietText}`}>
                  {marker.dateLabel} 등록
                </span>
              </span>
            </div>
          </div>
        ))}
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

function placeProductMarkerLabels(
  markers: ProductMarkerBase[],
  reservedBoxes: LabelBox[]
): ProductMarker[] {
  const occupiedBoxes: LabelBox[] = reservedBoxes.map((box) => expandBox(box, 12));

  return markers.map((marker) => {
    const candidates = getProductLabelCandidates(marker);
    const bestCandidate =
      candidates.find((candidate) =>
        occupiedBoxes.every((box) => !boxesOverlap(candidate.box, box))
      ) ?? getLeastOverlappingCandidate(candidates, occupiedBoxes, marker);

    occupiedBoxes.push(expandBox(bestCandidate.box, 14));

    return {
      ...marker,
      labelX: bestCandidate.x,
      labelY: bestCandidate.y,
    };
  });
}

function getProductLabelCandidates(marker: ProductMarkerBase) {
  const preferredOffsets = [
    { x: -174, y: -108 },
    { x: 174, y: -108 },
    { x: -174, y: 102 },
    { x: 174, y: 102 },
    { x: 0, y: -156 },
    { x: 0, y: 150 },
    { x: -286, y: -72 },
    { x: 286, y: -72 },
    { x: -286, y: 78 },
    { x: 286, y: 78 },
    { x: -392, y: -18 },
    { x: 392, y: -18 },
    { x: -392, y: 118 },
    { x: 392, y: 118 },
  ];
  const seen = new Set<string>();

  return preferredOffsets.flatMap((offset) => {
    const x = clamp(
      marker.x + offset.x,
      chartLeft + productLabelBox.width / 2 + 8,
      chartRight - productLabelBox.width / 2 - 8
    );
    const y = clamp(
      marker.y + offset.y,
      chartTop + productLabelBox.height / 2 + 8,
      chartBottom - productLabelBox.height / 2 - 18
    );
    const box = centerToBox(x, y, productLabelBox.width, productLabelBox.height);
    const key = `${Math.round(x)}:${Math.round(y)}`;

    if (seen.has(key)) {
      return [];
    }

    seen.add(key);
    return [{ x, y, box }];
  });
}

function getLeastOverlappingCandidate(
  candidates: Array<{ x: number; y: number; box: LabelBox }>,
  occupiedBoxes: LabelBox[],
  marker: ProductMarkerBase
) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      overlapScore: occupiedBoxes.reduce(
        (score, box) => score + getOverlapArea(candidate.box, box),
        0
      ),
      distanceScore: getDistance(candidate.x, candidate.y, marker.x, marker.y) * 0.001,
    }))
    .sort(
      (left, right) =>
        left.overlapScore - right.overlapScore ||
        left.distanceScore - right.distanceScore
    )[0];
}

function getReservedLabelBoxes(
  labels: Array<{ x: number; y: number; text: string; anchor?: 'start' | 'middle' }>
): LabelBox[] {
  return labels.map((label) => {
    const width = estimateTextWidth(label.text, 12) + 18;
    const height = 24;
    const x =
      label.anchor === 'start' ? label.x - 4 : label.x - width / 2;

    return {
      x,
      y: label.y - height + 6,
      width,
      height,
    };
  });
}

function getMarkerGroupCounts(markers: ProductMarker[]) {
  const counts = new Map<number, number>();

  markers.forEach((marker) => {
    counts.set(marker.pointIndex, (counts.get(marker.pointIndex) ?? 0) + 1);
  });

  return counts;
}

function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.72;
}

function getDistance(leftX: number, leftY: number, rightX: number, rightY: number) {
  return Math.hypot(leftX - rightX, leftY - rightY);
}

function centerToBox(x: number, y: number, width: number, height: number): LabelBox {
  return {
    x: x - width / 2,
    y: y - height / 2,
    width,
    height,
  };
}

function expandBox(box: LabelBox, padding: number): LabelBox {
  return {
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  };
}

function boxesOverlap(left: LabelBox, right: LabelBox) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

function getOverlapArea(left: LabelBox, right: LabelBox) {
  const xOverlap = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x)
  );
  const yOverlap = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y)
  );

  return xOverlap * yOverlap;
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
