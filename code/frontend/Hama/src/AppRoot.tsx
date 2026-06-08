import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthModal } from './components/AuthModal';
import type { AuthMode } from './components/AuthModal';
import { Header } from './components/Header';
import { PriceCompareModal } from './components/PriceCompareModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SideButtons } from './components/SideButtons';
import type { SidePanel } from './components/SideButtons';
import { SiteFooter } from './components/SiteFooter';
import { AdminPage } from './pages/AdminPage';
import { HomePage } from './pages/HomePage';
import { LegalPage } from './pages/LegalPage';
import { MyPage } from './pages/MyPage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { hairline } from './styles/hairline';
import type { Product } from './types/product';

export function AppRoot() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceCompareProduct, setPriceCompareProduct] = useState<Product | null>(null);
  const [isPriceCompareOpen, setIsPriceCompareOpen] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanel | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isAdmin = isLoggedIn;
  const isBlockingModalOpen = Boolean(selectedProduct) || isPriceCompareOpen;

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
  const openPriceCompare = (product: Product | null = null) => {
    setPriceCompareProduct(product);
    setIsPriceCompareOpen(true);
    setActiveSidePanel(null);
  };

  const openChatbot = () => {
    setActiveSidePanel('chatbot');
  };

  return (
    <div className={`relative font-sans antialiased text-gray-900 ${hairline.page}`}>
      <div
        className={`w-full min-h-screen relative z-10 flex flex-col transition-[filter] duration-300 ${
          selectedProduct || isPriceCompareOpen ? 'blur-[6px]' : ''
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
            element={
              <HomePage
                onProductSelect={setSelectedProduct}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchResultsPage
                onProductSelect={setSelectedProduct}
              />
            }
          />
          <Route
            path="/mypage"
            element={<MyPage onProductSelect={setSelectedProduct} isAdmin={isAdmin} />}
          />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
        </Routes>

        <SiteFooter />

        <SideButtons
          activePanel={activeSidePanel}
          onOpenPriceCompare={() => openPriceCompare()}
          onPanelChange={setActiveSidePanel}
          onProductSelect={setSelectedProduct}
        />
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
      {isBlockingModalOpen ? (
        <div
          className={`pointer-events-none fixed inset-0 blur-[6px] ${
            selectedProduct ? 'z-[140]' : 'z-[110]'
          }`}
          aria-hidden="true"
        >
          <SideButtons
            activePanel={null}
            onOpenPriceCompare={() => undefined}
            onPanelChange={() => undefined}
            onProductSelect={() => undefined}
          />
        </div>
      ) : null}
      <ProductDetailModal
        key={selectedProduct?.id ?? 'empty-product-modal'}
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenChatbot={openChatbot}
        onOpenPriceCompare={openPriceCompare}
      />
      <PriceCompareModal
        isOpen={isPriceCompareOpen}
        initialProduct={priceCompareProduct}
        onClose={() => setIsPriceCompareOpen(false)}
      />
    </div>
  );
}

export default AppRoot;
