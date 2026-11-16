import { useCallback, useRef } from 'react';

/**
 * For a sideways-scrolling row: fades whichever edge has more content past it,
 * so a chip cut off at the screen edge reads as "scroll for more".
 * Returns a callback ref (works even when the row appears after a loading
 * state); pair the element with the `edge-fade` class.
 */
export function useEdgeFade<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      el.style.setProperty('--fade-l', el.scrollLeft > 2 ? '2rem' : '0px');
      el.style.setProperty('--fade-r', el.scrollLeft < max - 2 ? '2rem' : '0px');
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    cleanup.current = () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, []);
}
