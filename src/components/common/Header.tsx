import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { usePrefs } from '../../store/prefsStore';

interface Props {
  title: string;
  /** Route to go back to; omit for no back button. */
  backTo?: string;
  actions?: ReactNode;
}

export function Header({ title, backTo, actions }: Props) {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-emerald-800 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white shadow dark:bg-emerald-950">
      {backTo && (
        <Link
          to={backTo}
          aria-label={t('common.back')}
          className="-ml-1 flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-white/10"
        >
          ‹
        </Link>
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
      className="rounded-full border border-white/40 px-3 py-1 text-sm font-semibold hover:bg-white/10"
      aria-label="Language / ভাষা"
    >
      {lang === 'bn' ? 'EN' : 'বাং'}
    </button>
  );
}
