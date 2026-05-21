import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthModal } from './components/AuthModal';
import type { AuthMode } from './components/AuthModal';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ProductDetailModal } from './components/ProductDetailModal';
import { DesignPreviewPage } from './pages/DesignPreviewPage';
import { DesignLabPage } from './pages/DesignLabPage';
import { HomePage } from './pages/HomePage';
import { MyPage } from './pages/MyPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { hairline } from './styles/hairline';
import type { Product } from './types/product';

function App() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    let hideTimerId: number | undefined;

    const showTransientScrollbar = () => {
      root.classList.add('is-scrolling');

      if (hideTimerId) {
        window.clearTimeout(hideTimerId);
      }

      hideTimerId = window.setTimeout(() => {
        root.classList.remove('is-scrolling');
      }, 900);
    };

    window.addEventListener('scroll', showTransientScrollbar, { passive: true });
    window.addEventListener('wheel', showTransientScrollbar, { passive: true });
    window.addEventListener('touchmove', showTransientScrollbar, { passive: true });

    return () => {
      if (hideTimerId) {
        window.clearTimeout(hideTimerId);
      }

      root.classList.remove('is-scrolling');
      window.removeEventListener('scroll', showTransientScrollbar);
      window.removeEventListener('wheel', showTransientScrollbar);
      window.removeEventListener('touchmove', showTransientScrollbar);
    };
  }, []);

  const closeAuthModal = () => setAuthMode(null);

  return (
    <div className={`relative font-sans antialiased text-gray-900 ${hairline.page}`}>
      <div
        className={`w-full min-h-screen relative z-10 flex flex-col transition-[filter] duration-300 ${
          selectedProduct ? 'blur-[6px]' : ''
        }`}
      >
        <Header
          isLoggedIn={isLoggedIn}
          onAuthOpen={setAuthMode}
          onLogout={() => setIsLoggedIn(false)}
        />

        <Routes>
          <Route
            path="/"
            element={<HomePage onProductSelect={setSelectedProduct} />}
          />
          <Route
            path="/search"
            element={<SearchResultsPage onProductSelect={setSelectedProduct} />}
          />
          <Route
            path="/mypage"
            element={<MyPage onProductSelect={setSelectedProduct} />}
          />
          <Route path="/design-lab" element={<DesignLabPage />} />
          <Route path="/design/:variant" element={<DesignPreviewPage />} />
        </Routes>

        <Footer />
      </div>

      <AuthModal
        mode={authMode}
        onClose={closeAuthModal}
        onModeChange={setAuthMode}
        onLoginSuccess={() => {
          setIsLoggedIn(true);
          closeAuthModal();
        }}
      />
      <ProductDetailModal
        key={selectedProduct?.id ?? 'empty-product-modal'}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

export default App;
