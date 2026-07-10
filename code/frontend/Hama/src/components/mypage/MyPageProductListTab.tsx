import { Clock, Heart } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  addWishlist,
  removeWishlist,
  updateWishlistAlert,
  type WishlistResponse,
} from '../../api/mypageApi';
import {
  mypageQueryKeys,
  useRecentItemsQuery,
  useWishlistsQuery,
} from '../../queries/mypageQueries';
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

// 찜/알림 상태의 SSOT는 wishlists 쿼리 캐시다. 탭 재진입 시 캐시를 그대로
// 보여주고(자동 재조회 없음), 로컬 조작은 setQueryData로 캐시에 반영한다.
function useWishlistRowsUpdater() {
  const queryClient = useQueryClient();

  return (updater: (rows: WishlistResponse[]) => WishlistResponse[]) => {
    queryClient.setQueryData<WishlistResponse[]>(
      mypageQueryKeys.wishlists,
      (current) => updater(current ?? [])
    );
  };
}

function formatQueryUpdatedAt(dataUpdatedAt: number) {
  return dataUpdatedAt
    ? formatUpdatedAt(new Date(dataUpdatedAt).toISOString())
    : undefined;
}

function WishlistProductList({
  onProductSelect,
}: {
  onProductSelect: (product: Product) => void;
}) {
  const wishlistQuery = useWishlistsQuery();
  const setWishlistRows = useWishlistRowsUpdater();
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState<MyPageToastState | null>(null);

  const rows = wishlistQuery.data ?? [];
  const wishlist = rows.map((row) => row.product);
  const enabledAlertKeys = rows
    .filter((row) => row.lowestAlert)
    .map((row) => getProductListKey(row.product));
  const isLoading = wishlistQuery.isFetching;
  const loadErrorMessage = wishlistQuery.isError
    ? '찜 목록을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.'
    : '';

  const refreshWishlist = async () => {
    setErrorMessage('');
    await wishlistQuery.refetch();
  };

  const restoreWishlistProduct = async (product: Product) => {
    try {
      const row = await addWishlist(product.id);
      setWishlistRows((current) => [
        row,
        ...current.filter((item) => item.itemId !== row.itemId),
      ]);
      setToast(null);
    } catch {
      setErrorMessage('찜 목록 복구에 실패했습니다.');
    }
  };

  const removeItem = async (product: Product) => {
    setWishlistRows((current) =>
      current.filter((row) => row.product.id !== product.id)
    );
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
      void wishlistQuery.refetch();
    }
  };

  const setRowAlert = (productId: number, lowestAlert: boolean) => {
    setWishlistRows((current) =>
      current.map((row) =>
        row.product.id === productId ? { ...row, lowestAlert } : row
      )
    );
  };

  const toggleProductAlert = async (product: Product) => {
    const key = getProductListKey(product);
    const isEnabled = enabledAlertKeys.includes(key);

    setRowAlert(product.id, !isEnabled);
    setToast(
      isEnabled
        ? {
            product,
            message: '상품 알림을 해제했습니다',
            tone: 'amber',
            actionLabel: '되돌리기',
            onAction: () => {
              setRowAlert(product.id, true);
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
      setRowAlert(product.id, isEnabled);
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
            updatedAt={formatQueryUpdatedAt(wishlistQuery.dataUpdatedAt)}
          />
        }
      />

      {errorMessage || loadErrorMessage ? (
        <ErrorMessage message={errorMessage || loadErrorMessage} />
      ) : null}

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
  const recentItemsQuery = useRecentItemsQuery();
  const wishlistQuery = useWishlistsQuery();
  const setWishlistRows = useWishlistRowsUpdater();
  const [errorMessage, setErrorMessage] = useState('');
  const [toast, setToast] = useState<MyPageToastState | null>(null);

  const recentProducts = recentItemsQuery.data ?? [];
  const wishlistRows = wishlistQuery.data ?? [];
  const wishlistProductIds = wishlistRows.map((row) => row.product.id);
  const enabledAlertKeys = wishlistRows
    .filter((row) => row.lowestAlert)
    .map((row) => getProductListKey(row.product));
  const isLoading = recentItemsQuery.isFetching || wishlistQuery.isFetching;
  const loadErrorMessage =
    recentItemsQuery.isError || wishlistQuery.isError
      ? '최근 본 상품을 불러오지 못했습니다. 백엔드 연결 상태를 확인해 주세요.'
      : '';

  const reload = async () => {
    setErrorMessage('');
    await Promise.all([recentItemsQuery.refetch(), wishlistQuery.refetch()]);
  };

  const toggleWish = async (product: Product) => {
    const wasWished = wishlistProductIds.includes(product.id);

    try {
      if (wasWished) {
        setWishlistRows((current) =>
          current.filter((row) => row.product.id !== product.id)
        );
        await removeWishlist(product.id);
        setToast({
          product,
          message: '찜 목록에서 상품을 제거했습니다',
          tone: 'rose',
        });
      } else {
        const row = await addWishlist(product.id);
        setWishlistRows((current) => [
          row,
          ...current.filter((item) => item.itemId !== row.itemId),
        ]);
        setToast({ product });
      }
    } catch {
      setErrorMessage('찜 목록 변경에 실패했습니다.');
      void wishlistQuery.refetch();
    }
  };

  const setRowAlert = (productId: number, lowestAlert: boolean) => {
    setWishlistRows((current) =>
      current.map((row) =>
        row.product.id === productId ? { ...row, lowestAlert } : row
      )
    );
  };

  const toggleProductAlert = async (product: Product) => {
    const key = getProductListKey(product);
    const isEnabled = enabledAlertKeys.includes(key);

    setRowAlert(product.id, !isEnabled);
    setToast(
      isEnabled
        ? {
            product,
            message: '상품 알림을 해제했습니다',
            tone: 'amber',
            actionLabel: '되돌리기',
            onAction: () => {
              setRowAlert(product.id, true);
              setToast(null);
            },
          }
        : { product }
    );

    try {
      if (!wishlistProductIds.includes(product.id)) {
        const row = await addWishlist(product.id);
        setWishlistRows((current) => [
          row,
          ...current.filter((item) => item.itemId !== row.itemId),
        ]);
      }
      const updated = await updateWishlistAlert({
        itemId: product.id,
        lowestAlert: !isEnabled,
      });
      setWishlistRows((current) =>
        current.map((row) => (row.itemId === updated.itemId ? updated : row))
      );
    } catch {
      setRowAlert(product.id, isEnabled);
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
            updatedAt={formatQueryUpdatedAt(recentItemsQuery.dataUpdatedAt)}
          />
        }
      />

      {errorMessage || loadErrorMessage ? (
        <ErrorMessage message={errorMessage || loadErrorMessage} />
      ) : null}

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
