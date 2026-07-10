import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SideChatbotButton } from './SideChatbotButton';
import { SideNotificationButton } from './SideNotificationButton';
import { SidePriceCompareButton } from './SidePriceCompareButton';
import { sideButtonClass, sideButtonRailClass } from './sideButtonStyles';
import type { Product } from '../types/product';

export type SidePanel = 'chatbot' | 'notification';

type SideButtonsProps = {
  activePanel: SidePanel | null;
  activeProduct?: Product | null;
  activeProductRequestId?: number;
  chatSessionKey?: number;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  onProductSelect?: (product: Product) => void;
  onOpenPriceCompare: () => void;
  onPanelChange: (panel: SidePanel | null) => void;
};

export function SideButtons({
  activePanel,
  activeProduct,
  activeProductRequestId = 0,
  chatSessionKey = 0,
  isLoggedIn,
  onLoginRequired,
  onOpenPriceCompare,
  onPanelChange,
  onProductSelect,
}: SideButtonsProps) {
  const [isTopButtonVisible, setIsTopButtonVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setIsTopButtonVisible(window.scrollY > 420);
    }

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('wheel', updateVisibility, { passive: true });
    window.addEventListener('touchmove', updateVisibility, { passive: true });
    document.addEventListener('scroll', updateVisibility, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', updateVisibility);
      window.removeEventListener('wheel', updateVisibility);
      window.removeEventListener('touchmove', updateVisibility);
      document.removeEventListener('scroll', updateVisibility, {
        capture: true,
      });
    };
  }, []);

  const togglePanel = (panel: SidePanel) => {
    onPanelChange(activePanel === panel ? null : panel);
  };

  return (
    <div
      className={sideButtonRailClass}
      aria-label={isTopButtonVisible ? '확장된 사이드 버튼' : '사이드 버튼'}
    >
      <div
        aria-hidden={!isTopButtonVisible}
        className={`transition-[max-height,opacity,transform,margin] duration-200 ${
          isTopButtonVisible
            ? 'mb-0 max-h-[58px] translate-y-0 scale-100 overflow-visible opacity-100'
            : 'pointer-events-none -mb-[9px] max-h-0 translate-y-3 scale-[0.92] overflow-hidden opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          tabIndex={isTopButtonVisible ? 0 : -1}
          className={sideButtonClass}
          aria-label="맨 위로 이동"
        >
          <ArrowUp className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <SidePriceCompareButton
        onOpen={() => {
          onPanelChange(null);
          onOpenPriceCompare();
        }}
      />
      <SideChatbotButton
        key={chatSessionKey}
        activeProduct={activeProduct}
        activeProductRequestId={activeProductRequestId}
        isOpen={activePanel === 'chatbot'}
        onToggle={() => {
          if (!isLoggedIn) {
            onLoginRequired();
            return;
          }
          togglePanel('chatbot');
        }}
        onProductSelect={(product) => {
          onPanelChange(null);
          onProductSelect?.(product);
        }}
      />
      <SideNotificationButton
        isOpen={activePanel === 'notification'}
        onClose={() => onPanelChange(null)}
        onProductSelect={onProductSelect}
        onToggle={() => {
          if (!isLoggedIn) {
            onLoginRequired();
            return;
          }
          togglePanel('notification');
        }}
      />
    </div>
  );
}
