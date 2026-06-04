import { ArrowLeft, ChevronRight, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PriceCompareChart } from './PriceCompareChart';
import { PriceCompareProductCard } from './PriceCompareProductCard';
import { PriceCompareProductPicker } from './PriceCompareProductPicker';
import { useRecommendedProductsQuery } from '../queries/productQueries';
import { hairline } from '../styles/hairline';
import type { PricePoint, Product } from '../types/product';
import {
  addPriceCompareProduct,
  getStoredPriceCompareProducts,
  productStorageKey,
} from '../utils/userProductLists';

type PriceCompareWorkspaceProps = {
  initialProduct?: Product | null;
  mode?: 'modal' | 'page';
};

const maxCompareCount = 4;
const minCompareCount = 2;

export function PriceCompareWorkspace({
  initialProduct = null,
  mode = 'modal',
}: PriceCompareWorkspaceProps) {
  const initialProductKey = initialProduct ? productStorageKey(initialProduct) : '';
  const [candidateProducts, setCandidateProducts] = useState<Product[]>(() =>
    initialProduct ? addPriceCompareProduct(initialProduct) : getStoredPriceCompareProducts()
  );
  const [selectedProductByKey, setSelectedProductByKey] = useState<
    Record<string, Product>
  >(() => (initialProductKey && initialProduct ? { [initialProductKey]: initialProduct } : {}));
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    initialProductKey ? [initialProductKey] : []
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerAnchorKeyword, setPickerAnchorKeyword] = useState('');
  const [isResultVisible, setIsResultVisible] = useState(false);
  const recommendedProductsQuery = useRecommendedProductsQuery({ limit: 16 });
  const selectedProducts = useMemo(
    () =>
      selectedKeys
        .map((key) =>
          selectedProductByKey[key] ??
          candidateProducts.find((product) => productStorageKey(product) === key)
        )
        .filter((product): product is Product => Boolean(product)),
    [candidateProducts, selectedKeys, selectedProductByKey]
  );
  const recommendationKeyword = getPrimaryComparisonKeyword(
    selectedProducts[0] ?? initialProduct ?? candidateProducts[0]
  );
  const pickerRecommendationKeyword =
    isPickerOpen ? pickerAnchorKeyword || recommendationKeyword : recommendationKeyword;
  // TODO(BE): 백에서 추천 상품을 제공하면, 첫 번째 비교 키워드와 맞는 추천 상품을
  // 이 내부 선택 팝업 추천 영역에 상시 노출합니다.
  const recommendedProducts = useMemo(
    () => recommendedProductsQuery.data?.items ?? [],
    [recommendedProductsQuery.data?.items]
  );
  const marketPoints = selectMarketPoints(selectedProducts, candidateProducts);
  const keyword = buildComparisonKeyword(selectedProducts[0] ?? candidateProducts[0]);
  const canShowResult = selectedProducts.length >= minCompareCount;
  const isCompactSlots = isResultVisible && canShowResult;

  const openPicker = () => {
    setPickerAnchorKeyword(recommendationKeyword);
    setIsPickerOpen(true);
  };

  const deselectProduct = (key: string) => {
    setSelectedKeys((current) => current.filter((item) => item !== key));
    setSelectedProductByKey((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });
    setIsResultVisible(false);
  };

  useEffect(() => {
    function refreshCandidates() {
      setCandidateProducts((current) => {
        const nextProducts = getStoredPriceCompareProducts();

        return nextProducts.length > 0
          ? mergeProductLists(current, nextProducts)
          : current;
      });
    }

    window.addEventListener('storage', refreshCandidates);
    window.addEventListener('focus', refreshCandidates);

    return () => {
      window.removeEventListener('storage', refreshCandidates);
      window.removeEventListener('focus', refreshCandidates);
    };
  }, []);

  const toggleProduct = (product: Product) => {
    const key = productStorageKey(product);
    const isSelected = selectedKeys.includes(key);

    if (isSelected) {
      deselectProduct(key);
      return;
    }

    if (selectedKeys.length >= maxCompareCount) {
      return;
    }

    setSelectedProductByKey((current) => ({
      ...current,
      [key]: product,
    }));
    setSelectedKeys((current) =>
      current.includes(key) || current.length >= maxCompareCount
        ? current
        : [...current, key]
    );
    setIsResultVisible(false);
  };

  const removeSelectedProduct = (product: Product) => {
    deselectProduct(productStorageKey(product));
  };

  return (
    <div className={`relative ${mode === 'modal' ? 'space-y-5' : 'space-y-6'}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-950 md:text-[28px]">
            가격 비교
          </h2>
          <p className={`mt-2 text-sm font-bold ${hairline.mutedText}`}>
            선택한 상품을 키워드 30일 시세 위에 등록일 기준으로 비교합니다.
          </p>
        </div>
        <span className={`inline-flex h-10 w-fit items-center rounded-full px-4 text-sm font-black ${hairline.control}`}>
          선택 상품 {selectedProducts.length}개
        </span>
      </div>

      <div
        className={
          isCompactSlots
            ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'
            : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'
        }
      >
        {Array.from({ length: maxCompareCount }, (_, index) => {
          const product = selectedProducts[index] ?? null;

          return (
            <PriceCompareProductCard
              key={product ? productStorageKey(product) : `empty-${index}`}
              product={product}
              color={getMarkerColor(index)}
              index={index}
              onAddClick={openPicker}
              onRemoveClick={
                product ? () => removeSelectedProduct(product) : undefined
              }
              density={isCompactSlots ? 'compact' : 'large'}
            />
          );
        })}
      </div>

      {isResultVisible && canShowResult ? (
        <PriceCompareChart
          keyword={keyword}
          points={marketPoints}
          products={selectedProducts}
        />
      ) : null}

      <div className="flex flex-col gap-3 rounded-[24px] border border-[#D7DDE7]/84 bg-white/66 p-3 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 px-2 text-base font-black text-[#3F4652]">
          <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
          {canShowResult
            ? isResultVisible
              ? '선은 전체 가격 데이터를 사용하고, 점은 2일 간격으로 표시합니다.'
              : '선택한 상품으로 가격 비교 결과를 볼 수 있습니다.'
            : '최소 2개 이상의 상품을 선택해야 가격 비교가 가능합니다.'}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          {isResultVisible ? (
            <button
              type="button"
              onClick={() => {
                setIsResultVisible(false);
                openPicker();
              }}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-black transition ${hairline.secondaryButton} ${hairline.focus}`}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              상품 다시 고르기
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canShowResult}
            onClick={() => {
              setIsPickerOpen(false);
              setIsResultVisible(true);
            }}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${hairline.primaryButton} ${hairline.focus}`}
          >
            {selectedProducts.length > 0
              ? `${selectedProducts.length}개 상품 비교하기`
              : '상품 비교하기'}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isPickerOpen ? (
        <div
          className={
            mode === 'page'
              ? 'absolute inset-x-0 top-0 z-30 flex min-h-full items-start justify-center rounded-[28px] bg-[#F8F9FB]/34 p-0 backdrop-blur-[0.75px]'
              : 'absolute inset-0 z-30 flex items-center justify-center rounded-[24px] bg-[#F8F9FB]/18 px-2 py-3 backdrop-blur-[0.5px] md:px-3'
          }
          role="presentation"
          onMouseDown={() => setIsPickerOpen(false)}
        >
          <div className={mode === 'page' ? 'w-full' : 'w-[98%] max-w-[1680px]'}>
            <PriceCompareProductPicker
              products={candidateProducts}
              recommendationKeyword={pickerRecommendationKeyword}
              recommendedProducts={recommendedProducts}
              selectedProducts={selectedProducts}
              selectedKeys={selectedKeys}
              isRecommendationLoading={recommendedProductsQuery.isPending}
              maxSelectedCount={maxCompareCount}
              viewMode={mode}
              onClose={() => setIsPickerOpen(false)}
              onToggleProduct={toggleProduct}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function selectMarketPoints(
  selectedProducts: Product[],
  candidateProducts: Product[]
): PricePoint[] {
  const sourceProducts = selectedProducts.length > 0 ? selectedProducts : candidateProducts;
  const sourceProduct = sourceProducts.reduce<Product | null>((current, product) => {
    if (!current || product.priceHistory.length > current.priceHistory.length) {
      return product;
    }

    return current;
  }, null);

  return sourceProduct?.priceHistory ?? [];
}

function buildComparisonKeyword(product: Product | undefined) {
  if (!product) {
    return '키워드 시세';
  }

  const tokens = getProductSearchTokens(product);
  const primaryTokens = tokens.slice(0, 2).join(' ');

  return primaryTokens || product.category || '키워드 시세';
}

function getPrimaryComparisonKeyword(product: Product | undefined | null) {
  if (!product) {
    return '';
  }

  return getProductSearchTokens(product)[0] ?? product.category ?? '';
}

function getProductSearchTokens(product: Product) {
  return product.name
    .split(/[^0-9A-Za-z가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function getMarkerColor(index: number) {
  return ['#3D6BE8', '#2C9A72', '#E37B35', '#7B61C7'][index] ?? '#626873';
}

function mergeProductLists(...productLists: Product[][]) {
  const seenKeys = new Set<string>();
  const mergedProducts: Product[] = [];

  productLists.flat().forEach((product) => {
    const key = productStorageKey(product);

    if (seenKeys.has(key)) {
      return;
    }

    seenKeys.add(key);
    mergedProducts.push(product);
  });

  return mergedProducts;
}
