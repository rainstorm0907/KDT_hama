import { useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import { PriceCompareWorkspace } from './PriceCompareWorkspace';
import { useModalScrollLock } from '../hooks/useModalScrollLock';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';

type PriceCompareModalProps = {
  isOpen: boolean;
  initialProduct: Product | null;
  onClose: () => void;
};

export function PriceCompareModal({
  isOpen,
  initialProduct,
  onClose,
}: PriceCompareModalProps) {
  useModalScrollLock(isOpen);

  useLayoutEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-[100] ${hairline.modalOverlay}`}
        role="presentation"
        onMouseDown={onClose}
      />
      <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center px-4 py-5">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="가격 비교"
          className={`pointer-events-auto relative max-h-[calc(100vh-40px)] w-full max-w-[1760px] overflow-hidden rounded-[24px] ${hairline.panel}`}
        >
        <button
          type="button"
          aria-label="가격 비교 팝업 닫기"
          onClick={onClose}
          className={`absolute right-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full text-gray-900 ${hairline.secondaryButton} ${hairline.focus}`}
        >
          <X className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
        </button>
        <div className="transient-scrollbar max-h-[calc(100vh-40px)] overflow-y-auto p-6 pr-7 lg:p-8 lg:pr-9">
          <PriceCompareWorkspace
            key={initialProduct ? `${initialProduct.platform}:${initialProduct.pid}` : 'empty'}
            initialProduct={initialProduct}
          />
        </div>
        </section>
      </div>
    </>
  );
}
