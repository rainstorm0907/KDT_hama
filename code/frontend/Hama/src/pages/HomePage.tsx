import { useState } from 'react';
import { Banner } from '../components/Banner';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { RecentKeywordRecommendations } from '../components/RecentKeywordRecommendations';
import { RefreshProductsButton } from '../components/RefreshProductsButton';
import { RowsMenu } from '../components/RowsMenu';
import { SearchBar } from '../components/SearchBar';
import { useRecommendedProductsQuery } from '../queries/productQueries';
import { hairline } from '../styles/hairline';
import type { RowCountOption } from '../types/productList';
import type { Product } from '../types/product';
import { formatUpdatedAtTimestamp } from '../utils/format';

type HomePageProps = {
  onProductSelect: (product: Product) => void;
};

const PRODUCT_COLUMNS = 4;

export function HomePage({
  onProductSelect,
}: HomePageProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [rowCount, setRowCount] = useState<RowCountOption>(4);
  const recommendedLimit = rowCount * PRODUCT_COLUMNS;
  const recommendedProductsQuery = useRecommendedProductsQuery({
    limit: recommendedLimit,
  });
  const recommendedProducts = recommendedProductsQuery.data?.items ?? [];
  const isRecommendedLoading = recommendedProductsQuery.isPending;
  const isRecommendedRefreshing = recommendedProductsQuery.isFetching;
  const recommendedError = recommendedProductsQuery.isError
    ? '추천 상품을 불러오지 못했습니다. 백엔드 서버 상태를 확인해 주세요.'
    : null;
  const recommendedUpdatedAt = formatUpdatedAtTimestamp(
    recommendedProductsQuery.dataUpdatedAt
  );

  return (
    <main className={`flex-1 flex flex-col gap-14 md:gap-16 pb-24 ${hairline.page}`}>
      <SearchBar
        isOpen={isSearchOpen}
        onOpen={() => setIsSearchOpen(true)}
        onClose={() => setIsSearchOpen(false)}
      />
      <Banner />
      <RecentKeywordRecommendations onProductSelect={onProductSelect} />

      <section id="products" aria-label="추천 상품" className="w-full">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              추천 상품
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <RowsMenu value={rowCount} onChange={setRowCount} />
              <RefreshProductsButton
                isLoading={isRecommendedRefreshing}
                onRefresh={() => void recommendedProductsQuery.refetch()}
                updatedAt={recommendedUpdatedAt}
              />
            </div>
          </div>

          {recommendedError ? (
            <div className={`mb-8 rounded-2xl px-5 py-4 text-sm font-bold text-rose-700 ${hairline.card}`}>
              {recommendedError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {isRecommendedLoading && recommendedProducts.length === 0
              ? Array.from({ length: recommendedLimit }, (_, index) => (
                  <ProductCardSkeleton key={`home-skeleton-${index}`} />
                ))
              : recommendedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={onProductSelect}
                  />
                ))}
          </div>

          {!isRecommendedLoading && !recommendedError && recommendedProducts.length === 0 ? (
            <div className={`mt-8 flex min-h-40 items-center justify-center rounded-2xl px-6 text-center ${hairline.panelSoft}`}>
              <p className="text-base font-bold text-gray-900">
                추천할 상품이 없습니다
                <span className="mt-1 block text-sm font-semibold text-[#86868B]">
                  백엔드 데이터 연결 상태를 확인해 주세요
                </span>
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
