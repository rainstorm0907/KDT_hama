import { Bell, Heart, Package, User } from 'lucide-react';
import { ProductVisual } from '../components/ProductVisual';
// TODO(BE): 찜 목록 API가 생기면 GET /api/users/me/wishlist 응답으로 교체합니다.
import { products } from '../data/mockProducts';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';
import { formatWon } from '../utils/format';

const wishlistItems = products.slice(0, 3);

type MyPageProps = {
  onProductSelect: (product: Product) => void;
};

export function MyPage({ onProductSelect }: MyPageProps) {
  return (
    <main className={`flex-1 ${hairline.page}`}>
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-12 px-8 py-16 md:grid-cols-[320px_1fr] md:items-start lg:gap-14">
        <aside className="w-full shrink-0">
          <div className={`min-h-[760px] rounded-[28px] p-5 ${hairline.panelSoft}`}>
            <h2 className="mb-9 text-center text-2xl font-black tracking-tight text-gray-950">
              마이페이지
            </h2>
            <nav className="flex flex-col gap-1" aria-label="마이페이지 메뉴">
              <button className={`flex items-center gap-3 rounded-2xl p-4 font-bold ${hairline.primaryButton} ${hairline.focus}`}>
                <Heart className="w-5 h-5" aria-hidden="true" />찜 목록
              </button>
              <button className={`flex items-center gap-3 rounded-2xl p-4 text-left text-gray-500 transition-all ${hairline.controlHover} ${hairline.focus}`}>
                <Package className="w-5 h-5" aria-hidden="true" />
                최근 본 상품
              </button>
              <button className={`flex items-center gap-3 rounded-2xl p-4 text-left text-gray-500 transition-all ${hairline.controlHover} ${hairline.focus}`}>
                <Bell className="w-5 h-5" aria-hidden="true" />
                알림 설정
              </button>
              <div className="my-4 h-px bg-[#C9CFDA]" />
              <button className={`flex items-center gap-3 rounded-2xl p-4 text-left text-gray-500 transition-all ${hairline.controlHover} ${hairline.focus}`}>
                <User className="w-5 h-5" aria-hidden="true" />
                프로필 수정
              </button>
            </nav>
          </div>
        </aside>

        <section className="min-w-0 pt-2">
          <div className="mb-10">
            <h3 className="text-xl font-bold mb-2">찜 목록</h3>
            <p className="text-gray-500">
              관심 있는 상품의 최신 가격 정보를 확인하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {wishlistItems.map((item) => (
              <article
                key={item.id}
                className={`group flex items-center gap-4 rounded-[24px] p-6 transition-all focus-within:ring-2 focus-within:ring-black focus-within:ring-offset-2 ${hairline.card} ${hairline.cardHover}`}
              >
                <button
                  type="button"
                  onClick={() => onProductSelect(item)}
                  className="flex min-w-0 flex-1 items-center gap-6 text-left outline-none"
                  aria-label={`${item.name} 상세 보기`}
                >
                  <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl ${hairline.image}`}>
                    <ProductVisual
                      imageUrl={item.imageUrl}
                      name={item.name}
                      variant="thumb"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400 font-bold uppercase">
                      {item.brand}
                    </p>
                    <h4 className="font-bold text-gray-900 mb-2 line-clamp-2">
                      {item.name}
                    </h4>
                    <p className="font-bold text-lg">{formatWon(item.price)}</p>
                  </div>
                </button>
                <button
                  className={`rounded-full border border-[#C9CFDA] bg-white/70 p-3 text-red-500 transition-colors hover:bg-red-50 ${hairline.focus}`}
                  aria-label={`${item.name} 찜 해제`}
                >
                  <Heart className="w-5 h-5 fill-current" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
