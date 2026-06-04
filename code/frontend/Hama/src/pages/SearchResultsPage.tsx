import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlatformPill } from '../components/PlatformPill';
import type { PlatformName } from '../components/PlatformPill';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { RefreshProductsButton } from '../components/RefreshProductsButton';
import { RowsMenu } from '../components/RowsMenu';
import { SideButtons } from '../components/SideButtons';
import type { SidePanel } from '../components/SideButtons';
import { SearchBar } from '../components/SearchBar';
import { SortControls } from '../components/SortControls';
import type { SortOption } from '../components/SortControls';
import { useSearchProductsQuery } from '../queries/productQueries';
import { hairline } from '../styles/hairline';
import type { RowCountOption } from '../types/productList';
import type { Product } from '../types/product';
import { formatUpdatedAtTimestamp, formatWon } from '../utils/format';

type SearchResultsPageProps = {
  activeSidePanel: SidePanel | null;
  onOpenPriceCompare: () => void;
  onProductSelect: (product: Product) => void;
  onSidePanelChange: (panel: SidePanel | null) => void;
};

// TODO(BE): 플랫폼별 결과 수가 필요하면 search API의 facets.platforms에서 받아 렌더링합니다.
const platformFilters: PlatformName[] = ['번개장터', '중고나라'];
const PRODUCT_COLUMNS = 4;

export function SearchResultsPage({
  activeSidePanel,
  onOpenPriceCompare,
  onProductSelect,
  onSidePanelChange,
}: SearchResultsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const query =
    searchParams.get('q')?.trim() ||
    searchParams.get('search')?.trim() ||
    '맥북 air';
  const pageParam = Number(searchParams.get('page') || '1');
  const currentPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activePlatforms, setActivePlatforms] =
    useState<PlatformName[]>(platformFilters);
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [rowCount, setRowCount] = useState<RowCountOption>(4);
  const searchLimit = rowCount * PRODUCT_COLUMNS;
  const searchProductsQuery = useSearchProductsQuery({
    query,
    platforms: activePlatforms,
    sort: sortOption,
    page: currentPage,
    limit: searchLimit,
  });
  const searchData = searchProductsQuery.data;
  const displayProducts = searchData?.items ?? [];
  const totalCount = searchData?.total ?? 0;
  const summary = searchData?.summary ?? {
    lowestPrice: 0,
    averagePrice: 0,
  };
  const isLoading = searchProductsQuery.isPending;
  const isRefreshing = searchProductsQuery.isFetching;
  const updatedAtLabel = formatUpdatedAtTimestamp(
    searchProductsQuery.dataUpdatedAt
  );
  const errorMessage = searchProductsQuery.isError
    ? '검색 API 호출에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.'
    : null;
  const totalPages = Math.max(1, Math.ceil(totalCount / searchLimit));

  const updatePage = useCallback((page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);

    if (nextPage === currentPage) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (nextPage === 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(nextPage));
    }

    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage, searchParams, setSearchParams, totalPages]);

  const resetPage = useCallback(() => {
    if (currentPage === 1) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('page');
    setSearchParams(nextParams, { replace: true });
  }, [currentPage, searchParams, setSearchParams]);

  useEffect(() => {
    if (totalCount > 0 && currentPage > totalPages) {
      updatePage(totalPages);
    }
  }, [currentPage, totalCount, totalPages, updatePage]);

  return (
    <main className={`flex-1 pb-24 ${hairline.page}`}>
      <SearchBar
        key={query}
        isOpen={isSearchOpen}
        initialQuery={query}
        onOpen={() => setIsSearchOpen(true)}
        onClose={() => setIsSearchOpen(false)}
      />

      <section className="w-full pt-6" aria-labelledby="search-result-title">
        <div className="mx-auto max-w-[1440px] px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1
                id="search-result-title"
                className="text-2xl font-black tracking-tight text-gray-950 md:text-[28px]"
              >
                {query} 검색 결과
              </h1>
              <div
                className={`mt-4 flex flex-wrap items-center gap-4 text-base font-semibold ${hairline.mutedText}`}
              >
                <span>
                  총 {totalCount.toLocaleString('ko-KR')}개 상품
                </span>
                {isLoading ? <span>불러오는 중</span> : null}
              </div>
            </div>

            <RefreshProductsButton
              isLoading={isRefreshing}
              onRefresh={() => void searchProductsQuery.refetch()}
              updatedAt={updatedAtLabel}
            />
          </div>

          <div className={`relative z-[70] mt-7 rounded-[32px] p-4 ${hairline.panelSoft}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                {platformFilters.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
                      resetPage();
                      setActivePlatforms((current) => {
                        const isSelected = current.includes(platform);

                        if (isSelected && current.length === 1) {
                          return platformFilters;
                        }

                        if (isSelected) {
                          return current.filter((item) => item !== platform);
                        }

                        return [...current, platform].slice(0, platformFilters.length);
                      });
                    }}
                    className={`rounded-[18px] transition-shadow active:shadow-[0_0_0_2px_rgba(0,0,0,1)] ${hairline.focusWide}`}
                    aria-pressed={activePlatforms.includes(platform)}
                  >
                    <PlatformPill
                      platform={platform}
                      isActive={activePlatforms.includes(platform)}
                    />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-start gap-3 md:justify-end">
                <RowsMenu
                  value={rowCount}
                  onChange={(nextRowCount) => {
                    resetPage();
                    setRowCount(nextRowCount);
                  }}
                />
                <SortControls
                  activeSort={sortOption}
                  onSortChange={(nextSortOption) => {
                    resetPage();
                    setSortOption(nextSortOption);
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="relative z-0 mt-5 grid grid-cols-1 gap-3 md:grid-cols-2"
            aria-label="검색 가격 요약"
          >
            <SummaryMetric
              label="최저가"
              value={formatWon(summary.lowestPrice)}
              description="현재 결과에서 가장 낮은 상품가"
              tone="emerald"
            />
            <SummaryMetric
              label="평균가"
              value={formatWon(summary.averagePrice)}
              description="검색 결과 기준 1천원 단위 반올림"
              tone="gray"
            />
          </div>

          {errorMessage ? (
            <div className={`mt-6 rounded-2xl px-5 py-4 text-sm font-bold text-rose-700 ${hairline.card}`}>
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && totalCount === 0 ? (
            <div className={`mt-8 flex min-h-40 items-center justify-center rounded-2xl px-6 text-center ${hairline.panelSoft}`}>
              <p className="text-base font-bold text-gray-900">
                검색 결과가 없습니다
                <span className="mt-1 block text-sm font-semibold text-[#86868B]">
                  다른 검색어로 다시 찾아보세요
                </span>
              </p>
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {isLoading && displayProducts.length === 0
              ? Array.from({ length: searchLimit }, (_, index) => (
                  <ProductCardSkeleton key={`search-skeleton-${index}`} />
                ))
              : displayProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={onProductSelect}
                  />
                ))}
          </div>

          <SearchPagination
            currentPage={currentPage}
            isLoading={isLoading}
            pageSize={searchLimit}
            totalCount={totalCount}
            totalPages={totalPages}
            onPageChange={updatePage}
          />
        </div>
      </section>

      <SideButtons
        activePanel={activeSidePanel}
        onOpenPriceCompare={onOpenPriceCompare}
        onPanelChange={onSidePanelChange}
        onProductSelect={onProductSelect}
      />
    </main>
  );
}

function SearchPagination({
  currentPage,
  isLoading,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  isLoading: boolean;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalCount === 0) {
    return null;
  }

  const pageGroupSize = 10;
  const groupStart = Math.floor((currentPage - 1) / pageGroupSize) * pageGroupSize + 1;
  const groupEnd = Math.min(totalPages, groupStart + pageGroupSize - 1);
  const previousGroupPage = Math.max(1, groupStart - pageGroupSize);
  const nextGroupPage = Math.min(totalPages, groupStart + pageGroupSize);
  const pages = Array.from(
    { length: groupEnd - groupStart + 1 },
    (_, index) => groupStart + index
  );
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <nav
      className="mt-11 flex flex-col items-center gap-4"
      aria-label="검색 결과 페이지"
    >
      <p className={`text-sm font-bold ${hairline.mutedText}`}>
        {startItem.toLocaleString('ko-KR')}-{endItem.toLocaleString('ko-KR')} /
        총 {totalCount.toLocaleString('ko-KR')}개
      </p>

      <div className={`flex flex-wrap items-center justify-center gap-2 rounded-[24px] px-4 py-3 ${hairline.panelSoft}`}>
        <PaginationButton
          disabled={groupStart === 1 || isLoading}
          label="이전"
          onClick={() => onPageChange(previousGroupPage)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          이전
        </PaginationButton>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            disabled={isLoading}
            className={`flex h-10 min-w-10 items-center justify-center rounded-[15px] px-3 text-sm font-black transition-colors disabled:cursor-wait disabled:opacity-60 ${hairline.focus} ${
              page === currentPage
                ? hairline.controlActive
                : `${hairline.controlHover} text-[#626873]`
            }`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        <PaginationButton
          disabled={groupEnd === totalPages || isLoading}
          label="다음"
          onClick={() => onPageChange(nextGroupPage)}
        >
          다음
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </PaginationButton>
      </div>
    </nav>
  );
}

function PaginationButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-[15px] px-3 text-sm font-black text-[#626873] transition-colors hover:bg-white/68 hover:text-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-35 ${hairline.focus}`}
      aria-label={`${label} 페이지`}
    >
      {children}
    </button>
  );
}

function SummaryMetric({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: 'emerald' | 'gray';
}) {
  const valueClass = tone === 'emerald' ? 'text-emerald-600' : 'text-gray-950';

  return (
    <article className={`rounded-[22px] px-5 py-3.5 ${hairline.card}`}>
      <p className={`text-xs font-black ${hairline.mutedText}`}>{label}</p>
      <p className={`mt-1.5 text-2xl font-black tracking-tight ${valueClass}`}>
        {value}
      </p>
      <p className={`mt-1.5 text-xs font-semibold ${hairline.quietText}`}>{description}</p>
    </article>
  );
}
