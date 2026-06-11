import { Clock, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  addWishlist,
  fetchRecentItems,
  fetchWishlists,
  removeWishlist,
  updateWishlistAlert,
} from '../../api/mypageApi';
import { hairline } from '../../styles/hairline';
import type { Product } from '../../types/product';
import { formatUpdatedAt } from '../../utils/format';
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
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [lastLoaded, setLastLoaded] = useState(() => new Date().toISOString());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState<MyPageToastState | null>(null);
  const [enabledAlertKeys, setEnabledAlertKeys] = useState<string[]>([]);

  const refreshWishlist = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const rows = await fetchWishlists();
      setWishlist(rows.map((row) => row.product));
      setEnabledAlertKeys(
        rows
          .filter((row) => row.lowestAlert)
          .map((row) => getProductListKey(row.product))
      );
      setLastLoaded(new Date().toISOString());
    } catch {
      setErrorMessage('찜 목록을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => void refreshWishlist(), 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const restoreWishlistProduct = async (product: Product) => {
    try {
      const row = await addWishlist(product.id);
      setWishlist((current) => [row.product, ...current]);
      setToast(null);
    } catch {
      setErrorMessage('찜 목록 복구에 실패했습니다.');
    }
  };

  const removeItem = async (product: Product) => {
    setWishlist((current) => current.filter((item) => item.id !== product.id));
    setToast({
      product,
      message: '찜 목록에서 상품을 제거했습니다',
      tone: 'rose',
      actionLabel: '되돌리기',
      onAction: () => void restoreWishlistProduct(product),
    });

    try {
      await removeWishlist(product.id);
    } catch {
      setErrorMessage('찜 목록 삭제에 실패했습니다.');
      void refreshWishlist();
    }
  };

  const toggleProductAlert = async (product: Product) => {
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

    try {
      await updateWishlistAlert({
        itemId: product.id,
        lowestAlert: !isEnabled,
      });
    } catch {
      setEnabledAlertKeys((current) =>
        isEnabled
          ? current.includes(key) ? current : [...current, key]
          : current.filter((item) => item !== key)
      );
      setErrorMessage('상품 알림 설정을 변경하지 못했습니다.');
    }
  };

  return (
    <>
      <TabHeader
        title="찜 목록"
        description={`저장한 상품 ${wishlist.length.toLocaleString('ko-KR')}개`}
        action={
          <RefreshButton
            label={isLoading ? '불러오는 중...' : '새로고침'}
            onClick={() => void refreshWishlist()}
            isLoading={isLoading}
            updatedAt={formatUpdatedAt(lastLoaded)}
          />
        }
      />

      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

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
              onWishClick={() => void removeItem(product)}
              isAlertEnabled={enabledAlertKeys.includes(getProductListKey(product))}
              onAlertClick={() => void toggleProductAlert(product)}
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
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = useState<number[]>([]);
  const [lastLoaded, setLastLoaded] = useState(() => new Date().toISOString());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState<MyPageToastState | null>(null);
  const [enabledAlertKeys, setEnabledAlertKeys] = useState<string[]>([]);

  const reload = async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [recentItems, wishlistRows] = await Promise.all([
        fetchRecentItems(),
        fetchWishlists(),
      ]);

      setRecentProducts(recentItems);
      setWishlistProductIds(wishlistRows.map((row) => row.product.id));
      setEnabledAlertKeys(
        wishlistRows
          .filter((row) => row.lowestAlert)
          .map((row) => getProductListKey(row.product))
      );
      setLastLoaded(new Date().toISOString());
    } catch {
      setErrorMessage('최근 본 상품을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const toggleWish = async (product: Product) => {
    const wasWished = wishlistProductIds.includes(product.id);

    setWishlistProductIds((current) =>
      wasWished
        ? current.filter((itemId) => itemId !== product.id)
        : [...current, product.id]
    );

    try {
      if (wasWished) {
        await removeWishlist(product.id);
        setToast({
          product,
          message: '찜 목록에서 상품을 제거했습니다',
          tone: 'rose',
        });
      } else {
        await addWishlist(product.id);
        setToast({ product });
      }
    } catch {
      setErrorMessage('찜 목록 변경에 실패했습니다.');
      void reload();
    }
  };

  const toggleProductAlert = async (product: Product) => {
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

    try {
      if (!wishlistProductIds.includes(product.id)) {
        await addWishlist(product.id);
        setWishlistProductIds((current) => [...current, product.id]);
      }
      await updateWishlistAlert({
        itemId: product.id,
        lowestAlert: !isEnabled,
      });
    } catch {
      setEnabledAlertKeys((current) =>
        isEnabled
          ? current.includes(key) ? current : [...current, key]
          : current.filter((item) => item !== key)
      );
      setErrorMessage('상품 알림 설정을 변경하지 못했습니다.');
    }
  };

  return (
    <>
      <TabHeader
        title="최근 본 상품"
        description={`최근 열람한 상품 ${recentProducts.length.toLocaleString('ko-KR')}개`}
        action={
          <RefreshButton
            label={isLoading ? '불러오는 중...' : '새로고침'}
            onClick={() => void reload()}
            isLoading={isLoading}
            updatedAt={formatUpdatedAt(lastLoaded)}
          />
        }
      />

      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}

      {recentProducts.length === 0 ? (
        <EmptyState
          icon={<Clock className="h-6 w-6 text-gray-500" aria-hidden="true" />}
          title="최근 본 상품이 없습니다"
          description="상품을 클릭하면 이곳에 기록됩니다."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {recentProducts.map((product) => (
            <ProductListCard
              key={`${product.platform}-${product.pid}`}
              product={product}
              onSelect={onProductSelect}
              isWished={wishlistProductIds.includes(product.id)}
              onWishClick={() => void toggleWish(product)}
              isAlertEnabled={enabledAlertKeys.includes(getProductListKey(product))}
              onAlertClick={() => void toggleProductAlert(product)}
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div
      className={`mb-6 rounded-2xl px-5 py-4 text-sm font-black text-rose-700 ${hairline.card}`}
    >
      {message}
    </div>
  );
}
