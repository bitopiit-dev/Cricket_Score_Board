import { useEffect } from 'react';
import { usePrefs } from '../store/prefsStore';

/** Puts the `dark` class on <html> based on the theme preference. */
export function useApplyTheme() {
  const theme = usePrefs((s) => s.theme);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#022c22' : '#065f46');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
