import type { Product } from '../types/product';

export type SearchProductsParams = {
  query: string;
  platforms: string[];
  sort: 'relevance' | 'low-price' | 'recent';
  page: number;
  limit: number;
  signal?: AbortSignal;
};

export type SearchProductsResponse = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  summary: {
    lowestPrice: number;
    averagePrice: number;
    updatedAt: string;
  };
};

export type ProductDetailParams = {
  platform: string;
  pid: string;
  signal?: AbortSignal;
};

export type RecommendedProductsParams = {
  limit: number;
  signal?: AbortSignal;
};

export type RecommendedProductsResponse = {
  items: Product[];
  total: number;
  limit: number;
  summary: {
    lowestPrice: number;
    averagePrice: number;
    updatedAt: string;
  };
};

export async function fetchSearchProducts({
  query,
  platforms,
  sort,
  page,
  limit,
  signal,
}: SearchProductsParams): Promise<SearchProductsResponse> {
  const params = new URLSearchParams({
    q: query,
    platforms: platforms.join(','),
    sort,
    page: String(page),
    limit: String(limit),
  });

  const response = await fetch(`/api/products/search?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('상품 검색 결과를 불러오지 못했습니다.');
  }

  return response.json() as Promise<SearchProductsResponse>;
}

export async function fetchRecommendedProducts({
  limit,
  signal,
}: RecommendedProductsParams): Promise<RecommendedProductsResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  const response = await fetch(`/api/products/recommended?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('추천 상품을 불러오지 못했습니다.');
  }

  return response.json() as Promise<RecommendedProductsResponse>;
}

export async function fetchProductDetail({
  platform,
  pid,
  signal,
}: ProductDetailParams): Promise<Product> {
  const encodedPlatform = encodeURIComponent(platform);
  const encodedPid = encodeURIComponent(pid);

  const response = await fetch(
    `/api/products/${encodedPlatform}/${encodedPid}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('상품 상세 정보를 불러오지 못했습니다.');
  }

  return response.json() as Promise<Product>;
}
