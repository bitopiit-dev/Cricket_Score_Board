import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', key: 'nav.home', icon: '🏏' },
  { to: '/rules', key: 'nav.rules', icon: '📜' },
  { to: '/awards', key: 'nav.awards', icon: '🏆' },
  { to: '/committee', key: 'nav.committee', icon: '👥' },
] as const;

/** Bottom tab bar for the main sections. Pages using it need bottom padding (pb-24). */
export function BottomNav() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/95"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end
              replace
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <span aria-hidden className="text-xl leading-none">
                {tab.icon}
              </span>
              {t(tab.key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
