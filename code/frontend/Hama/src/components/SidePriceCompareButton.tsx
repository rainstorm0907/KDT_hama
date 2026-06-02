import { Scale } from 'lucide-react';
import { hairline } from '../styles/hairline';

type SidePriceCompareButtonProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function SidePriceCompareButton({
  isOpen,
  onToggle,
}: SidePriceCompareButtonProps) {
  return (
    <div className="relative">
      <div
        className={`fixed bottom-5 right-[calc(1.25rem+4rem+0.75rem)] w-[min(414px,calc(100vw-7rem))] rounded-[24px] px-5 py-4 text-left transition-all duration-200 ease-out md:bottom-6 md:right-[calc(1.5rem+72px+1rem)] ${hairline.panel} ${
          isOpen
            ? 'pointer-events-auto translate-x-0 scale-100 opacity-100'
            : 'pointer-events-none translate-x-3 scale-95 opacity-0'
        }`}
        aria-hidden={!isOpen}
      >
        <p className="text-base font-black text-gray-950">가격 비교</p>
        <p className={`mt-1 text-sm font-bold ${hairline.quietText}`}>
          상품 비교 패널을 연결할 자리입니다.
        </p>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`flex h-16 w-16 items-center justify-center rounded-full text-gray-950 ring-1 ring-[#1D1D1F]/75 transition-all duration-200 active:scale-95 md:h-[72px] md:w-[72px] ${hairline.panel} ${hairline.focus}`}
        aria-label="가격 비교 열기"
        aria-expanded={isOpen}
      >
        <Scale className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}
