import { Bell, Heart, RefreshCw, X } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';
import { PlatformPill } from '../PlatformPill';
import { ProductVisual } from '../ProductVisual';
import { hairline } from '../../styles/hairline';
import type { Product } from '../../types/product';
import { formatWon } from '../../utils/format';
import type { MyPageToastTone } from './MyPageUtils';

export function TabHeader({
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
        <h3 className="mb-2 text-3xl font-black tracking-tight text-gray-950">
          {title}
        </h3>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function RefreshButton({
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
        <RefreshCw
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
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

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`flex min-h-[360px] items-center justify-center rounded-[28px] px-8 text-center ${hairline.panelSoft}`}
    >
      <div>
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${hairline.control}`}
        >
          {icon}
        </div>
        <p className="text-lg font-black text-gray-950">{title}</p>
        <p className={`mt-2 text-sm font-semibold ${hairline.mutedText}`}>
          {description}
        </p>
      </div>
    </div>
  );
}

export function ProductListCard({
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
        <div
          className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[20px] ${hairline.image}`}
        >
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
          <Heart
            className={`h-6 w-6 ${isWished ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
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
          <Bell
            className={`h-6 w-6 ${isAlertEnabled ? 'fill-current' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>
    </article>
  );
}

export function MyPageAlertToast({
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
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneClass}`}
        >
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
