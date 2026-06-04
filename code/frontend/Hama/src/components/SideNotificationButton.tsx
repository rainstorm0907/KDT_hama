import { Bell, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformPill } from './PlatformPill';
import { ProductVisual } from './ProductVisual';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatWon } from '../utils/format';
import {
  getStoredWishlistProducts,
  productStorageKey,
} from '../utils/userProductLists';

type SideNotificationButtonProps = {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect?: (product: Product) => void;
  onToggle: () => void;
};

type FloatingNotification = {
  id: string;
  product: Product;
};

const notificationReadStorageKey = 'hama-floating-notification-read-keys:guest';

export function SideNotificationButton({
  isOpen,
  onClose,
  onProductSelect,
  onToggle,
}: SideNotificationButtonProps) {
  const navigate = useNavigate();
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(
    getStoredReadNotificationIds
  );
  const [notifications, setNotifications] = useState<FloatingNotification[]>(
    getLocalFloatingNotifications
  );

  useEffect(() => {
    window.localStorage.setItem(
      notificationReadStorageKey,
      JSON.stringify(readNotificationIds)
    );
  }, [readNotificationIds]);

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getLocalFloatingNotifications());
    }

    window.addEventListener('storage', refreshNotifications);
    window.addEventListener('focus', refreshNotifications);

    return () => {
      window.removeEventListener('storage', refreshNotifications);
      window.removeEventListener('focus', refreshNotifications);
    };
  }, []);

  const unreadNotifications = notifications.filter(
    (notification) => !readNotificationIds.includes(notification.id)
  );

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((current) =>
      current.includes(notificationId) ? current : [notificationId, ...current]
    );
  };

  const openNotificationProduct = (notification: FloatingNotification) => {
    markNotificationRead(notification.id);
    onClose();
    onProductSelect?.(notification.product);
  };

  return (
    <div className="relative">
      <div
        className={`fixed bottom-5 right-[calc(1.25rem+4rem+0.75rem)] z-[160] transition-all duration-200 ease-out md:bottom-6 md:right-[calc(1.5rem+72px+1rem)] ${
          isOpen
            ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none translate-x-3 scale-95 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <section
          className={`min-h-[300px] w-[min(414px,calc(100vw-7rem))] overflow-hidden rounded-[26px] ${hairline.panel}`}
          aria-label="최근 알림"
        >
          <div className="flex items-center justify-between border-b border-[#AEB6C2] px-5 py-4">
            <div>
              <h2 className="text-base font-black text-gray-950">알림</h2>
              <p className={`mt-0.5 text-sm font-bold ${hairline.quietText}`}>
                확인하지 않은 최근 알림
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-gray-900 ${hairline.secondaryButton} ${hairline.focus}`}
              aria-label="알림 팝업 닫기"
            >
              <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>

          {unreadNotifications.length > 0 ? (
            <ul className="max-h-[390px] min-h-[212px] overflow-y-auto px-3 py-2">
              {unreadNotifications.slice(0, 5).map((notification) => (
                <li
                  key={notification.id}
                  className="border-b border-[#E6EAF0]/90 last:border-b-0"
                >
                  <div className="group flex min-h-[98px] items-center gap-3.5 rounded-[20px] px-2.5 py-2.5 transition-colors hover:bg-white/72">
                    <button
                      type="button"
                      onClick={() => openNotificationProduct(notification)}
                      className={`flex min-w-0 flex-1 items-center gap-3.5 text-left ${hairline.focus}`}
                    >
                      <span className="h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-[#F3F4F6]">
                        <ProductVisual
                          imageUrl={notification.product.imageUrl}
                          name={notification.product.name}
                          variant="thumb"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-black text-gray-950">
                          {notification.product.name}
                        </span>
                        <span className="mt-0.5 block text-[13px] font-black text-[#626873]">
                          {formatWon(notification.product.price)}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <PlatformPill
                            platform={notification.product.platform}
                            size="card"
                          />
                          <span className={hairline.status}>
                            {notification.product.status}
                          </span>
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => markNotificationRead(notification.id)}
                      className={`ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] text-[#8B919B] transition-colors hover:bg-white hover:text-gray-950 ${hairline.focus}`}
                      aria-label={`${notification.product.name} 알림 확인 처리`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-[212px] flex-col items-center justify-center px-6 py-7 text-center">
              <p className="text-base font-black text-gray-950">
                최근 알림이 없습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/mypage');
                }}
                className={`mt-4 rounded-full border border-[#B7BEC9] bg-[#E7EBF0]/92 px-5 py-2.5 text-sm font-black text-[#1D1D1F] shadow-[0_10px_22px_rgba(29,29,31,0.08),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-md transition-colors hover:border-[#9EA8B6] hover:bg-[#DDE3EA] ${hairline.focus}`}
              >
                알림설정 하기 &gt;
              </button>
            </div>
          )}
        </section>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`relative flex h-16 w-16 items-center justify-center rounded-full text-gray-950 ring-1 ring-[#1D1D1F]/75 transition-all duration-200 active:scale-95 md:h-[72px] md:w-[72px] ${hairline.panel} ${hairline.focus}`}
        aria-label="최근 알림 보기"
        aria-expanded={isOpen}
      >
        <Bell className="h-6 w-6" aria-hidden="true" />
        {unreadNotifications.length > 0 ? (
          <span className="absolute right-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1D1D1F] px-1 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(29,29,31,0.18)]">
            {Math.min(unreadNotifications.length, 9)}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function getLocalFloatingNotifications(): FloatingNotification[] {
  if (typeof window === 'undefined') {
    return [];
  }

  return getStoredWishlistProducts().slice(0, 5).map((product) => ({
    id: `status:${productStorageKey(product)}:${product.status}`,
    product,
  }));
}

function getStoredReadNotificationIds(): string[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(notificationReadStorageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}
