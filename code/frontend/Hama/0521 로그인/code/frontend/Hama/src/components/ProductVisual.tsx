import { Image as ImageIcon, Smartphone } from 'lucide-react';

type ProductVisualProps = {
  imageUrl: string | null;
  name: string;
  variant?: 'card' | 'modal' | 'thumb';
  isMuted?: boolean;
};

export function ProductVisual({
  imageUrl,
  name,
  variant = 'card',
  isMuted = false,
}: ProductVisualProps) {
  const variantClass = {
    card: 'aspect-[4/3]',
    modal: 'h-full min-h-[420px]',
    thumb: 'h-full min-h-0',
  }[variant];

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`w-full ${variantClass} object-cover bg-[#F5F5F7] ${
          isMuted ? 'opacity-60 blur-[1px]' : ''
        }`}
      />
    );
  }

  return (
    <div
      className={`relative w-full ${variantClass} overflow-hidden bg-[radial-gradient(circle_at_28%_18%,#ffffff_0,#f3f4f6_35%,#e8eaee_100%)] flex items-center justify-center ${
        isMuted ? 'opacity-50 blur-[1.5px]' : ''
      }`}
      aria-label={`${name} 이미지 대체 UI`}
    >
      <div className="absolute inset-x-8 top-10 h-20 rounded-full bg-white/70 blur-3xl" />
      <div className="relative flex items-center justify-center">
        <div className="absolute h-48 w-32 rounded-[2rem] bg-black/10 blur-xl translate-y-6" />
        <div className="relative h-56 w-36 rounded-[2rem] bg-[#1D1D1F] p-2 shadow-2xl">
          <div className="h-full w-full rounded-[1.55rem] bg-gradient-to-br from-[#F8FAFC] via-[#DDE3EA] to-[#9AA6B2] flex items-center justify-center">
            <Smartphone
              className="w-16 h-16 text-white/80"
              strokeWidth={1.2}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <ImageIcon
        className="absolute bottom-5 right-5 w-5 h-5 text-gray-300"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </div>
  );
}
