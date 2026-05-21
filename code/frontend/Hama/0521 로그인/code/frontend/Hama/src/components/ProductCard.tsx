import type { Product } from '../types/product';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';
import { PlatformPill } from './PlatformPill';
import { ProductVisual } from './ProductVisual';

type ProductCardProps = {
  product: Product;
  onClick: (product: Product) => void;
};

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${hairline.card} ${hairline.cardHover}`}>
      <button
        type="button"
        onClick={() => onClick(product)}
        className="flex flex-col h-full text-left outline-none"
        aria-label={`${product.name} 상세 보기`}
      >
        <div className={`relative overflow-hidden transition-colors group-hover:bg-white ${hairline.image}`}>
          <span className={`absolute right-4 top-4 z-10 ${hairline.status}`}>
            {product.status}
          </span>
          <ProductVisual imageUrl={product.imageUrl} name={product.name} />
        </div>
        <div className="p-6 flex flex-col flex-1 justify-between">
          <div>
            <h3 className="text-base font-bold tracking-tight text-gray-900 leading-snug line-clamp-2">
              {product.name}
            </h3>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <p className="text-sm font-bold text-gray-900">
              {formatWon(product.price)}
            </p>
            <PlatformPill platform={product.platform} size="card" />
          </div>
        </div>
      </button>
    </article>
  );
}
