import type { Product } from '../types/product';

const WISHLIST_KEY = 'hama_wishlist_products';
const RECENT_PRODUCTS_KEY = 'hama_recent_products';
const MAX_RECENT_PRODUCTS = 12;

export function productStorageKey(product: Product): string {
  return `${product.platform}:${product.pid}`;
}

export function getStoredWishlistProducts(): Product[] {
  return readProductList(WISHLIST_KEY);
}

export function getStoredRecentProducts(): Product[] {
  return readProductList(RECENT_PRODUCTS_KEY);
}

export function isProductWished(product: Product): boolean {
  const targetKey = productStorageKey(product);

  return getStoredWishlistProducts().some(
    (item) => productStorageKey(item) === targetKey
  );
}

export function toggleWishlistProduct(product: Product): boolean {
  const targetKey = productStorageKey(product);
  const currentProducts = getStoredWishlistProducts();
  const isAlreadyWished = currentProducts.some(
    (item) => productStorageKey(item) === targetKey
  );

  const nextProducts = isAlreadyWished
    ? currentProducts.filter((item) => productStorageKey(item) !== targetKey)
    : [product, ...currentProducts];

  writeProductList(WISHLIST_KEY, nextProducts);

  return !isAlreadyWished;
}

export function removeWishlistProduct(product: Product): Product[] {
  const targetKey = productStorageKey(product);
  const nextProducts = getStoredWishlistProducts().filter(
    (item) => productStorageKey(item) !== targetKey
  );

  writeProductList(WISHLIST_KEY, nextProducts);

  return nextProducts;
}

export function saveRecentProduct(product: Product): Product[] {
  const targetKey = productStorageKey(product);
  const nextProducts = [
    product,
    ...getStoredRecentProducts().filter(
      (item) => productStorageKey(item) !== targetKey
    ),
  ].slice(0, MAX_RECENT_PRODUCTS);

  writeProductList(RECENT_PRODUCTS_KEY, nextProducts);

  return nextProducts;
}

export function removeRecentProduct(product: Product): Product[] {
  const targetKey = productStorageKey(product);
  const nextProducts = getStoredRecentProducts().filter(
    (item) => productStorageKey(item) !== targetKey
  );

  writeProductList(RECENT_PRODUCTS_KEY, nextProducts);

  return nextProducts;
}

function readProductList(storageKey: string): Product[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(storageKey);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isProduct);
  } catch {
    return [];
  }
}

function writeProductList(storageKey: string, products: Product[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(products));
}

function isProduct(value: unknown): value is Product {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const product = value as Partial<Product>;

  return (
    typeof product.id === 'number' &&
    typeof product.platform === 'string' &&
    typeof product.pid === 'string' &&
    typeof product.name === 'string' &&
    typeof product.price === 'number' &&
    typeof product.status === 'string' &&
    typeof product.description === 'string' &&
    (typeof product.imageUrl === 'string' || product.imageUrl === null) &&
    Array.isArray(product.images) &&
    typeof product.link === 'string' &&
    typeof product.date === 'string' &&
    typeof product.category === 'string' &&
    Array.isArray(product.priceHistory)
  );
}
