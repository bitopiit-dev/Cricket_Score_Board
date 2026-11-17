import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { noticesFor, type Notice } from '../../config/notices';
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

/**
 * Current announcements (config/notices.ts) for this page, as one slim line
 * each: the title, with the details a tap away, and a close button.
 */
export function NoticeBanner({ page }: { page: 'home' | 'live' }) {
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
        <NoticeStrip key={n.id} notice={n} lang={lang} onClose={() => close(n.id)} />
      ))}
    </>
  );
}

function NoticeStrip({
  notice: n,
  lang,
  onClose,
}: {
  notice: Notice;
  lang: 'bn' | 'en';
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const bodyId = `notice-${n.id}`;
  return (
    <section
      aria-label={t('notice.label')}
      className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-amber-300/70 dark:bg-slate-900 dark:ring-amber-500/30"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 py-2 pr-1 pl-4 text-left"
        >
          <span aria-hidden className="text-lg leading-none">
            {n.icon ?? '📢'}
          </span>
          <span className="min-w-0 flex-1 text-sm leading-snug font-semibold">{n.title[lang]}</span>
          <span className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {t(open ? 'notice.less' : 'notice.more')}
          </span>
          <span
            aria-hidden
            className={`shrink-0 text-amber-800 transition-transform motion-reduce:transition-none dark:text-amber-300 ${open ? 'rotate-180' : ''}`}
          >
            ⌄
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('notice.close')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          ×
        </button>
      </div>
      <div id={bodyId} hidden={!open} className="px-4 pb-3 pl-5">
        <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
          {n.body[lang]}
        </p>
        {n.link && (
          <Link
            to={n.link.to}
            className="-mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-amber-800 underline underline-offset-2 dark:text-amber-300"
          >
            {n.link.label[lang]} ›
          </Link>
        )}
      </div>
    </section>
  );
}
