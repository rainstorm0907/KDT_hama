import { Scale } from 'lucide-react';
import { hairline } from '../styles/hairline';

type SidePriceCompareButtonProps = {
  onOpen: () => void;
};

export function SidePriceCompareButton({ onOpen }: SidePriceCompareButtonProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className={`flex h-16 w-16 items-center justify-center rounded-full text-gray-950 ring-1 ring-[#1D1D1F]/75 transition-all duration-200 active:scale-95 md:h-[72px] md:w-[72px] ${hairline.panel} ${hairline.focus}`}
        aria-label="가격 비교 열기"
      >
        <Scale className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}
