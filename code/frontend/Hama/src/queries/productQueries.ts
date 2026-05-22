import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fetchProductDetail,
  fetchRecommendedProducts,
  fetchSearchProducts,
  type ProductDetailParams,
  type RecommendedProductsParams,
  type SearchProductsParams,
} from '../api/products';

type SearchProductsQueryParams = Omit<SearchProductsParams, 'signal'>;
type RecommendedProductsQueryParams = Omit<RecommendedProductsParams, 'signal'>;
type ProductDetailQueryParams = Omit<ProductDetailParams, 'signal'>;

const PRODUCT_QUERY_ROOT = 'products';

export const productQueryKeys = {
  all: [PRODUCT_QUERY_ROOT] as const,
  search: ({ query, platforms, sort, page, limit }: SearchProductsQueryParams) =>
    [
      PRODUCT_QUERY_ROOT,
      'search',
      query,
      [...platforms].sort(),
      sort,
      page,
      limit,
    ] as const,
  recommended: ({ limit }: RecommendedProductsQueryParams) =>
    [PRODUCT_QUERY_ROOT, 'recommended', limit] as const,
  detail: ({ platform, pid }: ProductDetailQueryParams) =>
    [PRODUCT_QUERY_ROOT, 'detail', platform, pid] as const,
};

export function useSearchProductsQuery(params: SearchProductsQueryParams) {
  return useQuery({
    queryKey: productQueryKeys.search(params),
    queryFn: ({ signal }) => fetchSearchProducts({ ...params, signal }),
    enabled: params.query.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useRecommendedProductsQuery(
  params: RecommendedProductsQueryParams
) {
  return useQuery({
    queryKey: productQueryKeys.recommended(params),
    queryFn: ({ signal }) => fetchRecommendedProducts({ ...params, signal }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useProductDetailQuery(params: ProductDetailQueryParams) {
  return useQuery({
    queryKey: productQueryKeys.detail(params),
    queryFn: ({ signal }) => fetchProductDetail({ ...params, signal }),
    enabled: params.platform.trim().length > 0 && params.pid.trim().length > 0,
    staleTime: 60 * 1000,
  });
}
