import { Clock, Heart } from 'lucide-react';
import { useState } from 'react';
import { useRecommendedProductsQuery } from '../../queries/productQueries';
import { hairline } from '../../styles/hairline';
import type { Product } from '../../types/product';
import { formatUpdatedAt, formatUpdatedAtTimestamp } from '../../utils/format';
import {
  getStoredRecentProducts,
  getStoredWishlistProducts,
  isProductWished,
  removeWishlistProduct,
  toggleWishlistProduct,
} from '../../utils/userProductLists';
import {
  EmptyState,
  MyPageAlertToast,
  ProductListCard,
  RefreshButton,
  TabHeader,
} from './MyPageShared';
import { getProductListKey, type MyPageToastState } from './MyPageUtils';

type MyPageProductListTabProps = {
  type: 'wishlist' | 'recent';
  onProductSelect: (product: Product) => void;
};

export function MyPageProductListTab({
  type,
  onProductSelect,
}: MyPageProductListTabProps) {
  return type === 'wishlist' ? (
    <WishlistProductList onProductSelect={onProductSelect} />
  ) : (
    <RecentProductList onProductSelect={onProductSelect} />
  );
}

function WishlistProductList({
  onProductSelect,
}: {
  onProductSelect: (product: Product) => void;
}) {
  const [wishlist, setWishlist] = useState<Product[]>(() =>
    getStoredWishlistProducts()
  );
  const [lastLoaded, setLastLoaded] = useState(() => new Date().toISOString());
  const [toast, setToast] = useState<MyPageToastState | null>(null);
  const [enabledAlertKeys, setEnabledAlertKeys] = useState<string[]>([]);

  const refreshWishlist = () => {
    setWishlist(getStoredWishlistProducts());
    setLastLoaded(new Date().toISOString());
  };

  const restoreWishlistProduct = (product: Product) => {
    if (!isProductWished(product)) {
      toggleWishlistProduct(product);
    }

    setWishlist(getStoredWishlistProducts());
    setToast(null);
  };

  const removeItem = (product: Product) => {
    setWishlist(removeWishlistProduct(product));
    setToast({
      product,
      message: '찜 목록에서 상품을 제거했습니다',
      tone: 'rose',
      actionLabel: '되돌리기',
      onAction: () => restoreWishlistProduct(product),
    });
  };

  const toggleProductAlert = (product: Product) => {
    const key = getProductListKey(product);
    const isEnabled = enabledAlertKeys.includes(key);

    setEnabledAlertKeys((current) =>
      isEnabled ? current.filter((item) => item !== key) : [...current, key]
    );
    setToast(
      isEnabled
        ? {
            product,
            message: '상품 알림을 해제했습니다',
            tone: 'amber',
            actionLabel: '되돌리기',
            onAction: () => {
              setEnabledAlertKeys((current) =>
                current.includes(key) ? current : [...current, key]
              );
              setToast(null);
            },
          }
        : { product }
    );
  };

  return (
    <>
      <TabHeader
        title="찜 목록"
        description={`저장한 상품 ${wishlist.length.toLocaleString('ko-KR')}개`}
        action={
          <RefreshButton
            label="새로고침"
            onClick={refreshWishlist}
            updatedAt={formatUpdatedAt(lastLoaded)}
          />
        }
      />

      {wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-6 w-6 text-rose-500" aria-hidden="true" />}
          title="아직 찜한 상품이 없습니다"
          description="상품 상세에서 하트를 누르면 이곳에서 다시 확인할 수 있습니다."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {wishlist.map((product) => (
            <ProductListCard
              key={`${product.platform}-${product.pid}`}
              product={product}
              onSelect={onProductSelect}
              isWished
              onWishClick={() => removeItem(product)}
              isAlertEnabled={enabledAlertKeys.includes(getProductListKey(product))}
              onAlertClick={() => toggleProductAlert(product)}
            />
          ))}
        </div>
      )}
      {toast ? (
        <MyPageAlertToast
          product={toast.product}
          message={toast.message}
          tone={toast.tone}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}

function RecentProductList({
  onProductSelect,
}: {
  onProductSelect: (product: Product) => void;
}) {
  const [recentProducts, setRecentProducts] = useState<Product[]>(() =>
    getStoredRecentProducts()
  );
  const browseProductsQuery = useRecommendedProductsQuery({ limit: 6 });
  const browseProducts = browseProductsQuery.data?.items ?? [];
  const isLoading = browseProductsQuery.isFetching;
  const errorMessage = browseProductsQuery.isError
    ? '백엔드 상품 데이터를 불러오지 못했습니다.'
    : '';
  const lastLoaded = formatUpdatedAtTimestamp(browseProductsQuery.dataUpdatedAt);
  const [, setWishlistRevision] = useState(0);
  const [toast, setToast] = useState<MyPageToastState | null>(null);
  const [enabledAlertKeys, setEnabledAlertKeys] = useState<string[]>([]);

  const reload = () => {
    setRecentProducts(getStoredRecentProducts());
    void browseProductsQuery.refetch();
  };

  const toggleWish = (product: Product) => {
    const wasWished = isProductWished(product);
    const isNowWished = toggleWishlistProduct(product);

    setWishlistRevision((current) => current + 1);

    if (wasWished && !isNowWished) {
      setToast({
        product,
        message: '찜 목록에서 상품을 제거했습니다',
        tone: 'rose',
        actionLabel: '되돌리기',
        onAction: () => {
          if (!isProductWished(product)) {
            toggleWishlistProduct(product);
          }

          setWishlistRevision((current) => current + 1);
          setToast(null);
        },
      });
    }
  };

  const toggleProductAlert = (product: Product) => {
    const key = getProductListKey(product);
    const isEnabled = enabledAlertKeys.includes(key);

    setEnabledAlertKeys((current) =>
      isEnabled ? current.filter((item) => item !== key) : [...current, key]
    );
    setToast(
      isEnabled
        ? {
            product,
            message: '상품 알림을 해제했습니다',
            tone: 'amber',
            actionLabel: '되돌리기',
            onAction: () => {
              setEnabledAlertKeys((current) =>
                current.includes(key) ? current : [...current, key]
              );
              setToast(null);
            },
          }
        : { product }
    );
  };

  const visibleProducts =
    recentProducts.length > 0 ? recentProducts : browseProducts;
  const isFallbackList = recentProducts.length === 0 && browseProducts.length > 0;

  return (
    <>
      <TabHeader
        title="최근 본 상품"
        description={
          recentProducts.length > 0
            ? `최근 열람한 상품 ${recentProducts.length.toLocaleString('ko-KR')}개`
            : '최근 본 상품 API 연결 전까지 실제 백 상품 데이터로 화면을 확인합니다'
        }
        action={
          <RefreshButton
            label={isLoading ? '불러오는 중...' : '새로고침'}
            onClick={reload}
            isLoading={isLoading}
            updatedAt={lastLoaded}
          />
        }
      />

      {errorMessage ? (
        <div
          className={`mb-6 rounded-2xl px-5 py-4 text-sm font-black text-rose-700 ${hairline.card}`}
        >
          {errorMessage}
        </div>
      ) : null}

      {visibleProducts.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-6 w-6 text-gray-500" aria-hidden="true" />}
          title="최근 본 상품이 없습니다"
          description="상품을 클릭하면 여기에 기록됩니다."
        />
      ) : (
        <>
          {isFallbackList ? (
            <p className={`mb-4 text-sm font-black ${hairline.mutedText}`}>
              둘러볼 상품
            </p>
          ) : null}
          <div className="flex flex-col gap-5">
            {visibleProducts.map((product) => (
              <ProductListCard
                key={`${product.platform}-${product.pid}`}
                product={product}
                onSelect={onProductSelect}
                isWished={isProductWished(product)}
                onWishClick={() => toggleWish(product)}
                isAlertEnabled={enabledAlertKeys.includes(getProductListKey(product))}
                onAlertClick={() => toggleProductAlert(product)}
              />
            ))}
          </div>
        </>
      )}
      {toast ? (
        <MyPageAlertToast
          product={toast.product}
          message={toast.message}
          tone={toast.tone}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
