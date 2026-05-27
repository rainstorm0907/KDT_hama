import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Clock,
  Heart,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformPill } from '../components/PlatformPill';
import { ProductVisual } from '../components/ProductVisual';
import { useRecommendedProductsQuery } from '../queries/productQueries';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatUpdatedAt, formatUpdatedAtTimestamp, formatWon } from '../utils/format';
import {
  getStoredRecentProducts,
  getStoredWishlistProducts,
  isProductWished,
  removeWishlistProduct,
  toggleWishlistProduct,
} from '../utils/userProductLists';

type MyPageProps = {
  onProductSelect: (product: Product) => void;
  isAdmin?: boolean;
};

type Tab = 'wishlist' | 'recent' | 'notifications' | 'settings';
type NotificationSection = 'lowPrice' | 'status' | 'keyword';
type MyPageToastTone = 'amber' | 'gray' | 'rose';
type MyPageToastState = {
  product: Product;
  message?: string;
  tone?: MyPageToastTone;
  actionLabel?: string;
  onAction?: () => void;
};
type SettingsView =
  | 'main'
  | 'editName'
  | 'editEmail'
  | 'editPassword'
  | 'notificationPreferences'
  | 'keywordAlerts'
  | 'recentData'
  | 'withdrawal';

type TabItem = {
  id: Tab;
  label: string;
  icon: LucideIcon;
  iconTone: string;
  iconSurface: string;
};

const tabs: TabItem[] = [
  {
    id: 'wishlist',
    label: '찜 목록',
    icon: Heart,
    iconTone: 'text-rose-500',
    iconSurface: 'bg-rose-50/80',
  },
  {
    id: 'recent',
    label: '최근 본 상품',
    icon: Clock,
    iconTone: 'text-blue-600',
    iconSurface: 'bg-blue-50/80',
  },
  {
    id: 'notifications',
    label: '알림',
    icon: Bell,
    iconTone: 'text-amber-500',
    iconSurface: 'bg-amber-50/80',
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    iconTone: 'text-emerald-600',
    iconSurface: 'bg-emerald-50/80',
  },
];

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

const notificationPreferenceStorageKey = 'hama-notification-section-preferences';
const defaultNotificationPreferences: Record<NotificationSection, boolean> = {
  lowPrice: true,
  status: true,
  keyword: true,
};
const inactiveNavItemClass =
  'border border-[#D7DDE7]/72 bg-white/[0.48] text-[#565D68] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:border-[#C9CFDA] hover:bg-white/[0.78] hover:text-[#1D1D1F]';

export function MyPage({ onProductSelect, isAdmin = false }: MyPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  return (
    <main className={`flex-1 ${hairline.page}`}>
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-8 py-16 md:grid-cols-[320px_1fr] md:items-start lg:gap-14">
        <aside className="w-full shrink-0">
          <div className={`flex min-h-[760px] flex-col rounded-[28px] p-5 ${hairline.panelSoft}`}>
            <h2 className="mb-4 text-center text-3xl font-black tracking-tight text-gray-950">
              마이페이지
            </h2>
            <div className="mb-3 h-px bg-[#C9CFDA]" />
            <nav className="flex flex-col gap-1" aria-label="마이페이지 메뉴">
              {tabs.slice(0, 3).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSettingsView('main');
                    }}
                    className={`flex items-center gap-3 rounded-2xl p-4 text-left text-lg font-black transition-all ${
                      isActive
                        ? `${hairline.primaryButton} ${hairline.focus}`
                        : `${inactiveNavItemClass} ${hairline.focus}`
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isActive ? 'bg-white/12 text-white' : `${tab.iconSurface} ${tab.iconTone}`
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {tab.label}
                  </button>
                );
              })}
              <div className="my-3 h-px bg-[#C9CFDA]/75" aria-hidden="true" />
              {tabs.slice(3).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSettingsView('main');
                    }}
                    className={`flex items-center gap-3 rounded-2xl p-4 text-left text-lg font-black transition-all ${
                      isActive
                        ? `${hairline.primaryButton} ${hairline.focus}`
                        : `${inactiveNavItemClass} ${hairline.focus}`
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                        isActive ? 'bg-white/12 text-white' : `${tab.iconSurface} ${tab.iconTone}`
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    {tab.label}
                  </button>
                );
              })}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className={`flex items-center gap-3 rounded-2xl p-4 text-left text-lg font-black transition-all ${inactiveNavItemClass} ${hairline.focus}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4F5F7] text-[#1D1D1F]">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  관리자
                </button>
              ) : null}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 pt-2">
          <div key={`${activeTab}-${settingsView}`} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {activeTab === 'wishlist' ? <WishlistTab onProductSelect={onProductSelect} /> : null}
            {activeTab === 'recent' ? <RecentTab onProductSelect={onProductSelect} /> : null}
            {activeTab === 'notifications' ? <NotificationsTab /> : null}
            {activeTab === 'settings' ? (
              <SettingsTab view={settingsView} setView={setSettingsView} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function WishlistTab({
  onProductSelect,
}: {
  onProductSelect: (product: Product) => void;
}) {
  const [wishlist, setWishlist] = useState<Product[]>(() => getStoredWishlistProducts());
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
      isEnabled
        ? current.filter((item) => item !== key)
        : [...current, key]
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

function RecentTab({
  onProductSelect,
}: {
  onProductSelect: (product: Product) => void;
}) {
  const [recentProducts, setRecentProducts] = useState<Product[]>(() => getStoredRecentProducts());
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
      isEnabled
        ? current.filter((item) => item !== key)
        : [...current, key]
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
  const visibleProducts = recentProducts.length > 0 ? recentProducts : browseProducts;
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
        <div className={`mb-6 rounded-2xl px-5 py-4 text-sm font-black text-rose-700 ${hairline.card}`}>
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

function NotificationsTab() {
  const [wishlist, setWishlist] = useState<Product[]>(() => getStoredWishlistProducts());
  const [lastLoaded, setLastLoaded] = useState(() => new Date().toISOString());
  const [showAllStatusItems, setShowAllStatusItems] = useState(false);
  const [enabledAlertKeys, setEnabledAlertKeys] = useState<string[]>([]);
  const [customKeywordAlerts, setCustomKeywordAlerts] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [dismissedStatusKeys, setDismissedStatusKeys] = useState<string[]>([]);
  const [removedStatusProduct, setRemovedStatusProduct] = useState<Product | null>(null);
  const [sectionPreferences, setSectionPreferences] = useState(
    getStoredNotificationPreferences
  );
  const lowPriceProducts = wishlist.slice(0, 2);
  const visibleWishlistForStatus = wishlist.filter(
    (product) => !dismissedStatusKeys.includes(getProductListKey(product))
  );
  const statusProducts = visibleWishlistForStatus.slice(0, showAllStatusItems ? 12 : 4);
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
    ...activeKeywordAlerts.filter((keyword) => !customKeywordAlerts.includes(keyword)),
  ];

  useEffect(() => {
    window.localStorage.setItem(
      notificationPreferenceStorageKey,
      JSON.stringify(sectionPreferences)
    );
  }, [sectionPreferences]);

  const refreshNotifications = () => {
    setWishlist(getStoredWishlistProducts());
    setDismissedStatusKeys([]);
    setRemovedStatusProduct(null);
    setLastLoaded(new Date().toISOString());
  };

  const toggleSection = (section: NotificationSection) => {
    setSectionPreferences((current) => ({
      ...current,
      [section]: !current[section],
    }));
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
      popularAlertKeywords.includes(normalizedKeyword) || current.includes(normalizedKeyword)
        ? current
        : [normalizedKeyword, ...current]
    );
    setKeywordInput('');
  };

  const removeKeywordAlert = (keyword: string) => {
    const key = `keyword:${keyword}`;

    setEnabledAlertKeys((current) => current.filter((item) => item !== key));
    setCustomKeywordAlerts((current) => current.filter((item) => item !== keyword));
  };

  const submitKeywordAlert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addKeywordAlert(keywordInput);
  };

  const dismissStatusProduct = (product: Product) => {
    const key = getProductListKey(product);

    setDismissedStatusKeys((current) => (
      current.includes(key) ? current : [...current, key]
    ));
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
            label="새로고침"
            onClick={refreshNotifications}
            updatedAt={formatUpdatedAt(lastLoaded)}
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
                  {showAllStatusItems ? '찜 목록 접기' : `찜 목록 더보기 ${Math.min(visibleWishlistForStatus.length - 4, 8)}개`}
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
              <Search className="h-5 w-5 shrink-0 text-[#86868B]" aria-hidden="true" />
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
                    onClick={() => (
                      enabledAlertKeys.includes(key)
                        ? removeKeywordAlert(keyword)
                        : addKeywordAlert(keyword)
                    )}
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

function SettingsTab({
  view,
  setView,
}: {
  view: SettingsView;
  setView: (view: SettingsView) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');

  if (view === 'editName') {
    return (
      <EditTextView
        title="이름 변경"
        description="프로필에 표시될 이름을 수정합니다."
        currentValue={displayName}
        placeholder="새 이름 입력"
        onBack={() => setView('main')}
        onSave={(value) => {
          setDisplayName(value);
          setView('main');
        }}
      />
    );
  }

  if (view === 'editEmail') {
    return (
      <EditTextView
        title="이메일 변경"
        description="로그인에 사용할 이메일을 수정합니다."
        currentValue={displayEmail}
        placeholder="새 이메일 주소 입력"
        type="email"
        onBack={() => setView('main')}
        onSave={(value) => {
          setDisplayEmail(value);
          setView('main');
        }}
      />
    );
  }

  if (view === 'editPassword') {
    return <PasswordView onBack={() => setView('main')} />;
  }

  if (view === 'notificationPreferences') {
    return (
      <SettingsPlaceholderView
        title="알림 수신 설정"
        description="최저가, 판매 상태, 새 상품 알림을 받을 방식을 정리합니다."
        icon={<Bell className="h-5 w-5 text-amber-500" aria-hidden="true" />}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'keywordAlerts') {
    return (
      <SettingsPlaceholderView
        title="키워드 알림 관리"
        description="인기 검색어와 직접 저장한 키워드 알림을 한곳에서 관리할 예정입니다."
        icon={<KeyRound className="h-5 w-5 text-blue-600" aria-hidden="true" />}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'recentData') {
    return (
      <SettingsPlaceholderView
        title="최근 본 상품 관리"
        description="최근 본 상품 기록 삭제와 보관 기간 설정을 연결할 예정입니다."
        icon={<Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'withdrawal') {
    return <WithdrawalView onBack={() => setView('main')} />;
  }

  return (
    <>
      <TabHeader
        title="설정"
        description="로그인 API가 연결되면 실제 프로필 정보와 동기화합니다"
      />
      <div className={`rounded-[28px] p-6 ${hairline.panelSoft}`}>
        <SettingsGroup title="프로필">
          <SettingsRow
            icon={<UserRound className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
            label="이름 변경"
            onClick={() => setView('editName')}
          />
          <SettingsRow
            icon={<Mail className="h-4 w-4 text-blue-600" aria-hidden="true" />}
            label="이메일 변경"
            onClick={() => setView('editEmail')}
          />
          <SettingsRow
            icon={<KeyRound className="h-4 w-4 text-amber-600" aria-hidden="true" />}
            label="비밀번호 변경"
            onClick={() => setView('editPassword')}
          />
        </SettingsGroup>
        <div className="my-5 h-px bg-[#C9CFDA]" />
        <SettingsGroup title="알림">
          <SettingsRow
            icon={<Bell className="h-4 w-4 text-amber-500" aria-hidden="true" />}
            label="알림 수신 설정"
            helper="가격, 판매 상태, 새 상품"
            onClick={() => setView('notificationPreferences')}
          />
          <SettingsRow
            icon={<KeyRound className="h-4 w-4 text-blue-600" aria-hidden="true" />}
            label="키워드 알림 관리"
            helper="관심 검색어 기반"
            onClick={() => setView('keywordAlerts')}
          />
        </SettingsGroup>
        <div className="my-5 h-px bg-[#C9CFDA]" />
        <SettingsGroup title="데이터">
          <SettingsRow
            icon={<Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />}
            label="최근 본 상품 관리"
            helper="기록 정리"
            onClick={() => setView('recentData')}
          />
        </SettingsGroup>
        <div className="my-5 h-px bg-[#C9CFDA]" />
        <SettingsGroup title="계정">
          <SettingsRow
            icon={<Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />}
            label="회원 탈퇴"
            onClick={() => setView('withdrawal')}
          />
        </SettingsGroup>
      </div>
    </>
  );
}

function ProductListCard({
  product,
  isWished,
  isAlertEnabled,
  onWishClick,
  onAlertClick,
  onSelect,
}: {
  product: Product;
  isWished: boolean;
  isAlertEnabled: boolean;
  onWishClick: () => void;
  onAlertClick: () => void;
  onSelect: (product: Product) => void;
}) {
  return (
    <article
      className={`group flex items-center gap-4 rounded-[24px] p-4 transition-all duration-300 focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${hairline.card} ${hairline.cardHover}`}
    >
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="flex min-w-0 flex-1 items-center gap-4 text-left outline-none"
        aria-label={`${product.name} 상세 보기`}
      >
        <div className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[20px] ${hairline.image}`}>
          <ProductVisual imageUrl={product.imageUrl} name={product.name} variant="thumb" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <PlatformPill platform={product.platform} size="card" />
            <span className={`rounded-full px-3 py-1 text-xs font-black ${hairline.status}`}>
              {product.status}
            </span>
          </div>
          <h4 className="mb-3 line-clamp-1 text-xl font-black leading-tight tracking-tight text-gray-950">
            {product.name}
          </h4>
          <p className="text-2xl font-black tracking-tight text-gray-950">
            {formatWon(product.price)}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 flex-col gap-2.5">
        <button
          type="button"
          onClick={onWishClick}
          className={`flex h-14 w-14 items-center justify-center rounded-[18px] border transition-colors ${hairline.focus} ${
            isWished
              ? 'border-rose-300 bg-rose-50 text-rose-500'
              : 'border-[#C9CFDA] bg-white text-rose-500 hover:bg-rose-50'
          }`}
          aria-label={isWished ? `${product.name} 찜 해제` : `${product.name} 찜하기`}
          aria-pressed={isWished}
        >
          <Heart className={`h-6 w-6 ${isWished ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onAlertClick}
          className={`flex h-14 w-14 items-center justify-center rounded-[18px] border transition-colors ${hairline.focus} ${
            isAlertEnabled
              ? 'border-amber-300 bg-amber-50 text-amber-600'
              : 'border-[#C9CFDA] bg-white text-amber-500 hover:bg-amber-50'
          }`}
          aria-label={isAlertEnabled ? `${product.name} 알림 해제` : `${product.name} 알림 설정`}
          aria-pressed={isAlertEnabled}
        >
          <Bell className={`h-6 w-6 ${isAlertEnabled ? 'fill-current' : ''}`} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function TabHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h3 className="mb-2 text-3xl font-black tracking-tight text-gray-950">{title}</h3>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>{description}</p>
      </div>
      {action}
    </div>
  );
}

function RefreshButton({
  label,
  onClick,
  isLoading = false,
  updatedAt,
}: {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  updatedAt?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black text-[#626873] transition-colors hover:bg-white/64 hover:text-[#1D1D1F] disabled:cursor-wait disabled:opacity-70 ${hairline.focus}`}
      >
        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        {label}
      </button>
      {updatedAt ? (
        <span className={`text-xs font-black ${hairline.quietText}`}>
          업데이트 {updatedAt}
        </span>
      ) : null}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={`flex min-h-[360px] items-center justify-center rounded-[28px] px-8 text-center ${hairline.panelSoft}`}>
      <div>
        <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${hairline.control}`}>
          {icon}
        </div>
        <p className="text-lg font-black text-gray-950">{title}</p>
        <p className={`mt-2 text-sm font-semibold ${hairline.mutedText}`}>{description}</p>
      </div>
    </div>
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
          <h4 className="text-xl font-black tracking-tight text-gray-950">{title}</h4>
          <p className={`mt-1 text-sm font-semibold ${hairline.mutedText}`}>{description}</p>
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
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${isEnabled ? 'bg-gray-950 text-white' : 'bg-white text-[#626873]'}`}>
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

function MyPageAlertToast({
  product,
  message,
  tone = 'amber',
  actionLabel,
  onAction,
  onClose,
}: {
  product: Product;
  message?: string;
  tone?: MyPageToastTone;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [onClose]);

  const Icon = tone === 'amber' ? Bell : tone === 'rose' ? Heart : X;
  const toneClass = {
    amber: 'bg-amber-50 text-amber-500',
    gray: 'bg-[#F3F4F6] text-[#626873]',
    rose: 'bg-rose-50 text-rose-500',
  }[tone];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-8 left-1/2 z-[140] flex w-[min(540px,calc(100vw-48px))] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl px-5 py-4 ${hairline.panel}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
          <Icon className="h-5 w-5 fill-current" aria-hidden="true" />
        </span>
        <p className="min-w-0 truncate text-base font-black text-gray-900">
          {message ?? `${product.name} 알림이 설정되었습니다`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${hairline.primaryButton} ${hairline.focus}`}
          >
            {actionLabel}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#9AA2AF] transition hover:bg-white hover:text-gray-900 ${hairline.focus}`}
          aria-label="알림 메시지 닫기"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
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
    const parsedValue = JSON.parse(storedValue) as Partial<Record<NotificationSection, boolean>>;

    return {
      lowPrice: parsedValue.lowPrice ?? defaultNotificationPreferences.lowPrice,
      status: parsedValue.status ?? defaultNotificationPreferences.status,
      keyword: parsedValue.keyword ?? defaultNotificationPreferences.keyword,
    };
  } catch {
    return defaultNotificationPreferences;
  }
}

function getProductListKey(product: Product): string {
  return `${product.platform}:${product.pid}`;
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className={`mb-3 px-1 text-sm font-black uppercase tracking-widest ${hairline.mutedText}`}>
        {title}
      </p>
      {children}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  helper,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  helper?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-base font-black text-gray-700 transition-colors hover:bg-white ${hairline.focus}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${hairline.control}`}>
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 text-left">
          <span className="block truncate">{label}</span>
          {helper ? (
            <span className={`mt-0.5 block truncate text-xs font-bold ${hairline.quietText}`}>
              {helper}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-[#86868B] transition-colors group-hover:text-gray-950" aria-hidden="true" />
    </button>
  );
}

function SettingsPlaceholderView({
  title,
  description,
  icon,
  onBack,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onBack: () => void;
}) {
  return (
    <>
      <BackHeader title={title} description={description} onBack={onBack} />
      <div className={`rounded-[24px] p-6 ${hairline.panelSoft}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hairline.control}`}>
            {icon}
          </div>
          <div>
            <p className="text-base font-black text-gray-950">백엔드 계정 API 연결 후 저장됩니다</p>
            <p className={`mt-2 text-sm font-semibold leading-6 ${hairline.mutedText}`}>
              지금은 화면 흐름을 확인하기 위한 설정 자리입니다. 실제 저장은 사용자 계정 테이블과 알림 API가 연결된 뒤 처리하면 됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function EditTextView({
  title,
  description,
  currentValue,
  placeholder,
  type = 'text',
  onBack,
  onSave,
}: {
  title: string;
  description: string;
  currentValue: string;
  placeholder: string;
  type?: 'text' | 'email';
  onBack: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(currentValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }

    onSave(value.trim());
  };

  return (
    <>
      <BackHeader title={title} description={description} onBack={onBack} />
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <input
          type={type}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 text-lg font-black outline-none transition-all focus:border-black focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={`w-full rounded-2xl py-4 text-lg font-black transition-all ${hairline.primaryButton} ${hairline.focus} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          저장하기
        </button>
      </form>
    </>
  );
}

function PasswordView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <BackHeader
        title="비밀번호 변경"
        description="백엔드 인증 API가 연결되면 현재 비밀번호 검증 후 변경합니다."
        onBack={onBack}
      />
      <div className={`rounded-[24px] p-6 ${hairline.panelSoft}`}>
        <p className={`text-sm font-black ${hairline.mutedText}`}>
          TODO(BE): PATCH /api/users/me/password 연결 예정
        </p>
      </div>
    </>
  );
}

function WithdrawalView({ onBack }: { onBack: () => void }) {
  return (
    <>
      <BackHeader
        title="회원 탈퇴"
        description="실수 방지를 위해 백엔드 API 연결 후 최종 확인 단계와 함께 처리합니다."
        onBack={onBack}
      />
      <div className={`rounded-[24px] p-6 ${hairline.panelSoft}`}>
        <div className="flex items-center gap-3 text-rose-600">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-black">TODO(BE): DELETE /api/users/me 연결 예정</p>
        </div>
      </div>
    </>
  );
}

function BackHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-10 flex items-center gap-4">
      <button
        type="button"
        onClick={onBack}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hairline.secondaryButton} ${hairline.focus}`}
        aria-label="설정으로 돌아가기"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <div>
        <h3 className="text-3xl font-black tracking-tight text-gray-950">{title}</h3>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>{description}</p>
      </div>
    </div>
  );
}
