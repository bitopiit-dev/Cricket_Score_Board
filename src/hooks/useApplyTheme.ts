import { useEffect } from 'react';

/** Sports broadcast theme: the app is always dark, for contrast outdoors. */
export const THEME_COLOR = '#0b1120';

/** Keeps the `dark` class on <html> (index.html already sets it, so nothing flashes). */
export function useApplyTheme() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR);
  }, []);
}
