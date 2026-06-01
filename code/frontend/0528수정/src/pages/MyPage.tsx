import { ArrowLeft, Bell, ChevronDown, ChevronRight, Clock, Heart, RefreshCw, Settings, Trash2, TrendingDown, TrendingUp, User, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductVisual } from '../components/ProductVisual';
// TODO(BE): 찜 목록 API가 생기면 GET /api/users/me/wishlist 응답으로 교체합니다.
// TODO(BE): 최근 본 상품 API가 생기면 GET /api/users/me/recently-viewed 응답으로 교체합니다.
import { products } from '../data/mockProducts';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatWon } from '../utils/format';

type WishlistDisplayItem = Product & { addedPrice?: number };

const wishlistItems: WishlistDisplayItem[] = [
  { ...products[0], addedPrice: 2100000 },
  { ...products[1], addedPrice: 390000 },
  { ...products[2], status: '판매완료' as const, addedPrice: 47500 },
];
const recentItems = products.slice(2, 7);

type Tab = 'wishlist' | 'recent' | 'notifications' | 'settings';

type MyPageProps = {
  onProductSelect: (product: Product) => void;
};

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'wishlist', label: '찜 목록', icon: <Heart className="w-5 h-5" aria-hidden="true" /> },
  { id: 'recent', label: '최근 본 상품', icon: <Clock className="w-5 h-5" aria-hidden="true" /> },
  { id: 'notifications', label: '알림', icon: <Bell className="w-5 h-5" aria-hidden="true" /> },
  { id: 'settings', label: '설정', icon: <Settings className="w-5 h-5" aria-hidden="true" /> },
];

type WishlistSection = 'active' | 'sold';

export function MyPage({ onProductSelect }: MyPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  return (
    <main className={`flex-1 ${hairline.page}`}>
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-8 py-16 md:grid-cols-[320px_1fr] md:items-start lg:gap-14">
        <aside className="w-full shrink-0">
          <div className={`min-h-[760px] rounded-[28px] p-5 ${hairline.panelSoft} flex flex-col`}>
            <h2 className="mb-4 text-center text-3xl font-black tracking-wide text-gray-950">
              마이페이지
            </h2>
            <div className="h-[1.5px] bg-gray-300 mb-3" />
            <nav className="flex flex-col gap-1" aria-label="마이페이지 메뉴">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSettingsView('main'); }}
                  className={`flex items-center gap-3 rounded-2xl p-4 text-lg font-bold text-left transition-all ${
                    activeTab === tab.id
                      ? `${hairline.primaryButton} ${hairline.focus}`
                      : `text-gray-500 ${hairline.controlHover} ${hairline.focus}`
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <section className="min-w-0 pt-2">
          <div key={activeTab + settingsView} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
            {activeTab === 'wishlist' && (
              <WishlistTab items={wishlistItems} onProductSelect={onProductSelect} />
            )}
            {activeTab === 'recent' && (
              <RecentTab items={recentItems} onProductSelect={onProductSelect} />
            )}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'settings' && <SettingsTab view={settingsView} setView={setSettingsView} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function WishlistTab({
  items,
  onProductSelect,
}: {
  items: WishlistDisplayItem[];
  onProductSelect: (p: Product) => void;
}) {
  const [wishlist, setWishlist] = useState(items.map((i) => i.id));
  const [collapsedSections, setCollapsedSections] = useState<Set<WishlistSection>>(new Set());

  const activeItems  = items.filter((i) => wishlist.includes(i.id) && i.status !== '판매완료');
  const soldItems    = items.filter((i) => wishlist.includes(i.id) && i.status === '판매완료');
  const totalCount   = activeItems.length + soldItems.length;

  const removeFromWishlist = (id: number) =>
    setWishlist((prev) => prev.filter((wid) => wid !== id));

  const toggleSection = (section: WishlistSection) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });

  if (totalCount === 0) {
    return (
      <>
        <div className="mb-10">
          <h3 className="text-3xl font-bold mb-2">찜 목록</h3>
          <p className={`text-base font-semibold ${hairline.mutedText}`}>총 0개</p>
        </div>
        <EmptyState message="찜한 상품이 없습니다" sub="검색 결과에서 하트를 눌러 저장해보세요" />
      </>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h3 className="text-3xl font-bold mb-2">찜 목록</h3>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>
          총 {totalCount}개
          {soldItems.length > 0 && (
            <span className="ml-2 text-gray-400">
              (판매중 {activeItems.length} · 판매완료 {soldItems.length})
            </span>
          )}
        </p>
      </div>

      {/* 판매중 */}
      {activeItems.length > 0 && (
        <div className="mb-8">
          <button
            type="button"
            onClick={() => toggleSection('active')}
            aria-expanded={!collapsedSections.has('active')}
            className={`group flex w-full items-center gap-3 mb-4 rounded-lg ${hairline.focus}`}
          >
            <span className={`text-sm font-black tracking-widest uppercase ${hairline.mutedText}`}>판매중</span>
            <span className="text-sm font-bold text-gray-400">{activeItems.length}</span>
            <div className="h-px flex-1 bg-[#C9CFDA]" />
            <ChevronDown
              className={`w-6 h-6 text-gray-400 transition-all group-hover:text-gray-900 ${
                collapsedSections.has('active') ? '-rotate-90' : ''
              }`}
              aria-hidden="true"
            />
          </button>
          {!collapsedSections.has('active') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeItems.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  onSelect={onProductSelect}
                  onRemove={removeFromWishlist}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 판매완료 */}
      {soldItems.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => toggleSection('sold')}
            aria-expanded={!collapsedSections.has('sold')}
            className={`group flex w-full items-center gap-3 mb-4 rounded-lg ${hairline.focus}`}
          >
            <span className="text-sm font-black tracking-widest uppercase text-gray-400">판매완료</span>
            <span className="text-sm font-bold text-gray-300">{soldItems.length}</span>
            <div className="h-px flex-1 bg-gray-200" />
            <ChevronDown
              className={`w-6 h-6 text-gray-400 transition-all group-hover:text-gray-900 ${
                collapsedSections.has('sold') ? '-rotate-90' : ''
              }`}
              aria-hidden="true"
            />
          </button>
          {!collapsedSections.has('sold') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {soldItems.map((item) => (
                <WishlistCard
                  key={item.id}
                  item={item}
                  sold
                  onSelect={onProductSelect}
                  onRemove={removeFromWishlist}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function SectionLabel({
  text,
  count,
  muted = false,
}: {
  text: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`text-sm font-black tracking-widest uppercase ${muted ? 'text-gray-400' : hairline.mutedText}`}>
        {text}
      </span>
      <span className={`text-sm font-bold ${muted ? 'text-gray-300' : 'text-gray-400'}`}>{count}</span>
      <div className={`h-px flex-1 ${muted ? 'bg-gray-200' : 'bg-[#C9CFDA]'}`} />
    </div>
  );
}

function WishlistCard({
  item,
  sold = false,
  onSelect,
  onRemove,
}: {
  item: WishlistDisplayItem;
  sold?: boolean;
  onSelect: (p: Product) => void;
  onRemove: (id: number) => void;
}) {
  const delta = item.addedPrice != null ? item.price - item.addedPrice : null;
  const deltaPercent = delta != null && item.addedPrice ? (delta / item.addedPrice) * 100 : null;
  const isDrop = delta != null && delta < 0;
  const isUp = delta != null && delta > 0;

  return (
    <article
      className={`group flex items-center gap-4 rounded-[24px] p-6 transition-all focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${hairline.card} ${sold ? 'opacity-60' : hairline.cardHover}`}
    >
      <button
        type="button"
        onClick={() => { if (!sold) onSelect(item); }}
        disabled={sold}
        className="flex min-w-0 flex-1 items-center gap-6 text-left outline-none disabled:cursor-default"
        aria-label={sold ? `${item.name} — 판매완료` : `${item.name} 상세 보기`}
      >
        <div className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${hairline.image}`}>
          <div className={sold ? 'grayscale' : ''}>
            <ProductVisual imageUrl={item.imageUrl} name={item.name} variant="thumb" />
          </div>
          {sold && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
              <span className="text-[12px] font-black text-white tracking-tight">판매완료</span>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-400 font-bold uppercase">{item.brand}</p>
          <h4 className={`font-bold text-lg mb-2 line-clamp-1 ${sold ? 'text-gray-400' : 'text-gray-900'}`}>
            {item.name}
          </h4>
          {sold ? (
            <p className="text-base font-bold text-gray-400 line-through">{formatWon(item.price)}</p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="font-bold text-xl">{formatWon(item.price)}</p>
              {delta !== null && delta !== 0 && (
                <span
                  className={`flex items-center gap-1 text-xs font-bold ${
                    isDrop ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {isDrop ? (
                    <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {isDrop ? '−' : '+'}{formatWon(Math.abs(delta))}
                  {deltaPercent !== null && (
                    <span className={`${isDrop ? 'text-emerald-500' : 'text-red-400'} font-semibold`}>
                      ({isDrop ? '−' : '+'}{Math.abs(deltaPercent).toFixed(1)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </button>
      <button
        onClick={() => onRemove(item.id)}
        className={`rounded-full border p-3 transition-colors ${hairline.focus} ${
          sold
            ? 'border-gray-200 bg-white/70 text-gray-300 hover:bg-gray-50'
            : 'border-[#C9CFDA] bg-white/70 text-red-500 hover:bg-red-50'
        }`}
        aria-label={`${item.name} 찜 해제`}
      >
        <Heart className={`w-5 h-5 ${sold ? '' : 'fill-current'}`} aria-hidden="true" />
      </button>
    </article>
  );
}

const VIEWED_AT = ['방금 전', '10분 전', '32분 전', '1시간 전', '3시간 전'];

function RecentTab({
  items,
  onProductSelect,
}: {
  items: Product[];
  onProductSelect: (p: Product) => void;
}) {
  const [log, setLog] = useState(items);
  const [isLoading, setIsLoading] = useState(false);
  const [lastLoaded, setLastLoaded] = useState('방금 전');

  const reload = () => {
    setIsLoading(true);
    // TODO(BE): GET /api/users/me/recently-viewed 호출로 교체
    setTimeout(() => {
      setLog([...items]);
      setLastLoaded('방금 전');
      setIsLoading(false);
    }, 1200);
  };

  const removeItem = (id: number) =>
    setLog((prev) => prev.filter((item) => item.id !== id));

  return (
    <>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h3 className="text-3xl font-bold mb-2">최근 본 상품</h3>
          <p className={`text-base font-semibold ${hairline.mutedText}`}>
            최근 열람한 상품 {log.length}개
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={reload}
            disabled={isLoading}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-bold transition-all ${hairline.control} ${hairline.controlHover} ${hairline.focus} disabled:opacity-50`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '불러오는 중...' : '새로고침'}
          </button>
          <span className={`text-sm pr-2 ${hairline.quietText}`}>마지막 업데이트: {lastLoaded}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-[88px] animate-pulse rounded-[24px] ${hairline.panelSoft}`} />
          ))}
        </div>
      ) : log.length === 0 ? (
        <EmptyState message="최근 본 상품이 없습니다" sub="상품을 클릭하면 여기에 기록돼요" />
      ) : (
        <div className="flex flex-col gap-4">
          {log.map((item, idx) => (
            <article
              key={item.id}
              className={`group relative flex items-center gap-4 rounded-[24px] p-6 transition-all focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${hairline.card} ${hairline.cardHover}`}
            >
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className={`absolute right-3 top-3 z-10 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 ${hairline.focus}`}
                aria-label={`${item.name} 기록 삭제`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onProductSelect(item)}
                className="flex min-w-0 flex-1 items-center gap-6 text-left outline-none"
                aria-label={`${item.name} 상세 보기`}
              >
                <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${hairline.image}`}>
                  <ProductVisual imageUrl={item.imageUrl} name={item.name} variant="thumb" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-400 font-bold uppercase">{item.brand}</p>
                  <h4 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{item.name}</h4>
                  <p className="font-bold text-xl">{formatWon(item.price)}</p>
                </div>
                <div className="shrink-0 self-end flex items-center gap-2">
                  <span className={`text-sm font-semibold ${hairline.quietText}`}>
                    {VIEWED_AT[idx] ?? '이전'}
                  </span>
                  <span className="rounded-lg border border-[#C9CFDA] bg-white/80 px-2 py-0.5 text-sm font-bold text-gray-600">
                    {item.platform}
                  </span>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

type NotificationItem = {
  id: number;
  type: 'price_drop' | 'sold' | 'new_listing' | 'system';
  productId?: number;
  triggerPrice?: number;
  title: string;
  body: string;
  time: string;
  read: boolean;
};

const mockNotifications: NotificationItem[] = [
  { id: 1, type: 'sold',        productId: 3,  title: '찜 상품 판매완료',   body: '"빈티지 휴대폰 2점일괄" 판매가 완료됐어요.',              time: '방금 전', read: false },
  { id: 2, type: 'price_drop',  productId: 2,  triggerPrice: 390000,  title: '찜 상품 최저가 도달', body: '찜한 상품이 최저가에 도달했어요.',                          time: '5분 전',  read: false },
  { id: 3, type: 'new_listing', productId: 9,  title: '새 매물 등록',       body: '검색 결과에 새로운 상품이 등록됐어요.',                       time: '23분 전', read: false },
  { id: 4, type: 'price_drop',  productId: 4,  triggerPrice: 3800000, title: '찜 상품 최저가 도달', body: '찜한 상품이 최저가에 도달했어요.',                          time: '1시간 전', read: true },
  { id: 5, type: 'new_listing', productId: 6,  title: '새 매물 등록',       body: '검색 결과에 새로운 상품이 등록됐어요.',                       time: '어제',    read: true },
  { id: 6, type: 'sold',        productId: 7,  title: '찜 상품 판매완료',   body: '"애니 비공굿 굿즈들" 판매가 완료됐어요.',                  time: '어제',    read: true },
];

const notifTypeLabel: Record<NotificationItem['type'], string> = {
  price_drop: '최저가 도달',
  sold:       '판매완료',
  new_listing: '새 매물',
  system:     '시스템',
};

const NOTIF_SECTION_ORDER: { type: NotificationItem['type']; title: string }[] = [
  { type: 'sold',        title: '판매완료' },
  { type: 'price_drop',  title: '최저가 도달' },
  { type: 'new_listing', title: '새 매물' },
];

function NotificationsTab() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<NotificationItem['type']>>(new Set());

  const toggleSection = (type: NotificationItem['type']) =>
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: number) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

  const dismiss = (id: number) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const deleteAll = () => {
    setNotifications([]);
    setShowDeleteModal(false);
  };

  return (
    <>
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowDeleteModal(false)}>
          <div className="w-72 rounded-2xl bg-white px-6 py-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-gray-900 mb-4">알림을 모두 삭제할까요?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
              <button onClick={deleteAll} className="flex-1 rounded-xl bg-gray-900 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors">삭제</button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h3 className="text-3xl font-bold mb-2">알림</h3>
          <p className={`text-base font-semibold ${hairline.mutedText}`}>
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모든 알림을 읽었습니다'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className={`text-base font-bold text-gray-500 hover:text-black underline ${hairline.focus} rounded-lg`}
            >
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState message="알림이 없습니다" sub="가격 하락 및 새 매물 알림을 설정에서 켤 수 있어요." />
      ) : (
        <div className="flex flex-col gap-8">
          {NOTIF_SECTION_ORDER.map(({ type, title }) => {
            const items = notifications.filter((n) => n.type === type);
            if (items.length === 0) return null;
            const isCollapsed = collapsedSections.has(type);
            return (
              <div key={type}>
                <button
                  type="button"
                  onClick={() => toggleSection(type)}
                  aria-expanded={!isCollapsed}
                  className={`group flex w-full items-center gap-3 mb-4 rounded-lg ${hairline.focus}`}
                >
                  <span className={`text-sm font-black tracking-widest uppercase ${hairline.mutedText}`}>
                    {title}
                  </span>
                  <span className="text-sm font-bold text-gray-400">{items.length}</span>
                  <div className="h-px flex-1 bg-[#C9CFDA]" />
                  <ChevronDown
                    className={`w-6 h-6 text-gray-400 transition-all group-hover:text-gray-900 ${
                      isCollapsed ? '-rotate-90' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {items.map((notif) => (
                      <NotificationCard
                        key={notif.id}
                        notif={notif}
                        onRead={markRead}
                        onDismiss={dismiss}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function NotificationCard({
  notif,
  onRead,
  onDismiss,
}: {
  notif: NotificationItem;
  onRead: (id: number) => void;
  onDismiss: (id: number) => void;
}) {
  const product = notif.productId != null ? products.find((p) => p.id === notif.productId) : undefined;
  const sold = notif.type === 'sold';
  const isPriceDrop = notif.type === 'price_drop';
  const displayPrice = isPriceDrop && notif.triggerPrice != null ? notif.triggerPrice : product?.price;

  return (
    <article
      className={`group relative flex items-center gap-4 rounded-[24px] p-6 transition-all focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${hairline.card} ${sold ? 'opacity-60' : hairline.cardHover}`}
    >
      <button
        type="button"
        onClick={() => onDismiss(notif.id)}
        className={`absolute right-3 top-3 z-10 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 ${hairline.focus}`}
        aria-label="알림 삭제"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onRead(notif.id)}
        className="flex min-w-0 flex-1 items-center gap-6 text-left outline-none pt-3"
        aria-label={product ? `${product.name} 상세 보기` : notif.title}
      >
        {product && (
          <div className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${hairline.image}`}>
            <div className={sold ? 'grayscale' : ''}>
              <ProductVisual imageUrl={product.imageUrl} name={product.name} variant="thumb" />
            </div>
            {sold && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40">
                <span className="text-[12px] font-black text-white tracking-tight">판매완료</span>
              </div>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${
              sold ? 'bg-gray-100 text-gray-700'
              : isPriceDrop ? 'bg-red-50 text-red-600'
              : 'bg-emerald-50 text-emerald-700'
            }`}>
              {notifTypeLabel[notif.type]}
            </span>
            <span className={`text-sm font-semibold ${hairline.quietText}`}>{notif.time}</span>
          </div>
          {product ? (
            <>
              <p className="text-sm text-gray-400 font-bold uppercase">{product.brand}</p>
              <h4 className={`font-bold text-lg mb-2 line-clamp-1 ${sold ? 'text-gray-400' : 'text-gray-900'}`}>
                {product.name}
              </h4>
              {sold ? (
                <p className="text-base font-bold text-gray-400 line-through">{formatWon(product.price)}</p>
              ) : (
                <p className="font-bold text-xl">{formatWon(displayPrice ?? product.price)}</p>
              )}
            </>
          ) : (
            <p className={`text-sm ${hairline.mutedText}`}>{notif.body}</p>
          )}
        </div>
      </button>
    </article>
  );
}

type SettingsView = 'main' | 'editName' | 'editEmail' | 'editPassword' | 'withdrawal';

function SettingsTab({ view, setView }: { view: SettingsView; setView: (v: SettingsView) => void }) {
  const [displayName, setDisplayName] = useState('김다은');
  const [displayEmail, setDisplayEmail] = useState('rlekdm@bu.ac.kr');
  const [notifLowestPrice, setNotifLowestPrice] = useState(true);
  const [notifSold, setNotifSold] = useState(true);
  const [notifNewListing, setNotifNewListing] = useState(true);
  const [notifSystem, setNotifSystem] = useState(false);

  if (view === 'editName') {
    return (
      <EditNameView
        currentName={displayName}
        onBack={() => setView('main')}
        onSave={(name) => { setDisplayName(name); setView('main'); }}
      />
    );
  }

  if (view === 'editEmail') {
    return (
      <EditEmailView
        currentEmail={displayEmail}
        onBack={() => setView('main')}
        onSave={(email) => { setDisplayEmail(email); setView('main'); }}
      />
    );
  }

  if (view === 'editPassword') {
    return (
      <EditPasswordView
        onBack={() => setView('main')}
        onSave={() => setView('main')}
      />
    );
  }

  if (view === 'withdrawal') {
    return <WithdrawalView onBack={() => setView('main')} />;
  }

  return (
    <>
      <div className="mb-10">
        <h3 className="text-3xl font-bold mb-2">설정</h3>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>계정 및 알림 설정을 관리하세요</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* 프로필 */}
        <SettingsGroup title="마이페이지">
          <div className={`rounded-[20px] p-6 ${hairline.card}`}>
            <div className="flex items-center mb-4 px-4">
              <div>
                <p className="font-bold text-gray-900 text-lg">{displayName}</p>
                <p className={`text-base font-semibold ${hairline.mutedText}`}>{displayEmail}</p>
              </div>
            </div>
            <div className="h-px bg-[#C9CFDA]/60 mb-3" />
            <div className="flex flex-col gap-3">
              <SettingsRow label="이름 변경"     onClick={() => setView('editName')} />
              <SettingsRow label="이메일 변경"   onClick={() => setView('editEmail')} />
              <SettingsRow label="비밀번호 변경" onClick={() => setView('editPassword')} />
            </div>
          </div>
        </SettingsGroup>

        {/* 알림 설정 */}
        <SettingsGroup title="알림 설정">
          <div className={`rounded-[20px] overflow-hidden ${hairline.card}`}>
            <ToggleRow
              label="찜 목록 최저가 알림"
              description="찜한 상품이 최저가에 도달하면 알려드려요"
              value={notifLowestPrice}
              onChange={setNotifLowestPrice}
            />
            <div className="h-px bg-[#C9CFDA]/60 mx-5" />
            <ToggleRow
              label="찜 목록 판매완료 알림"
              description="찜한 상품이 판매완료 되면 바로 알려드려요"
              value={notifSold}
              onChange={setNotifSold}
            />
            <div className="h-px bg-[#C9CFDA]/60 mx-5" />
            <ToggleRow
              label="새 매물 알림"
              description="저장한 검색어에 새 상품이 등록되면 알려드려요"
              value={notifNewListing}
              onChange={setNotifNewListing}
            />
            <div className="h-px bg-[#C9CFDA]/60 mx-5" />
            <ToggleRow
              label="서비스 안내"
              description="데이터 업데이트 및 서비스 공지사항"
              value={notifSystem}
              onChange={setNotifSystem}
            />
          </div>
        </SettingsGroup>

        <div className="h-px bg-[#C9CFDA]/60" />

        <button
          onClick={() => setView('withdrawal')}
          className={`flex w-full items-center justify-between rounded-[20px] px-6 py-5 text-left transition-all ${hairline.card} ${hairline.cardHover} ${hairline.focus}`}
        >
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-red-700" aria-hidden="true" />
            <div>
              <p className="font-bold text-red-700 text-base">회원 탈퇴</p>
              <p className={`text-sm font-semibold mt-0.5 ${hairline.quietText}`}>
                계정 및 모든 데이터를 삭제합니다
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </button>

      </div>
    </>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className={`text-sm font-black uppercase tracking-widest mb-3 px-1 ${hairline.mutedText}`}>{title}</p>
      {children}
    </div>
  );
}

function SettingsRow({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center justify-between rounded-xl px-4 py-3 text-base font-bold text-gray-700 transition-colors hover:bg-gray-50 ${hairline.focus}`}
    >
      {label}
      <ChevronRight className="w-4 h-4 text-gray-400 transition-colors group-hover:text-gray-900" aria-hidden="true" />
    </button>
  );
}

function EditNameView({
  currentName,
  onBack,
  onSave,
}: {
  currentName: string;
  onBack: () => void;
  onSave: (name: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName.trim() === currentName) return;
    // TODO(BE): PATCH /api/users/me/profile { name }
    onSave(newName.trim());
    setSaved(true);
  };

  const isDirty  = newName.trim() !== '' && newName.trim() !== currentName;

  return (
    <>
      {/* 헤더 */}
      <div className="mb-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9CFDA] bg-white transition-colors hover:bg-gray-50 ${hairline.focus}`}
          aria-label="설정으로 돌아가기"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h3 className="text-3xl font-bold">이름 변경</h3>
          <p className={`text-base font-semibold ${hairline.mutedText}`}>프로필에 표시될 이름을 수정하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 현재 이름 */}
        <div className={`rounded-[20px] p-6 ${hairline.card}`}>
          <p className={`text-sm font-black uppercase tracking-widest mb-4 ${hairline.mutedText}`}>현재 이름</p>
          <div className="flex items-center gap-4">
            <p className="text-xl font-bold text-gray-900">{currentName}</p>
          </div>
        </div>

        {/* 새 이름 입력 */}
        <div className={`rounded-[20px] p-6 ${hairline.card}`}>
          <p className={`text-sm font-black uppercase tracking-widest mb-4 ${hairline.mutedText}`}>새 이름</p>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setSaved(false); }}
              placeholder={currentName}
              maxLength={20}
              className={`w-full rounded-2xl border bg-white px-5 py-4 text-lg font-bold outline-none transition-all ${
                isDirty
                  ? 'border-black focus:border-black focus:ring-2 focus:ring-black'
                  : 'border-[#C9CFDA] focus:border-black focus:ring-2 focus:ring-black'
              }`}
            />
            <div className="flex items-center justify-between px-1">
              <p className={`text-sm font-semibold ${hairline.quietText}`}>
                한글·영문·숫자 사용 가능, 최대 20자
              </p>
              <p className={`text-sm font-semibold ${newName.length >= 20 ? 'text-red-400' : hairline.quietText}`}>
                {newName.length} / 20
              </p>
            </div>
          </div>

          {/* 변경 미리보기 */}
          {isDirty && (
            <div className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3 ${hairline.panelSoft}`}>
              <div>
                <p className={`text-sm font-semibold ${hairline.quietText}`}>변경 후 프로필</p>
                <p className="text-sm font-bold text-gray-900">{newName.trim()}</p>
              </div>
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        <button
          type="submit"
          disabled={!isDirty}
          className={`w-full rounded-2xl py-4 text-lg font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saved ? '저장됐습니다' : '저장하기'}
        </button>
      </form>
    </>
  );
}

// ─── 이메일 변경 ──────────────────────────────────────────────────────
const TAKEN_EMAILS = ['test@hama.kr', 'admin@hama.kr'];

function EditEmailView({
  currentEmail,
  onBack,
  onSave,
}: {
  currentEmail: string;
  onBack: () => void;
  onSave: (email: string) => void;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidFormat = emailRegex.test(newEmail);
  const isDirty = newEmail !== '' && newEmail !== currentEmail && isValidFormat;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    if (TAKEN_EMAILS.includes(newEmail)) {
      setError('이미 사용 중인 이메일입니다.');
      return;
    }
    // TODO(BE): PATCH /api/users/me/profile { email }
    onSave(newEmail);
    setSaved(true);
  };

  return (
    <>
      <div className="mb-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9CFDA] bg-white transition-colors hover:bg-gray-50 ${hairline.focus}`}
          aria-label="설정으로 돌아가기"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h3 className="text-3xl font-bold">이메일 변경</h3>
          <p className={`text-base font-semibold ${hairline.mutedText}`}>로그인에 사용할 이메일을 변경하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 현재 이메일 */}
        <div className={`rounded-[20px] p-6 ${hairline.card}`}>
          <p className={`text-sm font-black uppercase tracking-widest mb-3 ${hairline.mutedText}`}>현재 이메일</p>
          <p className="text-xl font-bold text-gray-900">{currentEmail}</p>
        </div>

        {/* 새 이메일 */}
        <div className={`rounded-[20px] p-6 ${hairline.card}`}>
          <p className={`text-sm font-black uppercase tracking-widest mb-4 ${hairline.mutedText}`}>새 이메일</p>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setError(''); setSaved(false); }}
            placeholder="새 이메일 주소 입력"
            className={`w-full rounded-2xl border bg-white px-5 py-4 text-lg font-bold outline-none transition-all ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400'
                : isDirty
                ? 'border-black focus:border-black focus:ring-2 focus:ring-black'
                : 'border-[#C9CFDA] focus:border-black focus:ring-2 focus:ring-black'
            }`}
          />
          {error && <p className="mt-2 px-1 text-sm font-semibold text-red-500">{error}</p>}
          {!error && newEmail && !isValidFormat && (
            <p className="mt-2 px-1 text-sm font-semibold text-red-400">올바른 이메일 형식이 아닙니다.</p>
          )}
          {isDirty && !error && (
            <div className={`mt-4 rounded-xl px-4 py-3 ${hairline.panelSoft}`}>
              <p className={`text-sm font-semibold ${hairline.quietText}`}>변경 후 이메일</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{newEmail}</p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!isDirty}
          className={`w-full rounded-2xl py-4 text-lg font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saved ? '변경됐습니다' : '변경하기'}
        </button>
      </form>
    </>
  );
}

// ─── 비밀번호 변경 ────────────────────────────────────────────────────
function EditPasswordView({ onBack, onSave }: { onBack: () => void; onSave: () => void }) {
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [currentPwError, setCurrentPwError] = useState('');
  const [saved, setSaved]           = useState(false);

  const MOCK_CURRENT_PW = 'password123';


  const mismatch = confirmPw !== '' && newPw !== confirmPw;
  const isDirty  = currentPw !== '' && newPw.length >= 6 && confirmPw !== '' && !mismatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    if (currentPw !== MOCK_CURRENT_PW) {
      setCurrentPwError('현재 비밀번호가 일치하지 않습니다.');
      return;
    }
    // TODO(BE): PATCH /api/users/me/password { currentPassword, newPassword }
    setSaved(true);
    setTimeout(onSave, 900);
  };

  return (
    <>
      <div className="mb-10 flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C9CFDA] bg-white transition-colors hover:bg-gray-50 ${hairline.focus}`}
          aria-label="설정으로 돌아가기"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h3 className="text-3xl font-bold">비밀번호 변경</h3>
          <p className={`text-base font-semibold ${hairline.mutedText}`}>현재 비밀번호를 확인 후 새로 설정하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 현재 비밀번호 */}
        <div className={`rounded-[20px] p-6 ${hairline.card}`}>
          <p className={`text-sm font-black uppercase tracking-widest mb-4 ${hairline.mutedText}`}>현재 비밀번호</p>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => { setCurrentPw(e.target.value); setCurrentPwError(''); setSaved(false); }}
            placeholder="현재 비밀번호 입력"
            className={`w-full rounded-2xl border bg-white px-5 py-4 text-lg font-bold outline-none transition-all ${
              currentPwError
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400'
                : 'border-[#C9CFDA] focus:border-black focus:ring-2 focus:ring-black'
            }`}
          />
          {currentPwError && (
            <p className="mt-2 px-1 text-sm font-semibold text-red-500">{currentPwError}</p>
          )}
        </div>

        {/* 새 비밀번호 */}
        <div className={`rounded-[20px] p-6 ${hairline.card}`}>
          <p className={`text-sm font-black uppercase tracking-widest mb-4 ${hairline.mutedText}`}>새 비밀번호</p>
          <div className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="새 비밀번호 (6자 이상)"
                className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 text-lg font-bold outline-none transition-all focus:border-black focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="새 비밀번호 확인"
                className={`w-full rounded-2xl border bg-white px-5 py-4 text-lg font-bold outline-none transition-all ${
                  mismatch
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400'
                    : confirmPw && !mismatch
                    ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400'
                    : 'border-[#C9CFDA] focus:border-black focus:ring-2 focus:ring-black'
                }`}
              />
              {mismatch && (
                <p className="mt-2 px-1 text-sm font-semibold text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
              {confirmPw && !mismatch && (
                <p className="mt-2 px-1 text-sm font-semibold text-emerald-600">비밀번호가 일치합니다.</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isDirty || saved}
          className={`w-full rounded-2xl py-4 text-lg font-bold transition-all ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {saved ? '변경됐습니다 ✓' : '변경하기'}
        </button>
      </form>
    </>
  );
}


function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
      <div>
        <p className="font-bold text-gray-900 text-base">{label}</p>
        <p className={`text-sm font-semibold mt-0.5 ${hairline.quietText}`}>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
          value ? 'bg-black' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

function WithdrawalView({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>({
    wishlist: false,
    notifications: false,
    account: false,
  });
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);

  const canDelete = Object.values(checked).every(Boolean) && password.length > 0;

  const consequences = [
    { key: 'wishlist',      label: '찜 목록과 최근 본 상품이 모두 삭제됩니다.' },
    { key: 'notifications', label: '알림 설정 및 수신 내역이 삭제됩니다.' },
    { key: 'account',       label: '계정 정보가 삭제되며 복구할 수 없습니다.' },
  ];

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-60 gap-3 px-6 py-12 text-center">
        <Trash2 size={36} className="text-gray-400" />
        <p className="font-bold text-gray-900 text-lg">탈퇴 처리가 완료되었습니다</p>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>그동안 이용해 주셔서 감사합니다.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-6 py-3 rounded-[14px] font-bold text-sm bg-gray-900 text-white transition-colors hover:bg-gray-700 active:scale-[0.98]"
        >
          메인 화면으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
        <button onClick={onBack} className={`p-1 rounded-lg ${hairline.controlHover}`}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-gray-900 text-xl">회원 탈퇴</h2>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5">
        <div className={`rounded-[14px] px-4 py-4 bg-red-50 border border-red-100 shadow-[0_4px_16px_rgba(239,68,68,0.10)]`}>
          <p className="text-lg font-bold text-red-600 mb-1">탈퇴 전 꼭 확인하세요</p>
          <p className={`text-sm font-semibold ${hairline.mutedText}`}>
            아래 항목을 모두 확인하고 동의해야 탈퇴가 가능합니다.
          </p>
        </div>

        <div className={`rounded-[14px] border border-gray-100 divide-y divide-gray-100 ${hairline.panelSoft}`}>
          {consequences.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setChecked(prev => ({ ...prev, [key]: !prev[key] }))}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
            >
              <span
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  checked[key] ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                }`}
              >
                {checked[key] && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-base font-semibold text-gray-700">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-base font-bold text-gray-700">계정 비밀번호 확인</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="비밀번호를 입력하세요"
            className={`w-full rounded-[10px] border px-4 py-3 text-sm font-semibold outline-none transition-colors ${hairline.focus} border-gray-200`}
          />
        </div>

        <button
          disabled={!canDelete}
          onClick={() => setDone(true)}
          className={`w-full py-3 rounded-[14px] font-bold text-base transition-all ${
            canDelete
              ? 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          회원 탈퇴
        </button>
      </div>
    </div>
  );
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <div className={`flex min-h-60 items-center justify-center rounded-[24px] px-6 text-center ${hairline.panelSoft}`}>
      <p className="text-lg font-bold text-gray-900">
        {message}
        <span className="mt-1 block text-base font-semibold text-[#86868B]">{sub}</span>
      </p>
    </div>
  );
}
