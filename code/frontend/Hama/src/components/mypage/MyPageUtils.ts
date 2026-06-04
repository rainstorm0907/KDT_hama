import type { Product } from '../../types/product';

export type MyPageToastTone = 'amber' | 'gray' | 'rose';

export type MyPageToastState = {
  product: Product;
  message?: string;
  tone?: MyPageToastTone;
  actionLabel?: string;
  onAction?: () => void;
};

export function getProductListKey(product: Product): string {
  return `${product.platform}:${product.pid}`;
}
