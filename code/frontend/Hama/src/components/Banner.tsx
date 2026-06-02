import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hairline } from '../styles/hairline';

type BannerAction = 'randomSearch' | 'focusSearch' | 'scrollProducts' | 'openMypage';

type BannerItem = {
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  buttonLabel: string;
  action: BannerAction;
  overlayClass: string;
  contentClass: string;
  textToneClass?: string;
};

const objectSearchKeywords = [
  '의자',
  '책상',
  '소파',
  '조명',
  '선반',
  '러그',
  '화분',
  '스피커',
];

const bannerItems: BannerItem[] = [
  {
    image: '/hama_ban1.jpg',
    alt: '밝은 공간과 선반 위 생활 오브제가 있는 배너',
    eyebrow: 'NEW COLLECTION',
    title: '취향을 담은 공간,\n스타일을 아는 사람들의 선택',
    buttonLabel: '지금 주목받는 아이템 확인하기 >',
    action: 'randomSearch',
    overlayClass:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0.3)_42%,rgba(255,255,255,0)_78%)]',
    contentClass: 'items-start text-left',
    textToneClass: 'text-[#444A4E]/95',
  },
  {
    image: '/hama_ban2.jpg',
    alt: '전자기기들이 놓인 상품 검색 배너',
    eyebrow: 'PRICE CHECK',
    title: '같은 상품,\n다른 가격의 기준',
    buttonLabel: '상품 검색하기 >',
    action: 'focusSearch',
    overlayClass:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.24)_44%,rgba(255,255,255,0)_78%)]',
    contentClass: 'items-start text-left',
  },
  {
    image: '/hama_ban3.jpg',
    alt: '신발과 헤드폰, 니트가 놓인 스타일 상품 배너',
    eyebrow: 'STYLE PICKS',
    title: '지금 눈에 들어온\n중고의 흐름',
    buttonLabel: '상품 둘러보기 >',
    action: 'scrollProducts',
    overlayClass:
      'bg-[linear-gradient(270deg,rgba(238,242,246,0.5)_0%,rgba(238,242,246,0.22)_42%,rgba(238,242,246,0)_74%)]',
    contentClass: 'items-end text-right',
    textToneClass: 'text-[#252A30]',
  },
  {
    image: '/hama_ban4.jpg',
    alt: '가방과 니트, 알림 오브제가 놓인 관심 상품 배너',
    eyebrow: 'WISH & ALERT',
    title: '관심 상품의 변화를\n놓치지 않게',
    buttonLabel: '알림 확인하기 >',
    action: 'openMypage',
    overlayClass:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.23)_45%,rgba(255,255,255,0)_78%)]',
    contentClass: 'items-start text-left',
  },
];

export function Banner() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'previous'>('next');
  const activeBanner = bannerItems[activeIndex];
  const titleColorClass = activeBanner.textToneClass ?? 'text-[#303437]/90';

  const showPreviousBanner = () => {
    setSlideDirection('previous');
    setActiveIndex((current) =>
      current === 0 ? bannerItems.length - 1 : current - 1
    );
  };

  const showNextBanner = () => {
    setSlideDirection('next');
    setActiveIndex((current) => (current + 1) % bannerItems.length);
  };

  const handleBannerAction = () => {
    if (activeBanner.action === 'randomSearch') {
      const randomKeyword =
        objectSearchKeywords[
          Math.floor(Math.random() * objectSearchKeywords.length)
        ];

      navigate(`/search?q=${encodeURIComponent(randomKeyword)}`);
      return;
    }

    if (activeBanner.action === 'focusSearch') {
      const searchInput = document.getElementById('main-search');

      searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => searchInput?.focus(), 240);
      return;
    }

    if (activeBanner.action === 'scrollProducts') {
      document
        .getElementById('products')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigate('/mypage');
  };

  return (
    <section aria-label="프로모션 배너" className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 relative flex items-center justify-center group">
        <button
          type="button"
          aria-label="이전 배너"
          onClick={showPreviousBanner}
          className={`absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 ${hairline.secondaryButton} ${hairline.focus}`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" aria-hidden="true" />
        </button>

        <div className={`relative mx-auto aspect-[21/9] w-full max-w-[1300px] overflow-hidden rounded-[30px] ${hairline.panel}`}>
          <div
            key={activeBanner.image}
            className={`absolute inset-0 ${
              slideDirection === 'next'
                ? 'animate-hama-banner-slide-next'
                : 'animate-hama-banner-slide-previous'
            }`}
          >
          <img
            src={activeBanner.image}
            alt={activeBanner.alt}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className={`absolute inset-0 ${activeBanner.overlayClass}`} />
          </div>
          <div className="pointer-events-none absolute inset-[1px] rounded-[29px] ring-1 ring-white/60" />
          <div
            key={`${activeBanner.image}:copy`}
            className={`relative flex h-full flex-col justify-center px-10 md:px-20 ${
              slideDirection === 'next'
                ? 'animate-hama-banner-copy-next'
                : 'animate-hama-banner-copy-previous'
            } ${activeBanner.contentClass}`}
          >
            <p className="text-xs md:text-sm font-medium tracking-[0.24em] text-[#4B5154]/72 drop-shadow-[0_1px_8px_rgba(255,255,255,0.6)]">
              {activeBanner.eyebrow}
            </p>
            <h2 className={`mt-5 max-w-2xl whitespace-pre-line text-[31px] md:text-[52px] font-bold leading-[1.1] tracking-[-0.025em] drop-shadow-[0_2px_16px_rgba(255,255,255,0.72)] ${titleColorClass}`}>
              {activeBanner.title}
            </h2>
            <button
              type="button"
              onClick={handleBannerAction}
              className={`mt-7 inline-flex w-fit items-center rounded-full border border-[#9EA7B3]/80 bg-[#E3E8EF]/92 px-4 py-2 text-sm font-bold tracking-[-0.01em] text-[#252A30] shadow-[0_12px_26px_rgba(29,29,31,0.16),inset_0_1px_0_rgba(255,255,255,0.78),inset_0_-1px_0_rgba(122,130,142,0.16)] backdrop-blur-md transition-colors hover:border-[#7E8794] hover:bg-[#D8DEE7] md:text-base ${hairline.focusWide}`}
            >
              {activeBanner.buttonLabel}
            </button>
          </div>
          <div className="absolute bottom-5 right-5 rounded-full bg-[#303437]/35 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
            {activeIndex + 1} / {bannerItems.length} &gt;
          </div>
        </div>

        <button
          type="button"
          aria-label="다음 배너"
          onClick={showNextBanner}
          className={`absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 ${hairline.secondaryButton} ${hairline.focus}`}
        >
          <ChevronRight className="w-6 h-6 text-gray-800" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
