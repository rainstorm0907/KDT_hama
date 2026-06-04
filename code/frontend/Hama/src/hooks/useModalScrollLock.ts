import { useLayoutEffect } from 'react';

export function useModalScrollLock(isLocked: boolean) {
  useLayoutEffect(() => {
    if (!isLocked) {
      return;
    }

    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflowY = root.style.overflowY;
    const previousBodyOverflow = body.style.overflow;

    root.classList.add('modal-scroll-lock');
    root.style.overflowY = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      root.classList.remove('modal-scroll-lock');
      root.style.overflowY = previousRootOverflowY;
      body.style.overflow = previousBodyOverflow;
    };
  }, [isLocked]);
}
