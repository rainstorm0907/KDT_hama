import { RefreshCcw } from 'lucide-react';
import { hairline } from '../styles/hairline';

type RefreshProductsButtonProps = {
  isLoading: boolean;
  onRefresh: () => void;
  updatedAt?: string;
};

export function RefreshProductsButton({
  isLoading,
  onRefresh,
  updatedAt,
}: RefreshProductsButtonProps) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className={`inline-flex h-9 items-center justify-center gap-2 rounded-full px-3.5 text-sm font-black text-[#626873] transition-colors hover:bg-white/64 hover:text-[#1D1D1F] disabled:cursor-wait disabled:opacity-70 ${hairline.focus}`}
      >
        <RefreshCcw
          className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        새로고침
      </button>
      {updatedAt ? (
        <span className={`text-xs font-black ${hairline.quietText}`}>
          업데이트 {updatedAt}
        </span>
      ) : null}
    </div>
  );
}
