import { ChevronLeft, ChevronRight } from 'lucide-react';
import { hairline } from '../styles/hairline';

export function Banner() {
  return (
    <section aria-label="프로모션 배너" className="w-full">
      <div className="max-w-[1440px] mx-auto px-6 relative flex items-center justify-center group">
        <button
          aria-label="이전 배너"
          className={`absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 ${hairline.secondaryButton} ${hairline.focus}`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-800" aria-hidden="true" />
        </button>

        <div className={`relative mx-auto aspect-[21/9] w-full max-w-[1300px] overflow-hidden rounded-[30px] ${hairline.panel}`}>
          <img
            src="/hama_lowban1.jpg"
            alt="밝은 인테리어 공간 속 중고 상품 추천 배너"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.68)_38%,rgba(255,255,255,0.18)_70%,rgba(255,255,255,0)_100%)]" />
          <div className="pointer-events-none absolute inset-[1px] rounded-[29px] ring-1 ring-white/60" />
          <div className="relative h-full flex flex-col justify-center px-10 md:px-20">
            <p className="text-xs md:text-sm font-medium tracking-[0.24em] text-[#4B5154]/70">
              NEW COLLECTION
            </p>
            <h2 className="mt-5 max-w-2xl whitespace-pre-line text-[31px] md:text-[52px] font-bold leading-[1.1] tracking-[-0.025em] text-[#303437]/90">
              취향을 담은 공간,{'\n'}스타일을 아는 사람들의 선택
            </h2>
            <a
              href="#products"
              className={`mt-7 inline-flex w-fit items-center rounded-full px-4 py-2 text-sm font-bold tracking-[-0.01em] md:text-base ${hairline.secondaryButton} ${hairline.focusWide}`}
            >
              지금 주목받는 오브제 확인하기 &gt;
            </a>
          </div>
          <div className="absolute bottom-5 right-5 rounded-full bg-[#303437]/35 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
            1 / 4 &gt;
          </div>
        </div>

        <button
          aria-label="다음 배너"
          className={`absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 ${hairline.secondaryButton} ${hairline.focus}`}
        >
          <ChevronRight className="w-6 h-6 text-gray-800" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
