import type { PlatformName } from '../components/PlatformPill';
import type { SortOption } from '../components/SortControls';
import type { Product } from '../types/product';

export const TEMPORARY_SEARCH_DISPLAY_LIMIT = 96;

// TODO(BE): MVP 임시 코드입니다. 백엔드가 플랫폼 필터, 정확도순/최저가순/최신순 정렬, 최저가, 평균가를 계산하면
// SearchResultsPage에서 이 파일 의존성을 제거하고 API 응답의 items/summary를 바로 사용합니다.
export function filterAndSortProductsTemporarily({
  products,
  query,
  platforms,
  sortOption,
}: {
  products: Product[];
  query: string;
  platforms: PlatformName[];
  sortOption: SortOption;
}) {
  const normalizedQuery = normalizeSearchText(query);
  const activePlatformSet = new Set<string>(platforms);

  const filteredProducts = products.filter((product) => {
    const searchableText = normalizeSearchText(
      `${product.name} ${product.brand} ${product.category}`
    );

    return (
      activePlatformSet.has(product.platform) &&
      (!normalizedQuery || searchableText.includes(normalizedQuery))
    );
  });

  if (sortOption === 'relevance') {
    // TODO(BE): 정확도순은 검색어 매칭률, 상품 상태, 가격 분포를 백엔드 검색 랭킹에서 처리합니다.
    // 현재는 MVP 시연용 임시 점수입니다.
    return sortByTemporaryRelevance(filteredProducts, query);
  }

  return filteredProducts.sort((a, b) => {
    if (sortOption === 'recent') {
      return b.date.localeCompare(a.date);
    }

    return a.price - b.price;
  });
}

export function calculateSearchSummaryTemporarily(products: Product[]) {
  if (products.length === 0) {
    return {
      lowestPrice: 0,
      averagePrice: 0,
    };
  }

  let lowestPrice = Number.POSITIVE_INFINITY;
  let priceTotal = 0;

  for (const product of products) {
    lowestPrice = Math.min(lowestPrice, product.price);
    priceTotal += product.price;
  }

  return {
    lowestPrice,
    averagePrice: Math.round(priceTotal / products.length / 1000) * 1000,
  };
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s/g, '');
}

function sortByTemporaryRelevance(products: Product[], query: string) {
  if (products.length === 0) {
    return products;
  }

  const averagePrice =
    products.reduce((total, product) => total + product.price, 0) / products.length;
  const nearAverageMin = averagePrice * 0.45;
  const nearAverageMax = averagePrice * 1.65;
  const nearAverageProducts = products.filter(
    (product) =>
      product.price >= nearAverageMin && product.price <= nearAverageMax
  );
  const pool = nearAverageProducts.length >= 8 ? nearAverageProducts : products;

  return pool.sort((a, b) => {
    const aScore = temporaryRelevanceScore(a, query, averagePrice);
    const bScore = temporaryRelevanceScore(b, query, averagePrice);

    return bScore - aScore;
  });
}

function temporaryRelevanceScore(
  product: Product,
  query: string,
  averagePrice: number
) {
  const searchText = normalizeSearchText(
    `${product.name} ${product.brand} ${product.category}`
  );
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenizeQuery(query);
  const matchedTokenCount = tokens.filter((token) => searchText.includes(token)).length;
  const tokenScore =
    tokens.length > 0 ? matchedTokenCount / tokens.length : 0;
  const exactQueryBonus =
    normalizedQuery && searchText.includes(normalizedQuery) ? 0.35 : 0;
  const priceDistance = Math.abs(product.price - averagePrice) / Math.max(averagePrice, 1);
  const priceScore = Math.max(0, 1 - priceDistance);
  const stableShuffle = deterministicRandom(`${normalizedQuery}:${product.platform}:${product.pid}`);

  return tokenScore * 8 + exactQueryBonus + priceScore * 2 + stableShuffle;
}

function tokenizeQuery(query: string) {
  return query
    .toLowerCase()
    .match(/[a-z]+[0-9]+|[가-힣]+|[a-z]+|\d+/g)
    ?.map(normalizeSearchText)
    .filter(Boolean) ?? [];
}

function deterministicRandom(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}
