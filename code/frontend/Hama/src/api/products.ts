import type { Product } from '../types/product';

export type SearchProductsParams = {
  query: string;
  platforms: string[];
  sort: 'low-price' | 'recent';
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// MVP에서는 백엔드가 CSV를 Product DTO로 정규화해 내려주고, 플랫폼 필터/정렬/가격 요약은
// src/utils/temporarySearchCalculations.ts에서 임시 계산합니다.
// TODO(BE): DB 기반 검색 API가 준비되면 백엔드가 필터/정렬/summary를 모두 계산하도록 계약을 확정합니다.
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

  const response = await fetch(`${API_BASE_URL}/api/products/search?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('상품 검색 결과를 불러오지 못했습니다.');
  }

  return response.json() as Promise<SearchProductsResponse>;
}

export async function fetchProductDetail({
  platform,
  pid,
  signal,
}: ProductDetailParams): Promise<Product> {
  const encodedPlatform = encodeURIComponent(platform);
  const encodedPid = encodeURIComponent(pid);

  const response = await fetch(
    `${API_BASE_URL}/api/products/${encodedPlatform}/${encodedPid}`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('상품 상세 정보를 불러오지 못했습니다.');
  }

  return response.json() as Promise<Product>;
}
