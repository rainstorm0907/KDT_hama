import { Check, Plus, X } from 'lucide-react';
import { PlatformPill } from './PlatformPill';
import { ProductVisual } from './ProductVisual';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatWon } from '../utils/format';
import { productStorageKey } from '../utils/userProductLists';

type PriceCompareProductPickerProps = {
  products: Product[];
  recommendationKeyword: string;
  recommendedProducts: Product[];
  selectedProducts: Product[];
  selectedKeys: string[];
  isRecommendationLoading: boolean;
  maxSelectedCount: number;
  viewMode?: 'modal' | 'page';
  onClose: () => void;
  onToggleProduct: (product: Product) => void;
};

type PickerProductItem = {
  product: Product;
  isRecommended: boolean;
};

type PickerSectionData = {
  keyword: string;
  listCount: number;
  recommendationCount: number;
  items: PickerProductItem[];
};

export function PriceCompareProductPicker({
  products,
  recommendationKeyword,
  recommendedProducts,
  selectedProducts,
  selectedKeys,
  isRecommendationLoading,
  maxSelectedCount,
  viewMode = 'modal',
  onClose,
  onToggleProduct,
}: PriceCompareProductPickerProps) {
  const isFull = selectedKeys.length >= maxSelectedCount;
  const sections = buildPickerSections({
    products,
    recommendedProducts,
    anchorKeyword: recommendationKeyword,
  });

  return (
    <section
      role="dialog"
      aria-label="비교할 상품 선택"
      className={`flex w-full flex-col overflow-hidden rounded-[30px] border border-[#C6CDD8]/90 bg-white shadow-[0_20px_56px_rgba(29,29,31,0.085),inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(0,0,0,0.028)] ${
        viewMode === 'page'
          ? 'h-[clamp(600px,76vh,780px)]'
          : 'h-full'
      }`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="relative flex shrink-0 items-start justify-between gap-5 border-b border-[#C9CFDA]/82 px-7 py-5 md:px-8">
        <div className="min-w-0 pr-12 lg:pr-64">
          <h3 className="text-2xl font-black tracking-tight text-gray-950">
            비교할 상품 선택
          </h3>
          <p className={`mt-2 text-sm font-bold ${hairline.mutedText}`}>
            가격 비교 리스트를 키워드별로 보고, 추천 상품도 함께 추가할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-gray-900 ${hairline.secondaryButton} ${hairline.focus}`}
          aria-label="비교할 상품 선택 닫기"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div
        className="transient-scrollbar min-h-0 flex-1 overflow-y-auto px-7 py-6 md:px-8"
        aria-label="비교할 상품 선택"
      >
        {sections.length > 0 ? (
          sections.map((section) => (
            <PickerSection
              key={section.keyword}
              section={section}
              selectedKeys={selectedKeys}
              isFull={isFull}
              onToggleProduct={onToggleProduct}
            />
          ))
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-[#D7DDE7] bg-white px-6 text-center">
            <p className="text-base font-black text-gray-950">
              가격 비교 리스트가 비어 있습니다.
              <span className={`mt-2 block text-sm font-bold ${hairline.mutedText}`}>
                상품 상세에서 가격 비교 리스트에 먼저 추가해 주세요.
              </span>
            </p>
          </div>
        )}

        {isRecommendationLoading ? (
          <p className={`mt-5 rounded-[18px] border border-dashed border-[#D7DDE7] bg-white px-4 py-4 text-sm font-bold ${hairline.mutedText}`}>
            추천 상품을 불러오는 중입니다.
          </p>
        ) : null}
      </div>

      <div className="grid min-h-[96px] shrink-0 gap-3 border-t border-[#D7DDE7]/86 bg-white px-7 py-4 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-8">
        <p className="text-base font-black text-[#303743]">
          최소 2개 이상 선택하면 가격 비교 결과를 볼 수 있습니다.
        </p>
        <SelectedSlotPreview
          selectedProducts={selectedProducts}
          maxSelectedCount={maxSelectedCount}
          onToggleProduct={onToggleProduct}
        />
        <button
          type="button"
          onClick={onClose}
          className={`inline-flex h-12 items-center justify-center rounded-[16px] px-6 text-sm font-black md:justify-self-end ${hairline.primaryButton} ${hairline.focus}`}
        >
          선택 완료
        </button>
      </div>
    </section>
  );
}

function SelectedSlotPreview({
  selectedProducts,
  maxSelectedCount,
  onToggleProduct,
}: {
  selectedProducts: Product[];
  maxSelectedCount: number;
  onToggleProduct: (product: Product) => void;
}) {
  return (
    <div className="hidden items-center justify-center gap-2 sm:flex">
      {Array.from({ length: maxSelectedCount }, (_, index) => {
        const product = selectedProducts[index] ?? null;
        const color = getSlotColor(index);

        return (
          <button
            key={product ? productStorageKey(product) : `slot-${index}`}
            type="button"
            disabled={!product}
            onClick={() => {
              if (product) {
                onToggleProduct(product);
              }
            }}
            className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-dashed bg-white/92 shadow-[0_10px_22px_rgba(29,29,31,0.06),inset_0_1px_0_rgba(255,255,255,0.96)] transition ${
              product
                ? `hover:-translate-y-0.5 hover:bg-white ${hairline.focus}`
                : 'cursor-default'
            }`}
            style={{ borderColor: `${color}88` }}
            aria-label={
              product
                ? `${index + 1}번 선택 상품 제거`
                : `${index + 1}번 빈 선택 슬롯`
            }
          >
            {product ? (
              <ProductVisual
                imageUrl={product.imageUrl}
                name={product.name}
                variant="thumb"
              />
            ) : (
              <span className="absolute inset-0 bg-white/70" aria-hidden="true" />
            )}
            <span
              className="absolute left-1/2 top-1/2 z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black text-white shadow-[0_7px_14px_rgba(29,29,31,0.16)]"
              style={{ backgroundColor: color }}
            >
              {index + 1}
            </span>
            {product ? (
              <span
                className="absolute right-0.5 top-0.5 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-white/90 bg-[#1D1D1F] text-white shadow-[0_4px_10px_rgba(29,29,31,0.18)]"
                aria-hidden="true"
              >
                <X className="h-2.5 w-2.5" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PickerSection({
  section,
  selectedKeys,
  isFull,
  onToggleProduct,
}: {
  section: PickerSectionData;
  selectedKeys: string[];
  isFull: boolean;
  onToggleProduct: (product: Product) => void;
}) {
  return (
    <section className="mt-6 border-t border-dashed border-[#B9C1CE]/90 pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h4 className="text-lg font-black tracking-tight text-gray-950">
          {section.keyword}
        </h4>
      </div>
      <ProductGrid
        items={section.items}
        selectedKeys={selectedKeys}
        isFull={isFull}
        onToggleProduct={onToggleProduct}
      />
    </section>
  );
}

type ProductGridProps = {
  items: PickerProductItem[];
  selectedKeys: string[];
  isFull: boolean;
  onToggleProduct: (product: Product) => void;
};

function ProductGrid({
  items,
  selectedKeys,
  isFull,
  onToggleProduct,
}: ProductGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {items.map(({ product, isRecommended }) => {
        const key = productStorageKey(product);
        const isSelected = selectedKeys.includes(key);
        const isDisabled = isFull && !isSelected;

        return (
          <button
            key={`${key}-${isRecommended ? 'recommendation' : 'candidate'}`}
            type="button"
            onClick={() => onToggleProduct(product)}
            disabled={isDisabled}
            className={`group grid min-h-[112px] grid-cols-[86px_1fr_auto] items-center gap-3 rounded-[22px] border bg-white/96 p-3 text-left transition ${hairline.focus} ${
              isSelected
                ? 'border-[#1D1D1F] bg-white shadow-[inset_0_0_0_1px_rgba(29,29,31,0.62),0_12px_28px_rgba(29,29,31,0.06)]'
                : 'border-[#D7DDE7] hover:border-[#AEB6C2] hover:bg-white'
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-pressed={isSelected}
          >
            <span className={`h-[86px] overflow-hidden rounded-[18px] ${hairline.image}`}>
              <ProductVisual
                imageUrl={product.imageUrl}
                name={product.name}
                variant="thumb"
              />
            </span>
            <span className="min-w-0">
              <span className="mb-2 flex flex-wrap items-center gap-2">
                <PlatformPill platform={product.platform} size="card" />
                <span className={hairline.status}>{product.status}</span>
                {isRecommended ? <HamaRecommendBadge /> : null}
              </span>
              <span className="block truncate text-base font-black text-gray-950">
                {product.name}
              </span>
              <span className="mt-1 block text-sm font-black text-gray-950">
                {formatWon(product.price)}
              </span>
            </span>
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition ${
                isSelected
                  ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white'
                  : 'border-[#C9CFDA] bg-white text-gray-950 group-hover:border-[#AEB6C2]'
              }`}
            >
              {isSelected ? (
                <Check className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Plus className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function HamaRecommendBadge() {
  return (
    <span className="rounded-full border border-[#E5C58F]/80 bg-[#FFF8EA]/92 px-3 py-1 text-xs font-black text-[#B36A1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      Hama추천
    </span>
  );
}

function buildPickerSections({
  products,
  recommendedProducts,
  anchorKeyword,
}: {
  products: Product[];
  recommendedProducts: Product[];
  anchorKeyword: string;
}): PickerSectionData[] {
  const productsByKeyword = new Map<string, Product[]>();
  const existingKeys = new Set(products.map(productStorageKey));

  products.forEach((product) => {
    const keyword = getProductKeyword(product);
    const sectionProducts = productsByKeyword.get(keyword) ?? [];

    sectionProducts.push(product);
    productsByKeyword.set(keyword, sectionProducts);
  });

  const sectionKeywords =
    productsByKeyword.size > 0
      ? Array.from(productsByKeyword.keys())
      : [anchorKeyword.trim() || '추천 상품'];
  const usedRecommendationKeys = new Set<string>();

  return sectionKeywords
    .map((keyword) => {
      const listProducts = productsByKeyword.get(keyword) ?? [];
      const recommendationLimit = listProducts.length >= 6 ? 1 : 2;
      const recommendations = recommendedProducts
        .filter((product) => {
          const key = productStorageKey(product);

          if (existingKeys.has(key) || usedRecommendationKeys.has(key)) {
            return false;
          }

          return matchesKeyword(product, keyword);
        })
        .slice(0, recommendationLimit);

      recommendations.forEach((product) =>
        usedRecommendationKeys.add(productStorageKey(product))
      );

      const items = [
        ...listProducts.map((product) => ({ product, isRecommended: false })),
        ...recommendations.map((product) => ({ product, isRecommended: true })),
      ];

      return {
        keyword,
        listCount: listProducts.length,
        recommendationCount: recommendations.length,
        items,
      };
    })
    .filter((section) => section.items.length > 0);
}

function getProductKeyword(product: Product) {
  const category = product.category.trim();

  if (category) {
    return category;
  }

  const tokens = product.name
    .split(/[^0-9A-Za-z가-힣]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return tokens.slice(0, 2).join(' ') || '기타 상품';
}

function matchesKeyword(product: Product, keyword: string) {
  if (keyword === '추천 상품') {
    return true;
  }

  const normalizedKeyword = normalizeKeyword(keyword);
  const productText = normalizeKeyword(
    `${product.name} ${product.brand} ${product.category}`
  );

  return productText.includes(normalizedKeyword);
}

function normalizeKeyword(value: string) {
  return value.replace(/\s+/g, '').toLowerCase();
}

function getSlotColor(index: number) {
  return ['#3D6BE8', '#2C9A72', '#E37B35', '#7B61C7'][index] ?? '#626873';
}
