import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { fetchCurrentUser, logout } from './api/auth';
import { fetchAdminStatus, saveRecentItem } from './api/mypageApi';
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
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [chatProduct, setChatProduct] = useState<Product | null>(null);
  const [chatProductRequestId, setChatProductRequestId] = useState(0);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [priceCompareProduct, setPriceCompareProduct] = useState<Product | null>(null);
  const [isPriceCompareOpen, setIsPriceCompareOpen] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanel | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
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

  useEffect(() => {
    fetchCurrentUser()
      .then(async () => {
        setIsLoggedIn(true);
        const status = await fetchAdminStatus().catch(() => ({ admin: false }));
        setIsAdmin(status.admin);
      })
      .catch(() => {
        setIsLoggedIn(false);
        setIsAdmin(false);
      })
      .finally(() => setIsAuthChecked(true));
  }, []);

  const closeAuthModal = () => setAuthMode(null);

  const handleLoggedOut = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setSelectedProduct(null);
    setChatProduct(null);
    setActiveSidePanel(null);
    setChatSessionKey((current) => current + 1);
    navigate('/');
  };

  const handleLogout = () => {
    logout().catch(() => undefined).finally(handleLoggedOut);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);

    if (isLoggedIn) {
      void saveRecentItem(product.id).catch(() => undefined);
    }
  };

  const openPriceCompare = (product: Product | null = null) => {
    setPriceCompareProduct(product);
    setIsPriceCompareOpen(true);
    setActiveSidePanel(null);
  };

  const openChatbot = (product?: Product) => {
    if (!isLoggedIn) {
      setAuthMode('login');
      return;
    }

    if (product) {
      setChatProduct(product);
      setChatProductRequestId((current) => current + 1);
    }

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
          onLogout={handleLogout}
        />

        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                onProductSelect={handleProductSelect}
              />
            }
          />
          <Route
            path="/search"
            element={
              <SearchResultsPage
                onProductSelect={handleProductSelect}
              />
            }
          />
          <Route
            path="/mypage"
            element={
              isAuthChecked && !isLoggedIn
                ? <Navigate to="/" replace />
                : <MyPage
                    onProductSelect={handleProductSelect}
                    isAdmin={isAdmin}
                    onWithdrawn={handleLoggedOut}
                  />
            }
          />
          <Route
            path="/admin"
            element={
              !isAuthChecked ? null : isAdmin ? <AdminPage /> : <Navigate to="/" replace />
            }
          />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
        </Routes>

        <SiteFooter />

        <SideButtons
          activePanel={activeSidePanel}
          onOpenPriceCompare={() => openPriceCompare()}
          onPanelChange={setActiveSidePanel}
          onProductSelect={handleProductSelect}
          isLoggedIn={isLoggedIn}
          onLoginRequired={() => setAuthMode('login')}
          chatSessionKey={chatSessionKey}
          activeProduct={chatProduct}
          activeProductRequestId={chatProductRequestId}
        />
      </div>

      <AuthModal
        mode={authMode}
        onClose={closeAuthModal}
        onModeChange={setAuthMode}
        onLoginSuccess={() => {
          setIsLoggedIn(true);
          void fetchAdminStatus()
            .then((status) => setIsAdmin(status.admin))
            .catch(() => setIsAdmin(false));
          setChatSessionKey((current) => current + 1);
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
            isLoggedIn={isLoggedIn}
            onLoginRequired={() => setAuthMode('login')}
            chatSessionKey={chatSessionKey}
            activeProduct={chatProduct}
            activeProductRequestId={chatProductRequestId}
          />
        </div>
      ) : null}
      <ProductDetailModal
        key={selectedProduct?.id ?? 'empty-product-modal'}
        product={selectedProduct}
        isLoggedIn={isLoggedIn}
        onClose={() => setSelectedProduct(null)}
        onLoginRequired={() => setAuthMode('login')}
        onOpenChatbot={() => openChatbot(selectedProduct ?? undefined)}
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
