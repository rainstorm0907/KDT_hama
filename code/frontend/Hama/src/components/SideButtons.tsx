import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SideChatbotButton } from './SideChatbotButton';
import { SideNotificationButton } from './SideNotificationButton';
import { SidePriceCompareButton } from './SidePriceCompareButton';
import { hairline } from '../styles/hairline';
import type { Product } from '../types/product';

export type SidePanel = 'chatbot' | 'notification';

type SideButtonsProps = {
  activePanel: SidePanel | null;
  onProductSelect?: (product: Product) => void;
  onOpenPriceCompare: () => void;
  onPanelChange: (panel: SidePanel | null) => void;
};

export function SideButtons({
  activePanel,
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

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  const togglePanel = (panel: SidePanel) => {
    onPanelChange(activePanel === panel ? null : panel);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-2 md:bottom-6 md:right-6">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`flex h-16 w-16 items-center justify-center rounded-full text-gray-950 ring-1 ring-[#1D1D1F]/75 transition-all duration-200 md:h-[72px] md:w-[72px] ${hairline.panel} ${hairline.focus} ${
          isTopButtonVisible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-3 opacity-0'
        }`}
        aria-label="맨 위로 이동"
      >
        <ArrowUp className="h-6 w-6" aria-hidden="true" />
      </button>
      <SidePriceCompareButton
        onOpen={() => {
          onPanelChange(null);
          onOpenPriceCompare();
        }}
      />
      <SideChatbotButton
        isOpen={activePanel === 'chatbot'}
        onToggle={() => togglePanel('chatbot')}
      />
      <SideNotificationButton
        isOpen={activePanel === 'notification'}
        onClose={() => onPanelChange(null)}
        onProductSelect={onProductSelect}
        onToggle={() => togglePanel('notification')}
      />
    </div>
  );
}
