import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/common/icons';
import { Sheet } from '../components/common/Sheet';
import { toast } from '../components/common/Toast';
import { btn } from '../components/common/controls';
import { PageTitle } from '../components/layout/AppShell';
import { usePrefs } from '../store/prefsStore';
import { assetUrl } from '../utils/asset';
import { shareText } from '../utils/share';

const ITEMS: { to: string; icon: IconName; key: string }[] = [
  { to: '/stats', icon: 'stats', key: 'stats' },
  { to: '/rules', icon: 'rules', key: 'rules' },
  { to: '/committee', icon: 'committee', key: 'committee' },
  { to: '/awards', icon: 'awards', key: 'awards' },
];

/** "More" tab: links to the smaller sections. */
export default function MorePage() {
  const { t } = useTranslation();
  const sunlight = usePrefs((s) => s.theme === 'light');
  const setTheme = usePrefs((s) => s.setTheme);
  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-3 p-4">
      <PageTitle>{t('tabs.more')}</PageTitle>
      <ShareApp />
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
              <span aria-hidden className="text-xl text-slate-500 dark:text-slate-400">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <label className="flex cursor-pointer items-center gap-4 rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-night-950 text-xl"
        >
          ☀️
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{t('more.sunlight')}</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400">
            {t('more.sunlightHint')}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={sunlight}
          onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 transition peer-checked:bg-bpl-green peer-focus-visible:ring-2 peer-focus-visible:ring-bpl-green/50 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5 dark:bg-slate-700"
        />
      </label>
      {/* For scorers and the organisers; viewers don't need it up front */}
      <Link
        to="/admin"
        className="mx-auto mt-4 flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Icon name="lock" className="size-4" />
        {t('more.adminLink')}
      </Link>
    </main>
  );
}

/** The QR code points at the live site; regenerate it if the address changes. */
const QR = 'images/bpl-2027-qr.png';
const POSTER = 'downloads/bpl-2027-qr-poster.jpg';

/**
 * "Share the app": a QR code a friend can scan straight off this screen,
 * the phone's share sheet for the link, and the printable QR poster.
 */
function ShareApp() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  async function onShareLink() {
    const url = window.location.href.split('#')[0];
    const res = await shareText(t('shareApp.title'), t('shareApp.message'), url);
    if (res === 'copied') toast(t('shareApp.copied'));
    else if (res === 'failed') toast(t('share.failed'));
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-4 rounded-2xl bg-night-950 p-4 text-left text-white shadow-sm active:bg-night-900"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-night-950">
          <Icon name="share" />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{t('shareApp.title')}</span>
          <span className="block text-sm text-white/70">{t('shareApp.hint')}</span>
        </span>
        <span aria-hidden className="text-xl text-white/70">
          ›
        </span>
      </button>

      <Sheet
        open={open}
        title={t('shareApp.title')}
        onClose={() => setOpen(false)}
        footer={
          <>
            <a href={assetUrl(POSTER)} download className={`${btn.secondary} flex-1 text-center`}>
              {t('shareApp.poster')}
            </a>
            <button type="button" onClick={onShareLink} className={`${btn.primary} flex-1`}>
              {t('shareApp.shareLink')}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          <p className="text-slate-600 dark:text-slate-300">{t('shareApp.scan')}</p>
          <img
            src={assetUrl(QR)}
            alt={t('shareApp.qrAlt')}
            width={900}
            height={900}
            className="aspect-square w-full max-w-72 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200 dark:ring-0"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('shareApp.install')}</p>
        </div>
      </Sheet>
    </>
  );
}
