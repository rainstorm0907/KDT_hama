import { hairline } from '../styles/hairline';

export type SortOption = 'relevance' | 'low-price' | 'recent';

type SortControlsProps = {
  activeSort: SortOption;
  onSortChange: (sort: SortOption) => void;
  labels?: Partial<Record<SortOption, string>>;
  options?: SortOption[];
};

const defaultSortOptions: SortOption[] = ['relevance', 'low-price', 'recent'];

export function SortControls({
  activeSort,
  onSortChange,
  labels = {},
  options = defaultSortOptions,
}: SortControlsProps) {
  return (
    <div className="flex flex-wrap justify-start gap-2 md:justify-end">
      {options.map((option) => {
        const isActive = activeSort === option;
        const label =
          labels[option] ??
          (option === 'relevance'
            ? '정확도순'
            : option === 'low-price'
              ? '낮은 가격순'
              : '최신순');

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSortChange(option)}
            className={`inline-flex h-11 min-w-[112px] items-center justify-center rounded-[18px] px-5 text-sm font-black transition-colors ${hairline.focus} ${
              isActive
                ? hairline.controlActive
                : `${hairline.control} ${hairline.controlHover}`
            } active:border-black active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),0_8px_20px_rgba(29,29,31,0.035)]`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
