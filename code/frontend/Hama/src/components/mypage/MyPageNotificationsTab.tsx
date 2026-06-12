import { Plus, Search, X } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  updateNotificationSetting,
  type NotificationSettingResponse,
} from '../../api/mypageApi';
import {
  mypageQueryKeys,
  useNotificationSettingQuery,
  useWishlistsQuery,
} from '../../queries/mypageQueries';
import { PlatformPill } from '../PlatformPill';
import { ProductVisual } from '../ProductVisual';
import { hairline } from '../../styles/hairline';
import type { Product } from '../../types/product';
import { formatUpdatedAt, formatWon } from '../../utils/format';
import {
  MyPageAlertToast,
  RefreshButton,
  TabHeader,
} from './MyPageShared';
import { getProductListKey } from './MyPageUtils';

type NotificationSection = 'lowPrice' | 'status' | 'keyword';

const popularAlertKeywords = [
  '아이폰',
  '맥북',
  '갤럭시',
  '아이패드',
  '에어팟',
  '컴퓨터',
  '자전거',
  '신발',
];

const notificationPreferenceStorageKey =
  'hama-notification-section-preferences';
const defaultNotificationPreferences: Record<NotificationSection, boolean> = {
  lowPrice: true,
  status: true,
  keyword: true,
};

function toSettingResponse(
  preferences: Record<NotificationSection, boolean>
): NotificationSettingResponse {
  return {
    lowestPriceEnabled: preferences.lowPrice,
    soldStatusEnabled: preferences.status,
    newItemEnabled: preferences.keyword,
  };
}

export function MyPageNotificationsTab() {
  const queryClient = useQueryClient();
  const wishlistQuery = useWishlistsQuery();
  const settingQuery = useNotificationSettingQuery();
  const [showAllStatusItems, setShowAllStatusItems] = useState(false);
  const [enabledAlertKeys, setEnabledAlertKeys] = useState<string[]>([]);
  const [customKeywordAlerts, setCustomKeywordAlerts] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [dismissedStatusKeys, setDismissedStatusKeys] = useState<string[]>([]);
  const [removedStatusProduct, setRemovedStatusProduct] = useState<Product | null>(
    null
  );
  // 서버 설정이 도착하기 전까지만 localStorage 백업값을 쓴다.
  const [fallbackPreferences] = useState(getStoredNotificationPreferences);

  const wishlist = (wishlistQuery.data ?? []).map((row) => row.product);
  const settings = settingQuery.data;
  const sectionPreferences: Record<NotificationSection, boolean> = settings
    ? {
        lowPrice: settings.lowestPriceEnabled,
        status: settings.soldStatusEnabled,
        keyword: settings.newItemEnabled,
      }
    : fallbackPreferences;
  const lowPriceProducts = wishlist.slice(0, 2);
  const visibleWishlistForStatus = wishlist.filter(
    (product) => !dismissedStatusKeys.includes(getProductListKey(product))
  );
  const statusProducts = visibleWishlistForStatus.slice(
    0,
    showAllStatusItems ? 12 : 4
  );
  const keywordRecommendations = getPopularKeywordRecommendations();
  const activeKeywordAlertSet = new Set(
    enabledAlertKeys
      .filter((key) => key.startsWith('keyword:'))
      .map((key) => key.replace('keyword:', ''))
  );
  const activeKeywordAlerts = enabledAlertKeys
    .filter((key) => key.startsWith('keyword:'))
    .map((key) => key.replace('keyword:', ''));
  const orderedActiveKeywordAlerts = [
    ...customKeywordAlerts.filter((keyword) => activeKeywordAlertSet.has(keyword)),
    ...activeKeywordAlerts.filter(
      (keyword) => !customKeywordAlerts.includes(keyword)
    ),
  ];

  const { lowPrice, status, keyword } = sectionPreferences;
  useEffect(() => {
    window.localStorage.setItem(
      notificationPreferenceStorageKey,
      JSON.stringify({ lowPrice, status, keyword })
    );
  }, [lowPrice, status, keyword]);

  const refreshNotifications = async () => {
    setDismissedStatusKeys([]);
    setRemovedStatusProduct(null);
    await Promise.all([wishlistQuery.refetch(), settingQuery.refetch()]);
  };

  const toggleSection = (section: NotificationSection) => {
    const current = sectionPreferences;
    const next = { ...current, [section]: !current[section] };

    queryClient.setQueryData(
      mypageQueryKeys.notificationSetting,
      toSettingResponse(next)
    );
    void updateNotificationSetting(toSettingResponse(next)).catch(() =>
      queryClient.setQueryData(
        mypageQueryKeys.notificationSetting,
        toSettingResponse(current)
      )
    );
  };

  const toggleAlertKey = (key: string) => {
    setEnabledAlertKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  const addKeywordAlert = (keyword: string) => {
    const normalizedKeyword = keyword.trim();

    if (!normalizedKeyword) {
      return;
    }

    const key = `keyword:${normalizedKeyword}`;

    setEnabledAlertKeys((current) =>
      current.includes(key) ? current : [key, ...current]
    );
    setCustomKeywordAlerts((current) =>
      popularAlertKeywords.includes(normalizedKeyword) ||
      current.includes(normalizedKeyword)
        ? current
        : [normalizedKeyword, ...current]
    );
    setKeywordInput('');
  };

  const removeKeywordAlert = (keyword: string) => {
    const key = `keyword:${keyword}`;

    setEnabledAlertKeys((current) => current.filter((item) => item !== key));
    setCustomKeywordAlerts((current) =>
      current.filter((item) => item !== keyword)
    );
  };

  const submitKeywordAlert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addKeywordAlert(keywordInput);
  };

  const dismissStatusProduct = (product: Product) => {
    const key = getProductListKey(product);

    setDismissedStatusKeys((current) =>
      current.includes(key) ? current : [...current, key]
    );
    setRemovedStatusProduct(product);
  };

  const undoDismissStatusProduct = () => {
    if (!removedStatusProduct) {
      return;
    }

    const key = getProductListKey(removedStatusProduct);

    setDismissedStatusKeys((current) => current.filter((item) => item !== key));
    setRemovedStatusProduct(null);
  };

  return (
    <>
      <TabHeader
        title="알림"
        description="가격 알림과 찜 상품 변동 알림을 한곳에서 관리합니다"
        action={
          <RefreshButton
            label={wishlistQuery.isFetching ? '불러오는 중...' : '새로고침'}
            onClick={() => void refreshNotifications()}
            isLoading={wishlistQuery.isFetching || settingQuery.isFetching}
            updatedAt={
              wishlistQuery.dataUpdatedAt
                ? formatUpdatedAt(
                    new Date(wishlistQuery.dataUpdatedAt).toISOString()
                  )
                : undefined
            }
          />
        }
      />
      <div className="flex flex-col gap-5">
        <NotificationBlock
          title="최저가 알림"
          description="최근 찜한 상품이 내려가면 바로 볼 수 있게 준비합니다."
          tone="emerald"
          isEnabled={sectionPreferences.lowPrice}
          onToggle={() => toggleSection('lowPrice')}
        >
          {lowPriceProducts.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {lowPriceProducts.map((product) => {
                const key = `low:${getProductListKey(product)}`;

                return (
                  <LowPriceAlertButton
                    key={key}
                    product={product}
                    isEnabled={enabledAlertKeys.includes(key)}
                    onClick={() => toggleAlertKey(key)}
                  />
                );
              })}
            </div>
          ) : (
            <NotificationEmptyText>
              찜한 상품이 생기면 최근 상품 2개를 먼저 추천합니다.
            </NotificationEmptyText>
          )}
        </NotificationBlock>

        <NotificationBlock
          title="판매 상태 알림"
          description="최근 찜 상품의 예약중, 판매완료 같은 상태 변화를 확인합니다."
          tone="amber"
          isEnabled={sectionPreferences.status}
          onToggle={() => toggleSection('status')}
        >
          {statusProducts.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {statusProducts.map((product) => {
                const key = `status:${getProductListKey(product)}`;

                return (
                  <StatusAlertRow
                    key={key}
                    product={product}
                    isEnabled={enabledAlertKeys.includes(key)}
                    onAdd={() => toggleAlertKey(key)}
                    onDismiss={() => dismissStatusProduct(product)}
                  />
                );
              })}
              {visibleWishlistForStatus.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setShowAllStatusItems((current) => !current)}
                  className={`self-start rounded-full px-3 py-1.5 text-sm font-black text-[#626873] transition-colors hover:bg-white/80 hover:text-gray-950 ${hairline.focus}`}
                >
                  {showAllStatusItems
                    ? '찜 목록 접기'
                    : `찜 목록 더보기 ${Math.min(visibleWishlistForStatus.length - 4, 8)}개`}
                </button>
              ) : null}
            </div>
          ) : (
            <NotificationEmptyText>
              {wishlist.length > 0
                ? '표시할 찜 상품이 없습니다. 새로고침하면 숨긴 후보를 다시 볼 수 있습니다.'
                : '찜한 상품이 없어서 판매 상태 알림을 만들 수 없습니다.'}
            </NotificationEmptyText>
          )}
        </NotificationBlock>

        <NotificationBlock
          title="새 상품 알림"
          description="인기 검색어를 기준으로 새 상품 알림 후보를 가볍게 추천합니다."
          tone="neutral"
          isEnabled={sectionPreferences.keyword}
          onToggle={() => toggleSection('keyword')}
        >
          <div className="flex flex-col gap-4">
            {orderedActiveKeywordAlerts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {orderedActiveKeywordAlerts.map((keyword) => (
                  <SelectedKeywordChip
                    key={`active:${keyword}`}
                    keyword={keyword}
                    onRemove={() => removeKeywordAlert(keyword)}
                  />
                ))}
              </div>
            ) : null}
            <form
              onSubmit={submitKeywordAlert}
              className={`flex h-12 items-center gap-2 rounded-2xl px-3 ${hairline.control}`}
            >
              <Search
                className="h-5 w-5 shrink-0 text-[#86868B]"
                aria-hidden="true"
              />
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                placeholder="알림 받을 키워드 추가"
                className="min-w-0 flex-1 bg-transparent text-sm font-black text-gray-950 outline-none placeholder:text-[#86868B]"
              />
              <button
                type="submit"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${hairline.primaryButton} ${hairline.focus}`}
                aria-label="키워드 알림 추가"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {keywordRecommendations.map((keyword) => {
                const key = `keyword:${keyword}`;

                return (
                  <KeywordAlertButton
                    key={key}
                    keyword={keyword}
                    isEnabled={enabledAlertKeys.includes(key)}
                    onClick={() =>
                      enabledAlertKeys.includes(key)
                        ? removeKeywordAlert(keyword)
                        : addKeywordAlert(keyword)
                    }
                  />
                );
              })}
            </div>
          </div>
        </NotificationBlock>
      </div>
      {removedStatusProduct ? (
        <MyPageAlertToast
          product={removedStatusProduct}
          message="알림 목록에서 상품을 제거했습니다"
          tone="gray"
          actionLabel="되돌리기"
          onAction={undoDismissStatusProduct}
          onClose={() => setRemovedStatusProduct(null)}
        />
      ) : null}
    </>
  );
}

function NotificationBlock({
  title,
  description,
  tone,
  isEnabled,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  tone: 'emerald' | 'amber' | 'neutral';
  isEnabled: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const toneClass = {
    emerald: 'bg-emerald-50/58',
    amber: 'bg-amber-50/58',
    neutral: 'bg-[#F7F8FA]/92',
  }[tone];

  return (
    <section
      className={`overflow-hidden rounded-[28px] transition-all ${
        isEnabled
          ? `${hairline.card} border-[#AEB6C2] shadow-[0_16px_42px_rgba(29,29,31,0.07),inset_0_0_0_1px_rgba(107,118,135,0.28)]`
          : hairline.card
      }`}
    >
      <div className="flex items-center justify-between gap-5 px-6 py-5">
        <div>
          <h4 className="text-xl font-black tracking-tight text-gray-950">
            {title}
          </h4>
          <p className={`mt-1 text-sm font-semibold ${hairline.mutedText}`}>
            {description}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={isEnabled}
          className={`flex h-8 w-14 shrink-0 items-center rounded-full border p-[3px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
            isEnabled
              ? 'border-[#AEB6C2] bg-[#F3F4F6] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06),0_8px_18px_rgba(29,29,31,0.052)]'
              : 'border-[#C9CFDA] bg-white shadow-[inset_0_1px_3px_rgba(17,24,39,0.07)]'
          }`}
          aria-label={`${title} ${isEnabled ? '끄기' : '켜기'}`}
        >
          <span
            className={`block h-6 w-6 rounded-full transition-transform ${
              isEnabled
                ? 'translate-x-6 bg-[#1D1D1F] shadow-[0_4px_12px_rgba(29,29,31,0.18),inset_0_1px_0_rgba(255,255,255,0.2)]'
                : 'translate-x-0 bg-white shadow-[0_3px_9px_rgba(29,29,31,0.16),inset_0_0_0_1px_rgba(201,207,218,0.92),inset_0_1px_0_rgba(255,255,255,0.96)]'
            }`}
          />
        </button>
      </div>
      <div
        className={`border-t border-[#D7DDE7]/88 px-6 py-5 transition-opacity ${
          isEnabled ? toneClass : 'bg-[#F6F8FB]/92'
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function LowPriceAlertButton({
  product,
  isEnabled,
  onClick,
}: {
  product: Product;
  isEnabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isEnabled}
      className={`flex min-w-0 items-center gap-3 rounded-[22px] border px-4 py-3 text-left transition-colors ${hairline.focus} ${
        isEnabled
          ? 'border-[#111827] bg-white text-gray-950 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.68)]'
          : 'border-[#C9CFDA]/92 bg-white/72 text-gray-800 hover:bg-white'
      }`}
    >
      <span className={`h-12 w-12 shrink-0 overflow-hidden rounded-2xl ${hairline.image}`}>
        <ProductVisual imageUrl={product.imageUrl} name={product.name} variant="thumb" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-black">{product.name}</span>
        <span className="mt-0.5 block text-sm font-black text-emerald-700">
          {formatWon(product.price)}
        </span>
      </span>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
          isEnabled ? 'bg-gray-950 text-white' : 'bg-white text-[#626873]'
        }`}
      >
        {isEnabled ? '설정됨' : '알림 추가'}
      </span>
    </button>
  );
}

function StatusAlertRow({
  product,
  isEnabled,
  onAdd,
  onDismiss,
}: {
  product: Product;
  isEnabled: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[18px] border bg-white/78 px-3 py-2.5 transition-all sm:flex-row sm:items-center ${
        isEnabled
          ? 'border-[#AEB6C2] shadow-[inset_0_0_0_1px_rgba(107,118,135,0.26),0_8px_20px_rgba(29,29,31,0.045)]'
          : 'border-[#C9CFDA]/86'
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className={`h-14 w-14 shrink-0 overflow-hidden rounded-2xl ${hairline.image}`}>
          <ProductVisual imageUrl={product.imageUrl} name={product.name} variant="thumb" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-gray-950">{product.name}</p>
            <p className={`mt-0.5 text-xs font-black ${hairline.mutedText}`}>
              {formatWon(product.price)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <PlatformPill platform={product.platform} size="card" />
            <span className={`rounded-full px-3 py-1 text-xs font-black ${hairline.status}`}>
              {product.status}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 self-stretch border-t border-[#E1E5EC]/80 pt-3 sm:justify-end sm:self-auto sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${product.name} 판매 상태 알림 ${isEnabled ? '켜짐' : '켜기'}`}
          aria-pressed={isEnabled}
          className={`inline-flex h-9 min-w-[78px] items-center justify-center rounded-xl border px-3 text-xs font-black transition-colors ${hairline.focus} ${
            isEnabled
              ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-[0_6px_14px_rgba(29,29,31,0.08)]'
              : 'border-[#C9CFDA] bg-white text-[#1D1D1F] hover:border-[#AEB6C2] hover:bg-[#FDFDFE]'
          }`}
        >
          {isEnabled ? '켜짐' : '알림 켜기'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`${product.name} 판매 상태 알림 후보 숨기기`}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border border-[#C9CFDA] bg-white text-[#86868B] transition-colors hover:bg-rose-50 hover:text-rose-500 ${hairline.focus}`}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function KeywordAlertButton({
  keyword,
  isEnabled,
  onClick,
}: {
  keyword: string;
  isEnabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isEnabled}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-black transition-colors ${hairline.focus} ${
        isEnabled
          ? 'border-[#111827] bg-white text-gray-950 shadow-[inset_0_0_0_1px_rgba(17,24,39,0.68)]'
          : 'border-[#C9CFDA]/92 bg-white/72 text-[#626873] hover:bg-white hover:text-gray-950'
      }`}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      {keyword}
    </button>
  );
}

function SelectedKeywordChip({
  keyword,
  onRemove,
}: {
  keyword: string;
  onRemove: () => void;
}) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black ${hairline.controlActive}`}>
      {keyword}
      <button
        type="button"
        onClick={onRemove}
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[#626873] transition-colors hover:bg-[#F3F4F6] hover:text-gray-950 ${hairline.focus}`}
        aria-label={`${keyword} 새 상품 알림 삭제`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function NotificationEmptyText({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[18px] border border-[#C9CFDA]/80 bg-white/66 px-4 py-3 text-sm font-bold text-[#626873]">
      {children}
    </p>
  );
}

function getPopularKeywordRecommendations(): string[] {
  const daySeed = Math.floor(Date.now() / 86_400_000);

  return popularAlertKeywords.map((_, index) => {
    const keywordIndex = (daySeed + index) % popularAlertKeywords.length;

    return popularAlertKeywords[keywordIndex];
  });
}

function getStoredNotificationPreferences(): Record<NotificationSection, boolean> {
  const storedValue = window.localStorage.getItem(notificationPreferenceStorageKey);

  if (!storedValue) {
    return defaultNotificationPreferences;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<
      Record<NotificationSection, boolean>
    >;

    return {
      lowPrice: parsedValue.lowPrice ?? defaultNotificationPreferences.lowPrice,
      status: parsedValue.status ?? defaultNotificationPreferences.status,
      keyword: parsedValue.keyword ?? defaultNotificationPreferences.keyword,
    };
  } catch {
    return defaultNotificationPreferences;
  }
}
