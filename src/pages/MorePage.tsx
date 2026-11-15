import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/common/icons';
import { PageTitle } from '../components/layout/AppShell';

const ITEMS: { to: string; icon: IconName; key: string }[] = [
  { to: '/stats', icon: 'stats', key: 'stats' },
  { to: '/rules', icon: 'rules', key: 'rules' },
  { to: '/committee', icon: 'committee', key: 'committee' },
  { to: '/awards', icon: 'awards', key: 'awards' },
];

/** "More" tab: links to the smaller sections. */
export default function MorePage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
      <PageTitle>{t('tabs.more')}</PageTitle>
      <ul className="flex flex-col gap-2">
        {ITEMS.map((i) => (
          <li key={i.to}>
            <Link
              to={i.to}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-night-950 text-bpl-yellow">
                <Icon name={i.icon} />
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
      {/* For scorers and the organisers; viewers don't need it up front */}
      <Link
        to="/admin"
        className="mx-auto mt-4 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Icon name="lock" className="size-4" />
        {t('more.adminLink')}
      </Link>
    </main>
  );
}
