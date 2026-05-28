import { RefreshCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchSearchProducts } from '../api/products';
import { PlatformPill } from '../components/PlatformPill';
import type { PlatformName } from '../components/PlatformPill';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';
import { SortControls } from '../components/SortControls';
import type { SortOption } from '../components/SortControls';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import {
  TEMPORARY_SEARCH_DISPLAY_LIMIT,
  calculateSearchSummaryTemporarily,
  filterAndSortProductsTemporarily,
} from '../utils/temporarySearchCalculations';
import { formatWon } from '../utils/format';

type SearchResultsPageProps = {
  onProductSelect: (product: Product) => void;
};

// TODO(BE): 플랫폼별 결과 수가 필요하면 search API의 facets.platforms에서 받아 렌더링합니다.
const platformFilters: PlatformName[] = ['번개장터', '중고나라'];
const SEARCH_API_LIMIT = 5000;

export function SearchResultsPage({ onProductSelect }: SearchResultsPageProps) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() || '맥북 air';
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activePlatforms, setActivePlatforms] =
    useState<PlatformName[]>(platformFilters);
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSearchProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await fetchSearchProducts({
          query,
          platforms: platformFilters,
          sort: 'recent',
          page: 1,
          limit: SEARCH_API_LIMIT,
          signal: controller.signal,
        });

        setApiProducts(response.items);
        setUpdatedAt(response.summary.updatedAt);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setApiProducts([]);
        setUpdatedAt('');
        setErrorMessage('검색 API 호출에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSearchProducts();

    return () => controller.abort();
  }, [query]);

  // TODO(BE): MVP 임시 필터/정렬입니다. 백엔드가 플랫폼 필터/정렬을 책임지면
  // filterAndSortProductsTemporarily 호출을 제거하고 response.items를 그대로 사용합니다.
  const filteredProducts = useMemo(() => {
    return filterAndSortProductsTemporarily({
      products: apiProducts,
      query,
      platforms: activePlatforms,
      sortOption,
    });
  }, [activePlatforms, apiProducts, query, sortOption]);

  // TODO(BE): MVP 임시 가격 요약입니다. 백엔드가 필터 적용 전체 결과 기준 summary를 내려주면
  // calculateSearchSummaryTemporarily 호출을 제거하고 response.summary 값을 사용합니다.
  const { lowestPrice, averagePrice } = useMemo(
    () => calculateSearchSummaryTemporarily(filteredProducts),
    [filteredProducts]
  );
  const displayProducts = filteredProducts.slice(0, TEMPORARY_SEARCH_DISPLAY_LIMIT);

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
                  총 {filteredProducts.length.toLocaleString('ko-KR')}개 상품
                </span>
                {isLoading ? <span>불러오는 중</span> : null}
              </div>
            </div>

            <p className={`inline-flex items-center gap-2 text-sm font-semibold ${hairline.mutedText}`}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              최종 업데이트: {updatedAt || '확인 중'}
            </p>
          </div>

          <div className={`mt-7 rounded-[32px] p-4 ${hairline.panelSoft}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-3">
                {platformFilters.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => {
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

              <SortControls activeSort={sortOption} onSortChange={setSortOption} />
            </div>
          </div>

          <div
            className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2"
            aria-label="검색 가격 요약"
          >
            <SummaryMetric
              label="최저가"
              value={formatWon(lowestPrice)}
              description="현재 결과에서 가장 낮은 상품가"
              tone="emerald"
            />
            <SummaryMetric
              label="평균가"
              value={formatWon(averagePrice)}
              description="검색 결과 기준 1천원 단위 반올림"
              tone="gray"
            />
          </div>

          {errorMessage ? (
            <div className={`mt-6 rounded-2xl px-5 py-4 text-sm font-bold text-rose-700 ${hairline.card}`}>
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && filteredProducts.length === 0 ? (
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
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={onProductSelect}
              />
            ))}
          </div>

          <div className={`mt-8 flex min-h-24 items-center justify-center rounded-2xl px-6 text-center ${hairline.panelSoft}`}>
            <p className="text-base font-bold text-gray-900">
              {displayProducts.length < filteredProducts.length
                ? `${displayProducts.length.toLocaleString('ko-KR')}개만 먼저 보여주는 중이에요`
                : '조건에 맞는 상품을 정리했어요'}
              <span className="mt-1 block text-sm font-semibold text-[#86868B]">
                필터를 바꾸면 더 다양한 결과를 볼 수 있어요
              </span>
            </p>
          </div>
        </div>
      </section>
    </main>
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
