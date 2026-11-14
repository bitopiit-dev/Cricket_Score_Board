import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Small line icons, 24×24. */
const ICONS: Record<string, ReactNode> = {
  live: (
    <>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <path {...stroke} d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path {...stroke} d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
    </>
  ),
  fixtures: (
    <>
      <rect {...stroke} x="3.5" y="5" width="17" height="15" rx="2" />
      <path {...stroke} d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  points: <path {...stroke} d="M4 6h16M4 12h16M4 18h16M9 4v16" />,
  stats: <path {...stroke} d="M5 20V11M12 20V4M19 20v-6M3 20h18" />,
  teams: (
    <>
      <circle {...stroke} cx="9" cy="8" r="3" />
      <path {...stroke} d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle {...stroke} cx="17" cy="9" r="2.5" />
      <path {...stroke} d="M15.5 14.2A4.5 4.5 0 0 1 21 19" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </>
  ),
};

/** The six sections, in order. `also` lists other paths that belong to the tab. */
export const TABS = [
  { id: 'live', to: '/live', also: [] },
  { id: 'fixtures', to: '/fixtures', also: [] },
  { id: 'points', to: '/points', also: [] },
  { id: 'stats', to: '/stats', also: ['/awards'] },
  { id: 'teams', to: '/teams', also: ['/team/'] },
  { id: 'more', to: '/more', also: ['/rules', '/committee', '/media'] },
] as const;

export function activeTab(pathname: string): string | undefined {
  return TABS.find((t) => pathname === t.to || t.also.some((p: string) => pathname.startsWith(p)))
    ?.id;
}

/**
 * Section tabs. `bottom`: fixed bottom navigation for phones.
 * `top`: segmented bar inside the header for larger screens.
 * Tabs push history entries, so the back button returns to the previous tab.
 */
export function TabBar({ variant }: { variant: 'bottom' | 'top' }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const active = activeTab(pathname);

  const list = (
    <ul
      className={
        variant === 'top'
          ? 'grid grid-cols-6 gap-1.5 rounded-2xl border border-night-line bg-night-900 p-1'
          : 'mx-auto grid max-w-lg grid-cols-6 gap-1 px-1.5 py-1.5'
      }
    >
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <li key={tab.id}>
            <Link
              to={tab.to}
              aria-current={on ? 'page' : undefined}
              className={`flex items-center justify-center rounded-xl font-semibold transition ${
                variant === 'top'
                  ? 'min-h-11 gap-2 px-2 text-base'
                  : 'min-h-14 flex-col gap-0.5 px-0.5 text-[11px] leading-tight'
              } ${
                on
                  ? 'bg-gradient-to-r from-neon-cyan to-neon-violet text-night-950 shadow-[0_0_16px_rgba(34,240,255,0.4)]'
                  : 'text-night-muted hover:text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
                {ICONS[tab.id]}
              </svg>
              <span className="max-w-full truncate">{t(`tabs.${tab.id}`)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (variant === 'top') {
    return <nav aria-label={t('tabs.label')}>{list}</nav>;
  }
  return (
    <nav
      aria-label={t('tabs.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-night-line bg-night-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {list}
    </nav>
  );
}
