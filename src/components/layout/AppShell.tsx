import { useTranslation } from 'react-i18next';
import { assetUrl } from '../../utils/asset';
import { Link, Outlet } from 'react-router-dom';
import { APP_SUBTITLE, APP_TITLE } from '../../config/app';
import { BPL_LOGO, COMMITTEE_LOGO, COMMITTEE_NAME } from '../../data/committee';
import { LanguageToggle, useGoBack } from '../common/Header';
import { TabBar } from './TabBar';

/**
 * Layout for the main sections: dark header with the tournament name,
 * section tabs (bottom on phones, in the header on larger screens) and the
 * current tab's page.
 */
export function AppShell() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="bg-night-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:px-4">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <Link to="/home" className="inline-block max-w-full active:scale-95">
                <img
                  src={assetUrl(BPL_LOGO)}
                  alt={`${APP_TITLE} | ${APP_SUBTITLE}`}
                  className="h-[56px] w-auto max-w-full object-contain md:h-16"
                />
              </Link>
            </div>
            <Link to="/committee" aria-label={COMMITTEE_NAME} className="shrink-0 active:scale-95">
              <img src={assetUrl(COMMITTEE_LOGO)} alt="" className="h-12 w-auto" />
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              <span className="flex items-center gap-1.5 text-[11px] whitespace-nowrap text-night-muted sm:text-xs">
                <span aria-hidden className="size-2 rounded-full bg-night-muted" />
                {t('app.savedOnDevice')}
              </span>
              <LanguageToggle />
            </div>
          </div>
          <div className="hidden md:block">
            <TabBar variant="top" />
          </div>
        </div>
      </header>
      <Outlet />
      <TabBar variant="bottom" />
    </div>
  );
}

/** Page heading used inside the shell. */
export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="font-display text-3xl font-bold tracking-wide">{children}</h1>;
}

/** Title row with a back button, for pages one level below a tab. */
export function SubPageTitle({ title, parent }: { title: string; parent: string }) {
  const { t } = useTranslation();
  const goBack = useGoBack(parent);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={goBack}
        aria-label={t('common.back')}
        className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-3xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
      >
        ‹
      </button>
      <h1 className="min-w-0 truncate font-display text-3xl font-bold tracking-wide">{title}</h1>
    </div>
  );
}
