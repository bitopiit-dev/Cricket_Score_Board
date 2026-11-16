import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { noticesFor } from '../../config/notices';
import { todayInDhaka } from '../../data/fixtures';
import { usePrefs } from '../../store/prefsStore';
import { isStandalone } from './InstallHint';

const CLOSED = 'bpl:noticesClosed';

function readClosed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLOSED) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Current announcements (config/notices.ts) for this page; each can be closed. */
export function NoticeBanner({ page }: { page: 'home' | 'live' }) {
  const { t } = useTranslation();
  const lang = usePrefs((s) => s.lang);
  const [closed, setClosed] = useState(readClosed);
  const today = todayInDhaka();
  const shown = noticesFor(page, today, closed, isStandalone());
  if (shown.length === 0) return null;

  const close = (id: string) => {
    const next = [...closed, id];
    setClosed(next);
    try {
      localStorage.setItem(CLOSED, JSON.stringify(next));
    } catch {
      /* stays closed until the app is reopened */
    }
  };

  return (
    <>
      {shown.map((n) => (
        <section
          key={n.id}
          role="alert"
          className="relative overflow-hidden rounded-2xl bg-amber-50 p-4 pr-11 text-amber-950 shadow-sm ring-1 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-700"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-amber-500" />
          <h2 className="flex items-center gap-2 font-bold">
            <span aria-hidden>{n.icon ?? '📢'}</span>
            {n.title[lang]}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed">{n.body[lang]}</p>
          {n.link && (
            <Link
              to={n.link.to}
              className="-mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-amber-800 underline underline-offset-2 dark:text-amber-300"
            >
              {n.link.label[lang]} ›
            </Link>
          )}
          <button
            type="button"
            onClick={() => close(n.id)}
            aria-label={t('common.close')}
            className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-full text-xl text-amber-900/70 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            ×
          </button>
        </section>
      ))}
    </>
  );
}
