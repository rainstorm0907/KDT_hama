import { Clock, Search } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { categories } from '../data/categories';
import { products } from '../data/mockProducts';
import { formatWon } from '../utils/format';
import { ProductVisual } from '../components/ProductVisual';

type DesignVariant = 'a' | 'b' | 'c' | 'd' | 'ac' | 'final';

type PreviewStyle = {
  title: string;
  shell: string;
  search: string;
  banner: string;
  bannerOverlay: string;
  categoryWrap: string;
  categoryActive: string;
  categoryIdle: string;
  productCard: string;
  productImage: string;
  productMeta: string;
  productTitle: string;
  productPrice: string;
  showMetrics?: boolean;
};

const variants: Array<{ id: DesignVariant; label: string; title: string }> = [
  { id: 'a', label: 'A', title: 'Soft Liquid Commerce' },
  { id: 'b', label: 'B', title: 'Editorial Lines' },
  { id: 'c', label: 'C', title: 'Precision Surface' },
  { id: 'd', label: 'D', title: 'Black Shelf Detail' },
  { id: 'ac', label: 'A+C', title: 'Liquid + Insight Detail' },
  { id: 'final', label: 'FINAL', title: 'Quiet Liquid Winner' },
];

const previewStyles: Record<DesignVariant, PreviewStyle> = {
  a: {
    title: 'Soft Liquid Commerce',
    shell:
      'bg-[radial-gradient(circle_at_50%_0%,#ffffff_0,#f7f7f8_42%,#f1f1f3_100%)]',
    search:
      'border-white/80 bg-white/72 shadow-[0_12px_40px_rgba(0,0,0,0.045),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl',
    banner:
      'border border-white/80 bg-white/35 shadow-[0_18px_60px_rgba(29,29,31,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[2px]',
    bannerOverlay:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.68)_38%,rgba(255,255,255,0.18)_70%,rgba(255,255,255,0)_100%)]',
    categoryWrap:
      'border border-white/70 bg-white/45 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.045)] backdrop-blur-xl',
    categoryActive: 'bg-[#1D1D1F] text-white shadow-xl',
    categoryIdle: 'text-black/42 hover:bg-white/70 hover:text-black',
    productCard:
      'border border-white/70 bg-white/62 shadow-[0_18px_50px_rgba(0,0,0,0.055)] backdrop-blur-xl',
    productImage: 'bg-white/50',
    productMeta: 'text-black/35',
    productTitle: 'text-[#202124]',
    productPrice: 'text-[#202124]',
  },
  b: {
    title: 'Editorial Lines',
    shell: 'bg-[#F8F8F7]',
    search:
      'border-white/70 bg-white/58 shadow-[0_10px_34px_rgba(0,0,0,0.035),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl',
    banner:
      'border-y border-black/[0.08] bg-white shadow-none rounded-[8px]',
    bannerOverlay:
      'bg-[linear-gradient(90deg,rgba(248,248,247,0.9)_0%,rgba(248,248,247,0.55)_40%,rgba(248,248,247,0.08)_74%,rgba(248,248,247,0)_100%)]',
    categoryWrap:
      'border-y border-black/[0.08] bg-transparent p-0 shadow-none',
    categoryActive:
      'border-b-2 border-black bg-transparent text-black rounded-none',
    categoryIdle:
      'border-b-2 border-transparent text-black/42 hover:text-black rounded-none',
    productCard: 'border-t border-black/[0.1] bg-transparent shadow-none rounded-none',
    productImage: 'bg-white',
    productMeta: 'text-black/35 tracking-[0.22em]',
    productTitle: 'text-[#202124]',
    productPrice: 'text-[#202124]',
  },
  c: {
    title: 'Precision Surface',
    shell:
      'bg-[linear-gradient(#f7f7f8_0_0),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]',
    search:
      'border-white/70 bg-white/72 shadow-[0_12px_36px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.88)] backdrop-blur-xl',
    banner:
      'border border-black/[0.08] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.04)]',
    bannerOverlay:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.66)_40%,rgba(255,255,255,0.12)_76%,rgba(255,255,255,0)_100%)]',
    categoryWrap:
      'border border-black/[0.06] bg-white/80 p-3 shadow-[0_10px_34px_rgba(0,0,0,0.035)]',
    categoryActive: 'bg-black text-white shadow-none',
    categoryIdle: 'text-black/45 hover:bg-black/[0.035] hover:text-black',
    productCard: 'border border-black/[0.06] bg-white shadow-none',
    productImage: 'bg-[#F4F4F5]',
    productMeta: 'text-black/38',
    productTitle: 'text-[#202124]',
    productPrice: 'text-[#202124]',
    showMetrics: true,
  },
  d: {
    title: 'Black Shelf Detail',
    shell: 'bg-[#F7F7F8]',
    search:
      'border-white/70 bg-white/68 shadow-[0_12px_36px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-xl',
    banner:
      'border border-black bg-[#111] shadow-[0_24px_70px_rgba(0,0,0,0.14)]',
    bannerOverlay:
      'bg-[linear-gradient(90deg,rgba(17,17,17,0.92)_0%,rgba(17,17,17,0.66)_40%,rgba(17,17,17,0.08)_74%,rgba(17,17,17,0)_100%)]',
    categoryWrap: 'bg-[#111] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)]',
    categoryActive: 'bg-white text-black shadow-xl',
    categoryIdle:
      'border border-white/10 bg-white/[0.055] text-white/58 hover:bg-white/[0.1] hover:text-white',
    productCard: 'border border-black/[0.08] bg-white shadow-[0_12px_34px_rgba(0,0,0,0.05)]',
    productImage: 'bg-[#EFEFF1]',
    productMeta: 'text-black/35',
    productTitle: 'text-[#111]',
    productPrice: 'text-[#111]',
  },
  ac: {
    title: 'Liquid + Insight Detail',
    shell:
      'bg-[radial-gradient(circle_at_50%_0%,#ffffff_0,#f7f7f8_42%,#f1f1f3_100%)]',
    search:
      'border-white/80 bg-white/72 shadow-[0_12px_40px_rgba(0,0,0,0.045),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl',
    banner:
      'border border-white/80 bg-white/35 shadow-[0_18px_60px_rgba(29,29,31,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[2px]',
    bannerOverlay:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.68)_38%,rgba(255,255,255,0.18)_70%,rgba(255,255,255,0)_100%)]',
    categoryWrap:
      'border border-white/70 bg-white/45 p-4 shadow-[0_16px_50px_rgba(0,0,0,0.045)] backdrop-blur-xl',
    categoryActive: 'bg-[#1D1D1F] text-white shadow-xl',
    categoryIdle: 'text-black/42 hover:bg-white/70 hover:text-black',
    productCard:
      'border border-white/70 bg-white/62 shadow-[0_18px_50px_rgba(0,0,0,0.055)] backdrop-blur-xl',
    productImage: 'bg-white/50',
    productMeta: 'text-black/35',
    productTitle: 'text-[#202124]',
    productPrice: 'text-[#202124]',
    showMetrics: true,
  },
  final: {
    title: 'Quiet Liquid Winner',
    shell:
      'bg-[linear-gradient(180deg,#fbfbfb_0%,#f5f5f6_34%,#f7f7f8_100%)]',
    search:
      'border-white/85 bg-white/70 shadow-[0_18px_52px_rgba(29,29,31,0.055),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(0,0,0,0.025)] backdrop-blur-2xl',
    banner:
      'border border-white/80 bg-white/35 shadow-[0_18px_60px_rgba(29,29,31,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[2px]',
    bannerOverlay:
      'bg-[linear-gradient(90deg,rgba(255,255,255,0.91)_0%,rgba(255,255,255,0.68)_38%,rgba(255,255,255,0.18)_70%,rgba(255,255,255,0)_100%)]',
    categoryWrap:
      'border border-white/75 bg-white/46 p-4 shadow-[0_22px_64px_rgba(29,29,31,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl',
    categoryActive:
      'border border-white/85 bg-white/64 text-[#1D1D1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]',
    categoryIdle:
      'border border-transparent text-black/42 hover:border-white/70 hover:bg-white/52 hover:text-black',
    productCard:
      'border border-white/75 bg-white/66 shadow-[0_18px_56px_rgba(29,29,31,0.055),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-xl',
    productImage: 'bg-white/58',
    productMeta: 'text-black/35',
    productTitle: 'text-[#202124]',
    productPrice: 'text-[#202124]',
  },
};

export function DesignPreviewPage() {
  const { variant } = useParams();

  if (!isDesignVariant(variant)) {
    return <Navigate to="/design/final" replace />;
  }

  const style = previewStyles[variant];

  return (
    <main className={`relative flex-1 overflow-hidden pb-24 ${style.shell}`}>
      <PreviewNav activeVariant={variant} title={style.title} />
      <div className="flex flex-col gap-14 pb-24 md:gap-16">
        <PreviewSearch style={style} />
        <PreviewBanner style={style} variant={variant} />
        {style.showMetrics ? <MetricStrip variant={variant} /> : null}
        <PreviewCategories style={style} variant={variant} />
        <PreviewProducts style={style} variant={variant} />
      </div>
    </main>
  );
}

function PreviewNav({
  activeVariant,
  title,
}: {
  activeVariant: DesignVariant;
  title: string;
}) {
  return (
    <nav
      aria-label="디자인 초안 선택"
      className="sticky top-20 z-40 border-b border-white/55 bg-[#f4f4f5]/74 shadow-[0_12px_34px_rgba(29,29,31,0.035),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl"
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-8 py-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-black/38">
            SAME LAYOUT PREVIEW
          </p>
          <h1 className="mt-1 text-lg font-black tracking-[-0.03em] text-[#202124]">
            {title}
          </h1>
        </div>
        <div className="flex gap-2">
          {variants.map((item) => (
            <Link
              key={item.id}
              to={`/design/${item.id}`}
              className={`inline-flex h-10 min-w-12 items-center justify-center rounded-full border px-4 text-sm font-black transition ${
                activeVariant === item.id
                  ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white shadow-[0_8px_22px_rgba(0,0,0,0.12)]'
                  : 'border-white/65 bg-white/58 text-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:text-black'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function PreviewSearch({ style }: { style: PreviewStyle }) {
  return (
    <section role="search" aria-label="상품 검색" className="w-full pt-8 pb-0">
      <div className="mx-auto max-w-[1440px] px-8">
        <div
          className={`mx-auto flex h-16 w-full max-w-3xl items-center rounded-2xl px-6 transition ${style.search}`}
        >
          <Search className="h-5 w-5 text-black/32" aria-hidden="true" />
          <span className="ml-4 text-base font-semibold text-black/42">
            어떤 상품의 최저가를 찾으시나요?
          </span>
          <span className="ml-auto hidden items-center gap-2 rounded-full border border-white/70 bg-white/45 px-3 py-1 text-xs font-bold text-black/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] md:inline-flex">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            최근 검색
          </span>
        </div>
      </div>
    </section>
  );
}

function PreviewBanner({
  style,
  variant,
}: {
  style: PreviewStyle;
  variant: DesignVariant;
}) {
  const isDark = variant === 'd';

  return (
    <section aria-label="프로모션 배너" className="w-full">
      <div className="group relative mx-auto flex max-w-[1440px] items-center justify-center px-6">
        <button
          aria-label="이전 배너"
          className="absolute left-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition active:scale-95"
        >
          ‹
        </button>

        <div
          className={`relative mx-auto aspect-[21/9] w-full max-w-[1300px] overflow-hidden rounded-[32px] ${style.banner}`}
        >
          <img
            src="/hama_lowban1.jpg"
            alt="밝은 인테리어 공간 속 중고 상품 추천 배너"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className={`absolute inset-0 ${style.bannerOverlay}`} />
          <div className="relative flex h-full flex-col justify-center px-10 md:px-20">
            <p
              className={`text-xs font-medium tracking-[0.24em] md:text-sm ${
                isDark ? 'text-white/50' : 'text-[#4B5154]/70'
              }`}
            >
              NEW COLLECTION
            </p>
            <h2
              className={`mt-5 max-w-2xl whitespace-pre-line text-[31px] font-bold leading-[1.1] tracking-[-0.025em] md:text-[52px] ${
                isDark ? 'text-white/88' : 'text-[#303437]/90'
              }`}
            >
              취향을 담은 공간,{'\n'}스타일을 아는 사람들의 선택
            </h2>
            <a
              href="#preview-products"
              className={`mt-7 inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-medium backdrop-blur-sm transition md:text-base ${
                isDark
                  ? 'border-white/15 bg-white/8 text-white/72 hover:bg-white/12'
                  : 'border-[#303437]/15 bg-white/28 text-[#303437]/80 hover:bg-white/45'
              }`}
            >
              지금 주목받는 오브제 확인하기 &gt;
            </a>
          </div>
          <div
            className={`absolute bottom-5 right-5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
              isDark ? 'bg-white/14 text-white/82' : 'bg-[#303437]/35 text-white/90'
            }`}
          >
            1 / 4 &gt;
          </div>
        </div>

        <button
          aria-label="다음 배너"
          className="absolute right-2 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition active:scale-95"
        >
          ›
        </button>
      </div>
    </section>
  );
}

function MetricStrip({ variant }: { variant: DesignVariant }) {
  const metrics = [
    ['수집 매물', '3,835'],
    ['최저가 발견', '128'],
    ['평균 변동', '-3.2%'],
    ['플랫폼', '2곳'],
  ];
  const isLiquid = variant === 'ac' || variant === 'final';

  return (
    <section className="w-full">
      <div className="mx-auto max-w-[1300px] px-6">
        <div
          className={`grid grid-cols-2 overflow-hidden rounded-[24px] md:grid-cols-4 ${
            isLiquid
              ? 'border border-white/70 bg-white/48 shadow-[0_14px_42px_rgba(0,0,0,0.045)] backdrop-blur-xl'
              : 'border border-black/[0.06] bg-white/82 shadow-[0_10px_34px_rgba(0,0,0,0.035)]'
          }`}
        >
          {metrics.map(([label, value]) => (
            <div key={label} className="border-black/[0.06] p-5 md:border-r last:border-r-0">
              <p className="text-xs font-bold tracking-[0.2em] text-black/35">
                {label}
              </p>
              <p className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#202124]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewCategories({
  style,
  variant,
}: {
  style: PreviewStyle;
  variant: DesignVariant;
}) {
  const isEditorial = variant === 'b';

  return (
    <section aria-label="카테고리 선택" className="w-full">
      <div className="mx-auto max-w-[1440px] px-8">
        <div
          className={`mx-auto grid max-w-[1080px] grid-cols-3 gap-4 rounded-[32px] md:grid-cols-6 ${
            isEditorial ? 'gap-12 rounded-none' : ''
          } ${style.categoryWrap}`}
        >
          {categories.slice(0, 6).map((cat, index) => (
            <button
              key={cat.id}
              aria-pressed={index === 2}
              className={`group flex flex-col items-center justify-center rounded-3xl p-8 transition-colors duration-200 ${
                index === 2 ? style.categoryActive : style.categoryIdle
              }`}
            >
              <cat.icon className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
              <span className="mt-4 text-base font-bold tracking-tight">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PreviewProducts({
  style,
  variant,
}: {
  style: PreviewStyle;
  variant: DesignVariant;
}) {
  return (
    <section id="preview-products" aria-label="추천 상품" className="w-full">
      <div className="mx-auto max-w-[1440px] px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-black/32">
              {variants.find((item) => item.id === variant)?.title}
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-900">
              추천 상품
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-white/75 bg-white/56 px-5 py-2.5 text-xs font-semibold text-[#202124] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_8px_22px_rgba(0,0,0,0.035)] backdrop-blur-xl">
              인기순
            </button>
            <button className="rounded-full border border-white/70 bg-white/38 px-5 py-2.5 text-xs font-semibold text-[#86868B] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl">
              최신순
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => (
            <article
              key={product.id}
              className={`group flex h-full flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 ${style.productCard}`}
            >
              <div className={`overflow-hidden ${style.productImage}`}>
                <ProductVisual imageUrl={product.imageUrl} name={product.name} />
              </div>
              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <p
                    className={`text-xs font-medium uppercase tracking-wider ${style.productMeta}`}
                  >
                    {product.brand}
                  </p>
                  <h3
                    className={`mt-2 line-clamp-2 text-base font-bold leading-snug tracking-tight ${style.productTitle}`}
                  >
                    {product.name}
                  </h3>
                </div>
                <div className="mt-5 flex items-end justify-between gap-3">
                  <p className={`text-sm font-bold ${style.productPrice}`}>
                    {formatWon(product.price)}
                  </p>
                  <p className="text-xs font-medium text-[#86868B]">
                    {product.platform}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function isDesignVariant(value: string | undefined): value is DesignVariant {
  return (
    value === 'a' ||
    value === 'b' ||
    value === 'c' ||
    value === 'd' ||
    value === 'ac' ||
    value === 'final'
  );
}
