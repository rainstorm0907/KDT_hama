import { Check, RefreshCcw, Search, ShoppingBag, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { products } from '../data/mockProducts';
import { formatWon } from '../utils/format';
import { ProductVisual } from '../components/ProductVisual';

type DesignPresetId = 'tinted' | 'shadow' | 'hairline' | 'warm';

type DesignPreset = {
  id: DesignPresetId;
  name: string;
  note: string;
  shell: string;
  header: string;
  surface: string;
  control: string;
  controlActive: string;
  metric: string;
  card: string;
  image: string;
  mutedText: string;
  accent: string;
};

const presets: DesignPreset[] = [
  {
    id: 'tinted',
    name: 'Tinted Liquid',
    note: '흰 배경을 유지하되 버튼과 카드에 선명한 glass edge를 주는 방향',
    shell:
      'bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,#f7f8fa_46%,#eff2f6_100%)]',
    header:
      'border-[#D7DBE3] bg-white/96 shadow-[0_8px_22px_rgba(29,29,31,0.025),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-[3px]',
    surface:
      'border-[#D3D8E2] bg-white/64 shadow-[0_22px_64px_rgba(29,29,31,0.064),inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(0,0,0,0.038)] backdrop-blur-2xl',
    control:
      'border-[#D7DBE3] bg-white/58 text-[#5F6368] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_8px_18px_rgba(29,29,31,0.026)]',
    controlActive:
      'border-[#AEB5C2] bg-white/86 text-[#1D1D1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_10px_22px_rgba(29,29,31,0.058)]',
    metric:
      'border-[#D7DBE3] bg-white/76 shadow-[0_16px_44px_rgba(29,29,31,0.052),inset_0_1px_0_rgba(255,255,255,0.96)]',
    card:
      'border-[#D8DDE6] bg-white/76 shadow-[0_18px_54px_rgba(29,29,31,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]',
    image: 'bg-white/66',
    mutedText: 'text-[#6E7178]',
    accent: 'text-emerald-600',
  },
  {
    id: 'shadow',
    name: 'Soft Depth',
    note: '그림자를 조금 더 쓰되 표면은 깨끗하게 유지하는 커머스형 방향',
    shell:
      'bg-[linear-gradient(180deg,#fbfbfb_0%,#f4f5f7_36%,#eef0f4_100%)]',
    header:
      'border-[#D6DAE2] bg-white/97 shadow-[0_14px_36px_rgba(29,29,31,0.05)]',
    surface:
      'border-[#D4D9E3] bg-white/72 shadow-[0_28px_80px_rgba(29,29,31,0.09),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-xl',
    control:
      'border-[#D5DAE4] bg-white/66 text-[#626873] shadow-[0_8px_22px_rgba(29,29,31,0.04)]',
    controlActive:
      'border-[#A8B0BE] bg-white text-[#111827] shadow-[0_14px_28px_rgba(29,29,31,0.08)]',
    metric:
      'border-[#D4D9E3] bg-white shadow-[0_18px_48px_rgba(29,29,31,0.07)]',
    card:
      'border-[#D8DDE6] bg-white shadow-[0_22px_64px_rgba(29,29,31,0.08)]',
    image: 'bg-[#F5F6F8]',
    mutedText: 'text-[#6B7280]',
    accent: 'text-emerald-600',
  },
  {
    id: 'hairline',
    name: 'Precision Hairline',
    note: '그림자보다 얇은 선과 정보 밀도로 가독성을 올리는 방향',
    shell:
      'bg-[linear-gradient(#f8f9fb_0_0),linear-gradient(90deg,rgba(17,24,39,0.035)_1px,transparent_1px),linear-gradient(rgba(17,24,39,0.035)_1px,transparent_1px)] bg-[size:auto,56px_56px,56px_56px]',
    header:
      'border-[#C9CFDA] bg-white/96 shadow-[0_1px_0_rgba(255,255,255,0.9)]',
    surface:
      'border-[#C6CDD8] bg-white/80 shadow-[0_12px_34px_rgba(29,29,31,0.035),inset_0_1px_0_rgba(255,255,255,0.92)]',
    control:
      'border-[#C9CFDA] bg-white/58 text-[#5F6368]',
    controlActive:
      'border-[#111827] bg-white text-[#111827] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.68)]',
    metric:
      'border-[#C9CFDA] bg-white/86 shadow-[0_10px_28px_rgba(29,29,31,0.035)]',
    card:
      'border-[#C9CFDA] bg-white/86 shadow-[0_12px_32px_rgba(29,29,31,0.04)]',
    image: 'bg-[#F3F4F6]',
    mutedText: 'text-[#626873]',
    accent: 'text-emerald-700',
  },
  {
    id: 'warm',
    name: 'Warm Porcelain',
    note: '완전한 순백 대신 아주 낮은 온도의 웜톤을 깔아 빈 느낌을 줄이는 방향',
    shell:
      'bg-[radial-gradient(circle_at_48%_0%,#ffffff_0%,#faf8f4_46%,#f1f2f3_100%)]',
    header:
      'border-[#DAD5CA] bg-[#fffdf9]/96 shadow-[0_10px_26px_rgba(81,72,55,0.035)] backdrop-blur-[3px]',
    surface:
      'border-[#DAD5CA] bg-[#fffdf9]/72 shadow-[0_24px_70px_rgba(81,72,55,0.07),inset_0_1px_0_rgba(255,255,255,0.94)] backdrop-blur-2xl',
    control:
      'border-[#DAD5CA] bg-white/54 text-[#6A665F] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]',
    controlActive:
      'border-[#BEB8AA] bg-white/88 text-[#1D1D1F] shadow-[0_10px_24px_rgba(81,72,55,0.06)]',
    metric:
      'border-[#DAD5CA] bg-[#fffdf9]/78 shadow-[0_16px_42px_rgba(81,72,55,0.052)]',
    card:
      'border-[#DAD5CA] bg-[#fffdf9]/78 shadow-[0_18px_52px_rgba(81,72,55,0.058)]',
    image: 'bg-[#F7F5F0]',
    mutedText: 'text-[#746F66]',
    accent: 'text-emerald-700',
  },
];

const platforms = ['번개장터', '중고나라'] as const;

export function DesignLabPage() {
  const [activePresetId, setActivePresetId] = useState<DesignPresetId>('hairline');
  const [activePlatform, setActivePlatform] = useState<string>('번개장터');
  const [sort, setSort] = useState<'low' | 'recent'>('low');
  const activePreset = presets.find((preset) => preset.id === activePresetId) ?? presets[0];
  const visibleProducts = useMemo(
    () =>
      products
        .slice(0, 8)
        .sort((a, b) => (sort === 'low' ? a.price - b.price : b.date.localeCompare(a.date))),
    [sort]
  );

  const lowestPrice = visibleProducts[0]?.price ?? 0;
  const averagePrice =
    visibleProducts.length > 0
      ? Math.round(
          visibleProducts.reduce((total, product) => total + product.price, 0) /
            visibleProducts.length /
            1000
        ) * 1000
      : 0;

  return (
    <main className={`flex-1 pb-20 ${activePreset.shell}`}>
      <section
        className={`sticky top-20 z-40 border-b px-8 py-4 ${activePreset.header}`}
        aria-label="디자인 프리셋 선택"
      >
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-black/38">
              HAMA SURFACE LAB
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-gray-950">
              {activePreset.name}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[#6E7178]">
              {activePreset.note}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setActivePresetId(preset.id)}
                className={`inline-flex h-11 items-center gap-2 rounded-[18px] border px-4 text-sm font-black transition active:border-black active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),0_8px_20px_rgba(29,29,31,0.055)] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                  activePresetId === preset.id
                    ? 'border-[#111827] bg-[#1D1D1F] text-white shadow-[0_10px_24px_rgba(29,29,31,0.12)]'
                    : 'border-[#D7DBE3] bg-white/62 text-[#5F6368] hover:bg-white/86 hover:text-[#1D1D1F]'
                }`}
              >
                {activePresetId === preset.id ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : null}
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-8 pt-9">
        <section role="search" aria-label="검색창 프리뷰">
          <div className="mx-auto max-w-[860px]">
            <div
              className={`relative flex h-[66px] items-center rounded-[24px] border px-5 ${activePreset.surface}`}
            >
              <Search className="h-5 w-5 text-[#8B919B]" aria-hidden="true" />
              <span className="ml-4 text-base font-black text-gray-950">
                맥북 air
              </span>
              <button className="ml-auto inline-flex h-[52px] min-w-[96px] items-center justify-center rounded-[20px] border border-black/10 bg-[#1D1D1F] px-5 text-base font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.16)] active:border-black active:shadow-[0_10px_24px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(0,0,0,0.65)]">
                검색
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="lab-result-title">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2
                id="lab-result-title"
                className="text-[30px] font-black tracking-tight text-gray-950"
              >
                맥북 air 검색 결과
              </h2>
              <p className={`mt-3 text-base font-bold ${activePreset.mutedText}`}>
                총 {visibleProducts.length.toLocaleString('ko-KR')}개 상품
              </p>
            </div>
            <p className={`inline-flex items-center gap-2 text-sm font-bold ${activePreset.mutedText}`}>
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              최종 업데이트: 2025.05.24 14:30
            </p>
          </div>
        </section>

        <section
          className={`rounded-[32px] border p-4 ${activePreset.surface}`}
          aria-label="필터 프리셋 프리뷰"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              {platforms.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => setActivePlatform(platform)}
                  className={`inline-flex h-12 items-center gap-2.5 rounded-[18px] border px-5 text-sm font-black transition active:border-black active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),0_8px_20px_rgba(29,29,31,0.055)] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-4 ${
                    activePlatform === platform
                      ? activePreset.controlActive
                      : activePreset.control
                  }`}
                >
                  <PlatformIcon platform={platform} />
                  {platform}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['low', '낮은 가격순'],
                ['recent', '최신순'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSort(id as 'low' | 'recent')}
                  className={`inline-flex h-11 min-w-[112px] items-center justify-center rounded-[18px] border px-5 text-sm font-black transition active:border-black active:shadow-[inset_0_0_0_1px_rgba(0,0,0,0.65),0_8px_20px_rgba(29,29,31,0.055)] focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 ${
                    sort === id ? activePreset.controlActive : activePreset.control
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-label="가격 요약 프리뷰">
          <MetricCard
            preset={activePreset}
            label="최저가"
            value={formatWon(lowestPrice)}
            description="현재 결과에서 가장 낮은 상품가"
            accent
          />
          <MetricCard
            preset={activePreset}
            label="평균가"
            value={formatWon(averagePrice)}
            description="검색 결과 기준 1천원 단위 반올림"
          />
        </section>

        <section className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4" aria-label="상품 카드 프리뷰">
          {visibleProducts.slice(0, 4).map((product) => (
            <article
              key={product.id}
              className={`overflow-hidden rounded-2xl border transition ${activePreset.card}`}
            >
              <div className={`relative ${activePreset.image}`}>
                <span className="absolute right-4 top-4 z-10 rounded-full bg-emerald-50/95 px-3 py-1 text-xs font-black text-emerald-700 shadow-sm">
                  {product.status}
                </span>
                <ProductVisual imageUrl={product.imageUrl} name={product.name} />
              </div>
              <div className="flex min-h-52 flex-col justify-between p-6">
                <h3 className="line-clamp-2 text-base font-black leading-snug tracking-tight text-gray-950">
                  {product.name}
                </h3>
                <div className="flex items-end justify-between gap-3">
                  <p className="text-sm font-black text-gray-950">
                    {formatWon(product.price)}
                  </p>
                  <span
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black opacity-75 ${activePreset.control}`}
                  >
                    <PlatformIcon platform={product.platform} small />
                    {product.platform}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function PlatformIcon({
  platform,
  small = false,
}: {
  platform: string;
  small?: boolean;
}) {
  const isBunjang = platform === '번개장터';
  const Icon = isBunjang ? Zap : ShoppingBag;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md ${
        small ? 'h-[18px] w-[18px]' : 'h-5 w-5'
      } ${isBunjang ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}
    >
      <Icon
        className={`${small ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${
          isBunjang ? 'fill-current' : ''
        }`}
        aria-hidden="true"
      />
    </span>
  );
}

function MetricCard({
  preset,
  label,
  value,
  description,
  accent = false,
}: {
  preset: DesignPreset;
  label: string;
  value: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <article className={`rounded-[24px] border px-6 py-4 ${preset.metric}`}>
      <p className={`text-xs font-black ${preset.mutedText}`}>{label}</p>
      <p
        className={`mt-1.5 text-2xl font-black tracking-tight ${
          accent ? preset.accent : 'text-gray-950'
        }`}
      >
        {value}
      </p>
      <p className={`mt-1.5 text-xs font-semibold ${preset.mutedText}`}>
        {description}
      </p>
    </article>
  );
}
