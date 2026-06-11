import {
  Bell,
  Clock,
  Heart,
  Scale,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MyPageNotificationsTab } from '../components/mypage/MyPageNotificationsTab';
import { MyPageProductListTab } from '../components/mypage/MyPageProductListTab';
import {
  MyPageSettingsTab,
  type SettingsView,
} from '../components/mypage/MyPageSettingsTab';
import { MyPagePriceCompareTab } from '../components/mypage/MyPagePriceCompareTab';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';

type MyPageProps = {
  onProductSelect: (product: Product) => void;
  isAdmin?: boolean;
  onWithdrawn: () => void;
};

type Tab = 'wishlist' | 'recent' | 'notifications' | 'priceCompare' | 'settings';

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
    id: 'priceCompare',
    label: '가격 비교',
    icon: Scale,
    iconTone: 'text-gray-950',
    iconSurface: 'bg-[#F4F5F7]',
  },
  {
    id: 'settings',
    label: '설정',
    icon: Settings,
    iconTone: 'text-emerald-600',
    iconSurface: 'bg-emerald-50/80',
  },
];

const inactiveNavItemClass =
  'border border-[#D7DDE7]/72 bg-white/[0.48] text-[#565D68] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:border-[#C9CFDA] hover:bg-white/[0.78] hover:text-[#1D1D1F]';

export function MyPage({
  onProductSelect,
  isAdmin = false,
  onWithdrawn,
}: MyPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('wishlist');
  const [settingsView, setSettingsView] = useState<SettingsView>('main');

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setSettingsView('main');
  };

  return (
    <main className={`flex-1 ${hairline.page}`}>
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-8 py-16 md:grid-cols-[320px_minmax(0,1fr)] md:items-start lg:gap-14">
        <aside className="w-full shrink-0">
          <div className={`flex min-h-[760px] flex-col rounded-[28px] p-5 ${hairline.panelSoft}`}>
            <h2 className="mb-4 text-center text-3xl font-black tracking-tight text-gray-950">
              마이페이지
            </h2>
            <div className="mb-3 h-px bg-[#C9CFDA]" />
            <nav className="flex flex-col gap-1" aria-label="마이페이지 메뉴">
              {tabs.slice(0, 4).map((tab) => (
                <MyPageNavButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => selectTab(tab.id)}
                />
              ))}
              <div className="my-3 h-px bg-[#C9CFDA]/75" aria-hidden="true" />
              {tabs.slice(4).map((tab) => (
                <MyPageNavButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => selectTab(tab.id)}
                />
              ))}
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
          <div
            key={`${activeTab}-${settingsView}`}
            className="min-w-0 animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {activeTab === 'wishlist' ? (
              <MyPageProductListTab
                type="wishlist"
                onProductSelect={onProductSelect}
              />
            ) : null}
            {activeTab === 'recent' ? (
              <MyPageProductListTab
                type="recent"
                onProductSelect={onProductSelect}
              />
            ) : null}
            {activeTab === 'notifications' ? <MyPageNotificationsTab /> : null}
            {activeTab === 'priceCompare' ? <MyPagePriceCompareTab /> : null}
            {activeTab === 'settings' ? (
              <MyPageSettingsTab
                view={settingsView}
                setView={setSettingsView}
                onWithdrawn={onWithdrawn}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function MyPageNavButton({
  tab,
  isActive,
  onClick,
}: {
  tab: TabItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = tab.icon;

  return (
    <button
      type="button"
      onClick={onClick}
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
}
