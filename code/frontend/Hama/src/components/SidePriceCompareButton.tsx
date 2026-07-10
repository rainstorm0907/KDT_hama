import { Scale } from 'lucide-react';
import { sideButtonClass } from './sideButtonStyles';

type SidePriceCompareButtonProps = {
  onOpen: () => void;
};

export function SidePriceCompareButton({ onOpen }: SidePriceCompareButtonProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className={sideButtonClass}
        aria-label="가격 비교 열기"
      >
        <Scale className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  );
}
