import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrefs } from '../../store/prefsStore';

interface Props {
  title: string;
  /** Route to go back to; omit for no back button. */
  backTo?: string;
  actions?: ReactNode;
}

/**
 * Step back through history when we came from inside the app, so the
 * phone's back button and ours agree; otherwise (opened directly) replace
 * with the parent route.
 */
export function useGoBack(parent?: string) {
  const navigate = useNavigate();
  const location = useLocation();
  return () => {
    if (location.key !== 'default') navigate(-1);
    else if (parent) navigate(parent, { replace: true });
  };
}

export function Header({ title, backTo, actions }: Props) {
  const { t } = useTranslation();
  const goBack = useGoBack(backTo);
  return (
    <header className="sticky top-0 z-[55] flex items-center gap-2 bg-night-950 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white shadow">
      {backTo && (
        <button
          type="button"
          onClick={goBack}
          aria-label={t('common.back')}
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10"
        >
          ‹
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title}</h1>
      {actions}
      <LanguageToggle />
    </header>
  );
}

export function LanguageToggle() {
  const lang = usePrefs((s) => s.lang);
  const setLang = usePrefs((s) => s.setLang);
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/40 px-3 text-sm font-semibold hover:bg-white/10"
      // The spoken name starts with the visible text (WCAG 2.5.3, label in name)
      aria-label={lang === 'bn' ? 'EN, switch to English' : 'বাং, বাংলায় দেখুন'}
    >
      {lang === 'bn' ? 'EN' : 'বাং'}
    </button>
  );
}
