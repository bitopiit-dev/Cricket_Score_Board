import { Suspense } from 'react';
import { PageSkeleton } from '../common/Skeleton';
import { useTranslation } from 'react-i18next';
import { assetUrl } from '../../utils/asset';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { APP_SUBTITLE, APP_TITLE } from '../../config/app';
import { ToastHost } from '../common/Toast';
import { BPL_LOGO, COMMITTEE_LOGO, COMMITTEE_NAME } from '../../data/committee';
import { LanguageToggle, useGoBack } from '../common/Header';
import { AppSyncStatus } from './AppSyncStatus';
import { TabBar } from './TabBar';
import { DataUpdatedBar } from './DataUpdatedBar';

/**
 * Layout for the main sections: dark header with the tournament name,
 * section tabs (bottom on phones, in the header on larger screens) and the
 * current tab's page.
 */
export function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-8">
      <header className="bg-night-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
              <Link to="/home" className="inline-block max-w-full shrink-0 active:scale-95">
                <img
                  src={assetUrl(BPL_LOGO)}
                  width={331}
                  height={200}
                  alt={`${APP_TITLE} | ${APP_SUBTITLE}`}
                  className="h-11 w-auto max-w-full object-contain sm:h-[56px] md:h-16"
                />
              </Link>
              {/* The logo's alt text already names the league, so screen readers skip this.
                  On phones it wraps onto two lines between the two logos. */}
              <span
                aria-hidden
                className="block min-w-0 flex-1 text-center font-display text-[17px] leading-[1.05] font-extrabold tracking-wide text-balance text-white uppercase sm:text-xl md:text-2xl md:leading-tight lg:text-4xl"
              >
                {APP_SUBTITLE}
              </span>
            </div>
            {/* Phones have no room for it; the committee is one tap away under More */}
            <Link
              to="/committee"
              aria-label={COMMITTEE_NAME}
              className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center active:scale-95 sm:flex"
            >
              <img
                src={assetUrl(COMMITTEE_LOGO)}
                alt=""
                width={429}
                height={540}
                className="h-10 w-auto sm:h-12"
              />
            </Link>
            <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
              {/* No room on phones; the language button stays */}
              <AppSyncStatus />
              <LanguageToggle />
            </div>
          </div>
          <div className="hidden md:block">
            <TabBar variant="top" />
          </div>
        </div>
      </header>
      <ErrorBoundary resetKey={pathname}>
        {/* Pages load on demand; the header and tab bar stay put meanwhile */}
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
        <ToastHost />
      </ErrorBoundary>
      {/* Credit line, bottom right; the page padding keeps it above the phone tab bar */}
      <footer
        lang="en"
        className="mx-auto mt-auto w-full max-w-5xl px-4 pt-6 pb-2 text-right text-xs text-slate-600 dark:text-slate-400"
      >
        © 2026 K A Rahman
      </footer>
      <DataUpdatedBar />
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
        className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-3xl text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
      >
        ‹
      </button>
      <h1 className="min-w-0 truncate font-display text-3xl font-bold tracking-wide">{title}</h1>
    </div>
  );
}
