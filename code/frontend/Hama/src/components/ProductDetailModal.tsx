import { useEffect, useId, useLayoutEffect, useState } from 'react';
import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  ShoppingBasket,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { useProductDetailQuery } from '../queries/productQueries';
import type { Product } from '../types/product';
import { hairline } from '../styles/hairline';
import { formatWon } from '../utils/format';
import {
  addPriceCompareProduct,
  isProductWished,
  saveRecentProduct,
  toggleWishlistProduct,
} from '../utils/userProductLists';
import { PriceInsightChart } from './PriceInsightChart';
import { ProductVisual } from './ProductVisual';

type ProductDetailModalProps = {
  product: Product | null;
  onClose: () => void;
  onOpenChatbot?: () => void;
  onOpenPriceCompare?: (product: Product) => void;
};

type ImageSelectionState = {
  productKey: string;
  index: number;
};

// 목록은 가볍게 받고, 상세 본문은 팝업을 열 때 1회 조회합니다.
// TODO(BE): DB 기반 상세 API가 생기면 현재 endpoint 내부의 외부 페이지 조회를 제거합니다.
export function ProductDetailModal({
  product,
  onClose,
  onOpenChatbot,
  onOpenPriceCompare,
}: ProductDetailModalProps) {
  useModalScrollLock(Boolean(product));

  const titleId = useId();
  const navigate = useNavigate();
  const productKey = getProductKey(product);
  const productDetailQuery = useProductDetailQuery({
    platform: product?.platform ?? '',
    pid: product?.pid ?? '',
  });
  const [imageSelection, setImageSelection] = useState<ImageSelectionState>({
    productKey: '',
    index: 0,
  });
  const [isWished, setIsWished] = useState(() =>
    product ? isProductWished(product) : false
  );
  const [isAlertEnabled, setIsAlertEnabled] = useState(false);
  const [activeToast, setActiveToast] = useState<'wish' | 'alert' | 'compare' | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useLayoutEffect(() => {
    if (!product) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, product]);

  useEffect(() => {
    if (!activeToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveToast(null);
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [activeToast]);

  useEffect(() => {
    if (!product) {
      return;
    }

    saveRecentProduct(product);
  }, [product]);

  if (!product) {
    return null;
  }

  const visibleProduct = productDetailQuery.data ?? product;
  const isDetailLoading = productDetailQuery.isPending;
  const hasMultipleImages = visibleProduct.images.length > 1;
  const latestImageIndex = visibleProduct.images.length - 1;
  const activeImageIndex = Math.min(
    imageSelection.productKey === productKey ? imageSelection.index : 0,
    Math.max(latestImageIndex, 0)
  );
  const activeImageUrl = resolveImageUrl(
    visibleProduct.images[activeImageIndex] ?? visibleProduct.imageUrl
  );
  const previousImageUrl = resolveImageUrl(
    visibleProduct.images[
      activeImageIndex === 0 ? latestImageIndex : activeImageIndex - 1
    ]
  );
  const nextImageUrl = resolveImageUrl(
    visibleProduct.images[
      activeImageIndex === latestImageIndex ? 0 : activeImageIndex + 1
    ]
  );
  const description = visibleProduct.description.trim();
  const descriptionText =
    description ||
    (isDetailLoading
      ? '상품 설명을 불러오는 중이에요.'
      : '등록된 상세 설명이 없습니다. 원본 페이지에서 확인해 주세요.');
  const descriptionPreviewLimit = 210;
  const canExpandDescription = descriptionText.length > descriptionPreviewLimit;
  const visibleDescriptionText =
    canExpandDescription && !isDescriptionExpanded
      ? `${descriptionText.slice(0, descriptionPreviewLimit).trim()}…`
      : descriptionText;
  const insightKeywords = buildInsightKeywords(visibleProduct);

  const moveImage = (direction: 'prev' | 'next') => {
    setImageSelection((currentSelection) => {
      const current =
        currentSelection.productKey === productKey ? activeImageIndex : 0;
      const nextIndex =
        direction === 'prev'
          ? current === 0
            ? latestImageIndex
            : current - 1
          : current === latestImageIndex
            ? 0
            : current + 1;

      return {
        productKey,
        index: nextIndex,
      };
    });
  };

  const selectImage = (index: number) => {
    setImageSelection({
      productKey,
      index,
    });
  };

  const handleWishToggle = () => {
    const nextValue = toggleWishlistProduct(visibleProduct);

    setIsWished(nextValue);
    setActiveToast(nextValue ? 'wish' : null);
  };

  const goToWishlist = () => {
    setActiveToast(null);
    onClose();
    navigate('/mypage');
  };

  const handleAlertToggle = () => {
    setIsAlertEnabled((current) => {
      const nextValue = !current;
      setActiveToast(nextValue ? 'alert' : null);

      return nextValue;
    });
  };

  const goToAlertSettings = () => {
    setActiveToast(null);
    onClose();
    navigate('/mypage');
  };

  const handleCompareAdd = () => {
    addPriceCompareProduct(visibleProduct);
    setActiveToast('compare');
  };

  const goToPriceCompare = () => {
    setActiveToast(null);
    onClose();
    onOpenPriceCompare?.(visibleProduct);
  };

  const openChatbot = () => {
    onClose();
    onOpenChatbot?.();
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-5 py-8 ${hairline.modalOverlay}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[calc(100vh-72px)] w-full max-w-[1480px] overflow-hidden rounded-[24px] ${hairline.panel}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="상품 상세 팝업 닫기"
          onClick={onClose}
          className={`absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full text-gray-900 ${hairline.secondaryButton} ${hairline.focus}`}
        >
          <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        </button>

        <div className="transient-scrollbar grid max-h-[calc(100vh-72px)] grid-cols-1 items-stretch overflow-y-auto lg:grid-cols-2">
          <div className="flex h-full flex-col border-b border-[#C9CFDA] p-6 lg:min-h-[760px] lg:border-b-0 lg:border-r lg:p-7">
            <div className={`relative h-[58vh] min-h-[520px] max-h-[670px] overflow-hidden rounded-[20px] ${hairline.image}`}>
              <span className={`absolute left-6 top-6 z-20 px-5 py-2.5 text-base ${hairline.status}`}>
                {visibleProduct.status}
              </span>

              {hasMultipleImages ? (
                <>
                  <div className="absolute -left-16 top-10 bottom-10 w-28 overflow-hidden rounded-[18px] opacity-60">
                    <ProductVisual
                      imageUrl={previousImageUrl}
                      name={visibleProduct.name}
                      variant="thumb"
                      isMuted
                    />
                  </div>
                  <div className="absolute -right-16 top-10 bottom-10 w-28 overflow-hidden rounded-[18px] opacity-60">
                    <ProductVisual
                      imageUrl={nextImageUrl}
                      name={visibleProduct.name}
                      variant="thumb"
                      isMuted
                    />
                  </div>
                </>
              ) : null}

              <div
                key={`${activeImageIndex}-${activeImageUrl ?? 'fallback'}`}
                className="h-full animate-image-slide"
              >
                <ProductVisual
                  imageUrl={activeImageUrl}
                  name={visibleProduct.name}
                  variant="modal"
                />
              </div>

              {hasMultipleImages ? (
                <>
                  <button
                    type="button"
                    aria-label="이전 상품 이미지"
                    onClick={() => moveImage('prev')}
                    className={`absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95 ${hairline.primaryButton} focus:outline-none focus:ring-2 focus:ring-white`}
                  >
                    <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="다음 상품 이미지"
                    onClick={() => moveImage('next')}
                    className={`absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition duration-200 hover:scale-105 active:scale-95 ${hairline.primaryButton} focus:outline-none focus:ring-2 focus:ring-white`}
                  >
                    <ChevronRight className="h-6 w-6" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-auto pt-4">
              <div className="transient-scrollbar flex gap-3 overflow-x-auto pb-1">
                {visibleProduct.images.map((imageId, index) => (
                  <button
                    type="button"
                    key={`${imageId}-${index}`}
                    aria-label={`${index + 1}번 상품 이미지 보기`}
                    onClick={() => selectImage(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-[#F5F5F7] transition focus:outline-none focus:ring-2 focus:ring-black ${
                      index === activeImageIndex
                        ? 'border-black shadow-sm'
                        : 'border-[#C9CFDA] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ProductVisual
                      imageUrl={resolveImageUrl(imageId)}
                      name={`${visibleProduct.name} 썸네일 ${index + 1}`}
                      variant="thumb"
                    />
                  </button>
                ))}
              </div>

              <a
                href={visibleProduct.link}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex h-16 w-full items-center justify-center gap-2.5 rounded-xl border border-emerald-600/20 bg-emerald-600 px-5 text-lg font-black text-white shadow-[0_10px_24px_rgba(5,150,105,0.14)] transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
              >
                {visibleProduct.platform}에서 보기
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="flex h-full min-h-[760px] flex-col p-6 lg:p-7">
            <div className="pr-20">
              <h2
                id={titleId}
                className="text-2xl font-black leading-snug tracking-tight text-gray-950"
              >
                {visibleProduct.name}
              </h2>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <p className="text-3xl font-black tracking-tight text-blue-600">
                  {formatWon(visibleProduct.price)}
                </p>
                <span className="mb-1 rounded-full bg-gray-100 px-3.5 py-1.5 text-sm font-bold text-[#86868B]">
                  {formatWrittenDate(visibleProduct.date)} 작성
                </span>
              </div>
            </div>

            <div className="mt-7">
              <h3 className="text-base font-black tracking-tight text-gray-900">
                상품 설명
              </h3>
              <div
                className={`mt-3 rounded-2xl border border-transparent pr-1 ${
                  isDescriptionExpanded
                    ? 'transient-scrollbar max-h-44 overflow-y-auto border-[#D9DEE7]/75 bg-white/58 px-4 py-3'
                    : ''
                }`}
              >
                <p className="break-words text-[16px] font-semibold leading-7 text-gray-700">
                  {visibleDescriptionText}
                </p>
              </div>
              {canExpandDescription ? (
                <button
                  type="button"
                  onClick={() => setIsDescriptionExpanded((current) => !current)}
                  className={`mt-2 text-sm font-black text-[#626873] underline decoration-[#C9CFDA] underline-offset-4 transition-colors hover:text-gray-950 ${hairline.focus}`}
                >
                  {isDescriptionExpanded ? '접기' : '더보기'}
                </button>
              ) : null}
            </div>

            <div className="mt-9">
              <PriceInsightChart
                points={visibleProduct.priceHistory}
                keywordOptions={insightKeywords}
              />
            </div>

            <div className="mt-auto pt-8">
              <div className="h-px w-full bg-[#C9CFDA]" />
              <div className="mt-5 grid grid-cols-[1fr_64px_64px_64px] gap-3">
                <button
                  type="button"
                  onClick={handleCompareAdd}
                  className={`inline-flex h-16 min-h-16 items-center justify-center gap-2.5 rounded-xl px-5 text-lg font-black transition ${hairline.primaryButton} ${hairline.focus}`}
                >
                  <ShoppingBasket className="h-5 w-5" aria-hidden="true" />
                  가격 비교 리스트에 추가
                </button>
                <button
                  type="button"
                  aria-label={isWished ? '찜 해제하기' : '찜하기'}
                  onClick={handleWishToggle}
                  className={`inline-flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-xl border text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-rose-300 focus:ring-offset-2 ${
                    isWished
                      ? 'border-rose-300 bg-rose-50 text-rose-600'
                      : 'border-[#C9CFDA] bg-white text-rose-500 hover:bg-rose-50'
                  }`}
                  aria-pressed={isWished}
                >
                  <Heart
                    className={isWished ? 'h-6 w-6 fill-current' : 'h-6 w-6'}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  aria-label="챗봇으로 상품 문의하기"
                  onClick={openChatbot}
                  className={`inline-flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-xl border border-[#C9CFDA] bg-white text-gray-950 transition hover:border-[#AEB6C2] hover:bg-[#FDFDFE] ${hairline.focus}`}
                >
                  <Bot className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={isAlertEnabled ? '알림 해제하기' : '알림 설정하기'}
                  onClick={handleAlertToggle}
                  className={`inline-flex h-16 min-h-16 w-16 min-w-16 items-center justify-center rounded-xl border text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 ${
                    isAlertEnabled
                      ? 'border-amber-300 bg-amber-50 text-amber-600'
                      : 'border-[#C9CFDA] bg-white text-amber-500 hover:bg-amber-50'
                  }`}
                  aria-pressed={isAlertEnabled}
                >
                  <Bell
                    className={isAlertEnabled ? 'h-6 w-6 fill-current' : 'h-6 w-6'}
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {activeToast ? (
        <ActionToast
          type={activeToast}
          onClose={() => setActiveToast(null)}
          onAction={
            activeToast === 'wish'
              ? goToWishlist
              : activeToast === 'alert'
                ? goToAlertSettings
                : goToPriceCompare
          }
        />
      ) : null}
    </div>
  );
}

function ActionToast({
  type,
  onClose,
  onAction,
}: {
  type: 'wish' | 'alert' | 'compare';
  onClose: () => void;
  onAction: () => void;
}) {
  const isWish = type === 'wish';
  const isCompare = type === 'compare';
  const Icon = isWish ? Heart : isCompare ? ShoppingBasket : Bell;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseDown={(event) => event.stopPropagation()}
      className={`fixed bottom-8 left-1/2 z-[140] flex w-[min(540px,calc(100vw-48px))] -translate-x-1/2 items-center justify-between gap-4 rounded-2xl px-5 py-4 ${hairline.panel}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isWish
              ? 'bg-rose-50 text-rose-500'
              : isCompare
                ? 'bg-[#F3F4F6] text-gray-950'
                : 'bg-amber-50 text-amber-500'
          }`}
        >
          <Icon className="h-5 w-5 fill-current" aria-hidden="true" />
        </span>
        <p className="truncate text-base font-black text-gray-900">
          {isWish
            ? '찜 목록에 추가되었습니다'
            : isCompare
              ? '추가되었습니다!'
              : '가격 알림이 설정되었습니다'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onAction}
          className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${hairline.primaryButton} ${hairline.focus}`}
        >
          {isWish ? '보러가기' : isCompare ? '바로가기 >' : '알림 보기'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[#9AA2AF] transition hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
          aria-label="알림 메시지 닫기"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function buildInsightKeywords(product: Product) {
  const keywords = [
    product.category,
    ...product.name
      .split(/[^0-9A-Za-z가-힣]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  ];

  return Array.from(new Set(keywords.filter(Boolean))).slice(0, 4);
}

function getProductKey(product: Product | null): string {
  return product ? `${product.platform}:${product.pid}` : '';
}

function resolveImageUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.startsWith('http') || value.startsWith('/') ? value : null;
}

function formatWrittenDate(value: string): string {
  const cleanedDate = value.replace(/\s*최신$/, '').trim();
  const hasTime = /\d{2}:\d{2}/.test(cleanedDate);

  return hasTime ? cleanedDate : `${cleanedDate} 14:30`;
}
