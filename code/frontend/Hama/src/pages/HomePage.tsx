import { useState } from 'react';
import { Banner } from '../components/Banner';
import { CategoryGrid } from '../components/CategoryGrid';
import { ProductCard } from '../components/ProductCard';
import { SearchBar } from '../components/SearchBar';
import { SortControls } from '../components/SortControls';
import type { SortOption } from '../components/SortControls';
import { categories } from '../data/categories';
// TODO(BE): 메인 추천 상품 API가 생기면 GET /api/products/recommended 응답으로 교체합니다.
import { products } from '../data/mockProducts';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';

type HomePageProps = {
  onProductSelect: (product: Product) => void;
};

export function HomePage({ onProductSelect }: HomePageProps) {
  const [activeId, setActiveId] = useState('phone');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('low-price');

  return (
    <main className={`flex-1 flex flex-col gap-14 md:gap-16 pb-24 ${hairline.page}`}>
      <SearchBar
        isOpen={isSearchOpen}
        onOpen={() => setIsSearchOpen(true)}
        onClose={() => setIsSearchOpen(false)}
      />
      <Banner />
      <CategoryGrid
        categories={categories}
        activeId={activeId}
        onSelect={setActiveId}
      />

      <section id="products" aria-label="추천 상품" className="w-full">
        <div className="max-w-[1440px] mx-auto px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              추천 상품
            </h2>
            <SortControls
              activeSort={sortOption}
              onSortChange={setSortOption}
              labels={{ 'low-price': '인기순' }}
              options={['low-price', 'recent']}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={onProductSelect}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
