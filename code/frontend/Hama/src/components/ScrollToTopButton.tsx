import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { hairline } from '../styles/hairline';

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setIsVisible(window.scrollY > 420);
    }

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-8 right-8 z-[80] flex h-14 w-14 items-center justify-center rounded-full text-gray-950 transition-all duration-200 ${hairline.panel} ${hairline.focus} ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`}
      aria-label="맨 위로 이동"
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
