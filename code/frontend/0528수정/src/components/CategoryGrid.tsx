import type { Category } from '../data/categories';
import { hairline } from '../styles/hairline';

type CategoryGridProps = {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function CategoryGrid({
  categories,
  activeId,
  onSelect,
}: CategoryGridProps) {
  return (
    <section aria-label="카테고리 선택" className="w-full">
      <div className="max-w-[1440px] mx-auto px-8">
        <div className={`mx-auto grid max-w-[1080px] grid-cols-3 gap-4 rounded-[32px] p-4 md:grid-cols-6 ${hairline.panelSoft}`}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              aria-pressed={cat.id === activeId}
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-3xl border p-8 transition-colors duration-200 ${hairline.focusWide} ${
                cat.id === activeId
                  ? hairline.controlActive
                  : 'border-transparent bg-transparent text-[#86868B] hover:border-[#C9CFDA] hover:bg-white/58 hover:text-[#1D1D1F]'
              }`}
            >
              <div className="mb-4">
                <cat.icon
                  className={`w-10 h-10 transition-colors ${
                    cat.id === activeId
                      ? 'text-[#1D1D1F]'
                      : 'text-[#86868B] group-hover:text-[#1D1D1F]'
                  }`}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </div>
              <span className="text-base font-bold tracking-tight">
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
