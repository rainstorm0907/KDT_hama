import { ShoppingBag, Zap } from 'lucide-react';
import { hairline } from '../styles/hairline';

export type PlatformName = '번개장터' | '중고나라';

type PlatformPillProps = {
  platform: PlatformName | string;
  isActive?: boolean;
  size?: 'filter' | 'card';
};

export function PlatformPill({
  platform,
  isActive = false,
  size = 'filter',
}: PlatformPillProps) {
  const isBunjang = platform === '번개장터';
  const Icon = isBunjang ? Zap : ShoppingBag;
  const markClass = isBunjang
    ? 'bg-red-50 text-red-600'
    : 'bg-orange-50 text-orange-600';

  const sizeClass =
    size === 'card'
      ? 'h-8 gap-1.5 rounded-full px-2.5 text-[11px]'
      : 'h-12 gap-2.5 rounded-[18px] px-5 text-sm';

  const iconSizeClass = size === 'card' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const markSizeClass = size === 'card' ? 'h-[18px] w-[18px]' : 'h-5 w-5';

  return (
    <span
      className={`inline-flex items-center font-black transition-colors ${sizeClass} ${
        isActive
          ? hairline.controlActive
          : `${hairline.control} ${size === 'filter' ? hairline.controlHover : ''}`
      } ${size === 'card' ? 'opacity-70' : ''}`}
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-md ${markClass} ${markSizeClass}`}
      >
        <Icon
          className={`${iconSizeClass} ${isBunjang ? 'fill-current' : ''}`}
          aria-hidden="true"
        />
      </span>
      {platform}
    </span>
  );
}
