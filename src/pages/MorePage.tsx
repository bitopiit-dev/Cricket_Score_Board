import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageTitle } from '../components/layout/AppShell';

const ITEMS = [
  { to: '/rules', icon: '📜', key: 'rules' },
  { to: '/committee', icon: '👥', key: 'committee' },
  { to: '/media', icon: '📸', key: 'media' },
  { to: '/awards', icon: '🏆', key: 'awards' },
  { to: '/admin', icon: '🔐', key: 'admin' },
] as const;

/** "More" tab: links to the smaller sections. */
export default function MorePage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-3 p-4">
      <PageTitle>{t('tabs.more')}</PageTitle>
      <ul className="flex flex-col gap-2">
        {ITEMS.map((i) => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800"
            >
              <span aria-hidden className="text-3xl">
                {i.icon}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{t(`more.${i.key}`)}</span>
                <span className="block text-sm text-slate-500 dark:text-slate-400">
                  {t(`more.${i.key}Hint`)}
                </span>
              </span>
              <span aria-hidden className="text-xl text-slate-400">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
