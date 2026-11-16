import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../common/icons';

/** Chrome's install event (not in the TypeScript DOM types yet). */
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED = 'bpl:installHintDismissed';

/** Captured as early as possible: Chrome fires it once, often before Home renders. */
let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
}

/** True inside the installed app (opened from its home-screen icon). */
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isMobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent);

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}

/**
 * Home: a small card offering to put the app on the phone's home screen.
 * One tap where the browser supports it (Android Chrome), otherwise short
 * steps (iPhone Safari, other Android browsers). Gone once installed or closed.
 */
export function InstallHint() {
  const { t } = useTranslation();
  const [, rerender] = useState(0);
  const [hidden, setHidden] = useState(() => isStandalone() || wasDismissed() || !isMobile());

  useEffect(() => {
    const l = () => rerender((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  if (hidden) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {
      /* the card then only stays closed until the app is reopened */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === 'accepted') setHidden(true);
    else rerender((n) => n + 1);
  };

  return (
    <section className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-bpl-yellow/60 dark:bg-slate-900">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-night-950 text-bpl-yellow">
        <Icon name="install" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{t('install.title')}</h2>
        <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-400">
          {deferred ? t('install.oneTap') : isIos() ? t('install.ios') : t('install.android')}
        </p>
        {deferred && (
          <button
            type="button"
            onClick={() => void install()}
            className="mt-2 rounded-xl bg-bpl-red px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            {t('install.button')}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t('common.close')}
        className="-my-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        ×
      </button>
    </section>
  );
}
