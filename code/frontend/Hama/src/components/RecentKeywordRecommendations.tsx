import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { useSearchProductsQuery } from '../queries/productQueries';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { getRecentSearches } from '../utils/recentSearches';

type RecentKeywordRecommendationsProps = {
  onProductSelect: (product: Product) => void;
};

const fallbackKeywords = ['갤럭시 S25', '아이폰 16', '맥북', '애플워치'];
const platformFilters = ['번개장터', '중고나라'];
const productPreviewLimit = 4;

export function RecentKeywordRecommendations({
  onProductSelect,
}: RecentKeywordRecommendationsProps) {
  const [recentKeywords, setRecentKeywords] = useState(() => getRecentSearches());
  const keywordOptions = useMemo(
    () =>
      (recentKeywords.length > 0 ? recentKeywords : fallbackKeywords)
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 4),
    [recentKeywords]
  );
  const [activeKeyword, setActiveKeyword] = useState(
    keywordOptions[0] ?? fallbackKeywords[0]
  );
  const selectedKeyword = keywordOptions.includes(activeKeyword)
    ? activeKeyword
    : keywordOptions[0] ?? fallbackKeywords[0];
  const productsQuery = useSearchProductsQuery({
    query: selectedKeyword,
    platforms: platformFilters,
    sort: 'relevance',
    page: 1,
    limit: productPreviewLimit,
  });
  const previewProducts = productsQuery.data?.items ?? [];

  useEffect(() => {
    const refreshRecentKeywords = () => setRecentKeywords(getRecentSearches());

    window.addEventListener('storage', refreshRecentKeywords);
    window.addEventListener('focus', refreshRecentKeywords);

    return () => {
      window.removeEventListener('storage', refreshRecentKeywords);
      window.removeEventListener('focus', refreshRecentKeywords);
    };
  }, []);

  return (
    <section aria-labelledby="recent-keyword-title" className="w-full">
      <div className="mx-auto max-w-[1440px] px-8">
        <div className={`grid overflow-hidden rounded-[32px] lg:grid-cols-[320px_minmax(0,1fr)] ${hairline.panelSoft}`}>
          <aside className="border-b border-[#D7DCE5] bg-white/82 px-6 py-7 lg:border-b-0 lg:border-r">
            <span className="inline-flex h-8 items-center rounded-full border border-[#D7DCE5] bg-white px-3 text-xs font-black text-[#4F5866] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              최근 검색 기반
            </span>
            <h2
              id="recent-keyword-title"
              className="mt-4 text-[24px] font-black leading-tight tracking-tight text-gray-950"
            >
              최근에 검색하신
              <br />
              키워드에요
            </h2>
            <p className={`mt-2 text-sm font-bold leading-relaxed ${hairline.mutedText}`}>
              키워드를 선택하면 관련 상품을 간단히 보여줍니다.
            </p>

            <div className="mt-6 grid gap-2.5" aria-label="최근 검색 키워드">
              {keywordOptions.map((keyword) => {
                const isActive = keyword === selectedKeyword;

                return (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => setActiveKeyword(keyword)}
                    aria-pressed={isActive}
                    className={`flex min-h-[50px] items-center justify-between gap-3 rounded-[16px] px-4 text-left transition-all duration-200 ${hairline.focus} ${
                      isActive
                        ? 'border border-[#1D1D1F] bg-white text-gray-950 shadow-[inset_0_0_0_1px_rgba(29,29,31,0.56),0_10px_24px_rgba(29,29,31,0.075)]'
                        : 'border border-[#D7DCE5] bg-white/82 text-[#4E5865] shadow-[0_6px_16px_rgba(29,29,31,0.025)] hover:border-[#AEB6C2] hover:bg-white hover:text-gray-950'
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm font-black">
                      {keyword}
                    </span>
                    <span className="shrink-0 text-[11px] font-black text-[#86868B]">
                      최근 키워드
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="bg-[#FBFCFD]/82 px-6 py-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xl font-black tracking-tight text-gray-950">
                  {selectedKeyword}
                </p>
                <p className={`mt-1 text-xs font-bold ${hairline.mutedText}`}>
                  관련 상품 4개
                </p>
              </div>
              <Link
                to={`/search?search=${encodeURIComponent(selectedKeyword)}`}
                className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full px-4 text-sm font-black ${hairline.secondaryButton} ${hairline.focus}`}
              >
                더보기 &gt;
              </Link>
            </div>

            {productsQuery.isError ? (
              <div className={`flex min-h-[250px] items-center justify-center rounded-[22px] px-5 text-center text-sm font-black text-rose-700 ${hairline.card}`}>
                관련 상품을 불러오지 못했습니다.
              </div>
            ) : null}

            {!productsQuery.isError ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {productsQuery.isPending && previewProducts.length === 0
                  ? Array.from({ length: productPreviewLimit }, (_, index) => (
                      <ProductCardSkeleton
                        key={`recent-keyword-skeleton-${index}`}
                        variant="compact"
                      />
                    ))
                  : previewProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={onProductSelect}
                        variant="compact"
                      />
                    ))}
              </div>
            ) : null}

            {!productsQuery.isPending &&
            !productsQuery.isError &&
            previewProducts.length === 0 ? (
              <div className={`flex min-h-[250px] items-center justify-center rounded-[22px] px-5 text-center ${hairline.card}`}>
                <p className="text-sm font-black text-gray-950">
                  관련 상품이 없습니다
                  <span className={`mt-1 block text-xs font-bold ${hairline.quietText}`}>
                    다른 최근 키워드를 선택해 주세요
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
