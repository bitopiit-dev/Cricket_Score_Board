import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageSkeleton } from '../components/common/Skeleton';
import { SubPageTitle } from '../components/layout/AppShell';
import { Lightbox } from '../components/media/Lightbox';
import { fixtureById } from '../data/fixtures';
import { useEdgeFade } from '../hooks/useEdgeFade';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import {
  CURRENT_SEASON,
  groupByMatch,
  listMedia,
  photoUrl,
  seasonsOf,
  watchMedia,
  type MediaItem,
} from '../media/gallery';
import { usePrefs } from '../store/prefsStore';
import { formatDate, slotLabel } from '../utils/fixtureText';

/** #/media: photo albums by season, one group per match, newest match first. */
export default function MediaPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const tour = useTournament();
  const chipRow = useEdgeFade<HTMLDivElement>();
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [season, setSeason] = useState(CURRENT_SEASON);
  const [open, setOpen] = useState<{ list: MediaItem[]; i: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      listMedia()
        .then((list) => alive && (setItems(list), setFailed(false)))
        .catch(() => alive && setFailed(true));
    void load();
    const stop = watchMedia(() => void load());
    return () => {
      alive = false;
      stop();
    };
  }, []);

  const label = useCallback(
    (fixtureId: string | null): string | null => {
      const fx = fixtureId ? fixtureById(fixtureId) : undefined;
      if (!fx) return null;
      const side = (i: 0 | 1) =>
        slotLabel(
          i ? fx.teamB : fx.teamA,
          tour ? tour.ts.resolve(i ? fx.teamB : fx.teamA) : null,
          t,
          f,
        );
      const date = formatDate(fx.date, lang, bengaliDigits, { day: 'numeric', month: 'long' });
      return `${t('fixtures.matchNo', { n: f.num(fx.no) })}: ${side(0)} ${t('common.vs')} ${side(1)}, ${date}`;
    },
    [tour, t, f, lang, bengaliDigits],
  );

  const groups = useMemo(
    () =>
      groupByMatch(
        (items ?? []).filter((i) => i.season === season),
        (id) => fixtureById(id)?.no ?? 0,
      ),
    [items, season],
  );

  if (!items && !failed) return <PageSkeleton />;
  const seasons = seasonsOf(items ?? []);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl">
      <SubPageTitle title={t('more.media')} parent="/more" />

      {seasons.length > 1 && (
        <div ref={chipRow} className="edge-fade -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {seasons.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={season === s}
              onClick={() => setSeason(s)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap ${
                season === s
                  ? 'bg-bpl-yellow text-night-950'
                  : 'bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              BPL-{f.num(s)}
            </button>
          ))}
        </div>
      )}

      {failed && !items && (
        <p className="text-slate-600 dark:text-slate-400">{t('gallery.offline')}</p>
      )}

      {items && groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-600 dark:border-slate-700 dark:text-slate-400">
          {t('gallery.empty', { season: `BPL-${f.num(season)}` })}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.fixtureId ?? 'other'} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 font-semibold">{label(g.fixtureId) ?? t('gallery.other')}</h2>
            <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
              {t('gallery.count', { n: f.num(g.items.length), count: g.items.length })}
            </span>
          </div>
          <ul className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl md:grid-cols-4">
            {g.items.map((it, i) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => setOpen({ list: g.items, i })}
                  aria-label={it.caption || t('gallery.open', { n: f.num(i + 1) })}
                  className="block aspect-square w-full bg-slate-200 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-bpl-yellow dark:bg-slate-800"
                >
                  <img
                    src={photoUrl(it.thumb_path)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {open && (
        <Lightbox
          items={open.list}
          index={open.i}
          label={(it) => label(it.fixture_id)}
          onIndex={(i) => setOpen({ ...open, i })}
          onClose={() => setOpen(null)}
        />
      )}
    </main>
  );
}
