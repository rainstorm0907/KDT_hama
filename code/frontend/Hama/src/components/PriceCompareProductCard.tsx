import { Plus, X } from 'lucide-react';
import { PlatformPill } from './PlatformPill';
import { ProductVisual } from './ProductVisual';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatWon } from '../utils/format';

type PriceCompareProductCardProps = {
  product: Product | null;
  color: string;
  index: number;
  onAddClick: () => void;
  onRemoveClick?: () => void;
  density?: 'large' | 'compact';
};

export function PriceCompareProductCard({
  product,
  color,
  index,
  onAddClick,
  onRemoveClick,
  density = 'large',
}: PriceCompareProductCardProps) {
  const isCompact = density === 'compact';

  if (!product) {
    if (isCompact) {
      return (
        <button
          type="button"
          onClick={onAddClick}
          className={`group relative grid min-h-[124px] items-center rounded-[20px] border bg-white/76 p-3 text-left shadow-[0_8px_22px_rgba(29,29,31,0.032),inset_0_1px_0_rgba(255,255,255,0.96)] transition hover:bg-white ${hairline.focus}`}
          style={{ borderColor: `${color}70` }}
          aria-label={`${index + 1}번 비교 상품 선택`}
        >
          <span className={`flex h-16 min-w-0 items-center justify-center rounded-[18px] ${hairline.image}`}>
            <span className="text-sm font-black text-[#5B6472]">
              상품을 선택하세요
            </span>
          </span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={onAddClick}
        className={`group relative flex min-h-[360px] flex-col rounded-[24px] border bg-white/74 p-4 text-center shadow-[0_10px_26px_rgba(29,29,31,0.035),inset_0_1px_0_rgba(255,255,255,0.96)] transition hover:bg-white ${hairline.focus}`}
        style={{ borderColor: `${color}88` }}
        aria-label={`${index + 1}번 비교 상품 선택`}
      >
        <span className={`mt-12 flex aspect-square w-full items-center justify-center rounded-[22px] ${hairline.image}`}>
          <span
            className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-dashed bg-white text-2xl shadow-[0_10px_22px_rgba(29,29,31,0.045)] transition group-hover:scale-[1.03]"
            style={{ borderColor: `${color}88`, color }}
          >
            <Plus className="h-7 w-7" aria-hidden="true" />
          </span>
        </span>
        <span className="mt-7 text-base font-black text-[#5B6472]">
          상품을 선택하세요
        </span>
      </button>
    );
  }

  if (isCompact) {
    return (
      <article
        className="relative grid min-h-[124px] grid-cols-[78px_1fr_auto] items-center gap-3 rounded-[20px] border bg-white/88 p-3 shadow-[0_9px_24px_rgba(29,29,31,0.045),inset_0_1px_0_rgba(255,255,255,0.96)]"
        style={{ borderColor: color }}
      >
        <div className={`h-20 overflow-hidden rounded-[17px] ${hairline.image}`}>
          <ProductVisual
            imageUrl={product.imageUrl}
            name={product.name}
            variant="thumb"
          />
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-gray-950">
            {product.name}
          </h3>
          <p className="mt-2 text-base font-black tracking-tight text-gray-950">
            {formatWon(product.price)}
          </p>
          <div className="mt-2">
            <PlatformPill platform={product.platform} size="card" />
          </div>
        </div>
        {onRemoveClick ? (
          <button
            type="button"
            onClick={onRemoveClick}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#7B818C] transition hover:bg-white hover:text-gray-950 ${hairline.secondaryButton} ${hairline.focus}`}
            aria-label={`${product.name} 비교 목록에서 제거`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className="relative flex min-h-[360px] flex-col rounded-[24px] border bg-white/88 p-4 shadow-[0_12px_32px_rgba(29,29,31,0.052),inset_0_1px_0_rgba(255,255,255,0.96)]"
      style={{ borderColor: color }}
    >
      {onRemoveClick ? (
        <button
          type="button"
          onClick={onRemoveClick}
          className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[#7B818C] transition hover:bg-white hover:text-gray-950 ${hairline.secondaryButton} ${hairline.focus}`}
          aria-label={`${product.name} 비교 목록에서 제거`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
      <div className={`mt-12 aspect-square w-full overflow-hidden rounded-[22px] ${hairline.image}`}>
        <ProductVisual
          imageUrl={product.imageUrl}
          name={product.name}
          variant="thumb"
        />
      </div>
      <div className="mt-5 min-w-0">
        <h3 className="line-clamp-2 min-h-[44px] text-base font-black leading-snug text-gray-950">
          {product.name}
        </h3>
        <p className="mt-3 text-xl font-black tracking-tight text-gray-950">
          {formatWon(product.price)}
        </p>
      </div>
      <div className="mt-auto pt-4">
        <PlatformPill platform={product.platform} size="card" />
      </div>
    </article>
  );
}
