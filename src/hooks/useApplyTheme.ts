import { useEffect } from 'react';
import { usePrefs } from '../store/prefsStore';

/**
 * Sports broadcast theme: dark by default. "Sunlight mode" (theme 'light')
 * switches the pages to the light palette for reading in bright sun; the
 * header and tab bar stay dark in both, so the theme colour never changes.
 */
export const THEME_COLOR = '#0b1120';

/** Keeps the `dark` class on <html> in step with the saved preference. */
export function useApplyTheme() {
  const theme = usePrefs((s) => s.theme);
  useEffect(() => {
    const dark = theme !== 'light';
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR);
  }, [theme]);
}
