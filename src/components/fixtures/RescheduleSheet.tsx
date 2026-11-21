import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FIXTURES, type Fixture } from '../../data/fixtures';
import { useFormat } from '../../hooks/useFormat';
import { usePrefs } from '../../store/prefsStore';
import { useAuth } from '../../sync/auth';
import { dataSource, rescheduleFixtures, RescheduleFailure, saveData } from '../../sync/remoteData';
import {
  changeFixtureTime,
  postponeDay,
  setPostponed,
  swapFixtureTimes,
} from '../../tournament/fixtureEdit';
import type { TournamentState } from '../../tournament/standings';
import { fixtureTeams } from '../../tournament/standings';
import { formatTime, slotLabel } from '../../utils/fixtureText';
import { btn, inputClass } from '../common/controls';
import { Sheet } from '../common/Sheet';
import { toast } from '../common/Toast';

/**
 * Super admin or scorer: give a match that has not started a new start time,
 * let it trade times with another match on the same day, or postpone it
 * (alone or with the rest of that day) until a new date is announced.
 */
export function RescheduleSheet({
  fx,
  ts,
  onClose,
  onSaved,
}: {
  fx: Fixture;
  ts: TournamentState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const auth = useAuth();
  const [time, setTime] = useState(fx.time);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const notStarted = (x: Fixture) => (ts.outcomes.get(x.id)?.status ?? 'scheduled') === 'scheduled';
  const sameDay = FIXTURES.filter((x) => x.date === fx.date && x.id !== fx.id);
  const names = (x: Fixture) => {
    const sides = fixtureTeams(x, ts);
    return `${slotLabel(x.teamA, sides[0], t, f)} – ${slotLabel(x.teamB, sides[1], t, f)}`;
  };

  const save = async (next: Fixture[], done: string) => {
    setBusy(true);
    setError('');
    try {
      // Before the first published fixture list only the super admin can start one
      if (auth.role === 'super' && dataSource('fixtures') === 'built-in' && auth.email) {
        await saveData('fixtures', next, auth.email);
      } else {
        await rescheduleFixtures(next);
      }
      toast(done);
      onSaved();
    } catch (e) {
      const code = e instanceof RescheduleFailure ? e.code : 'failed';
      setError(t(`reschedule.error_${code}`));
      // A newer list was loaded: show its time for this match
      if (code === 'stale') setTime(FIXTURES.find((x) => x.id === fx.id)?.time ?? fx.time);
    } finally {
      setBusy(false);
    }
  };

  // Today's other matches that could be postponed together with this one
  const dayOpen = FIXTURES.filter((x) => x.date === fx.date && notStarted(x) && !x.postponed);
  const postponed = !!fx.postponed;

  const postponeOne = () => {
    if (!confirm(t('reschedule.postponeAsk', { n: f.num(fx.no) }))) return;
    void save(
      setPostponed(FIXTURES, fx.id, true),
      t('reschedule.savedPostponed', { n: f.num(fx.no) }),
    );
  };
  const postponeAll = () => {
    const n = f.num(dayOpen.length);
    if (!confirm(t('reschedule.postponeDayAsk', { n }))) return;
    void save(
      postponeDay(
        FIXTURES,
        fx.date,
        dayOpen.map((x) => x.id),
      ),
      t('reschedule.savedPostponedDay', { n }),
    );
  };
  const unpostpone = () =>
    void save(
      setPostponed(FIXTURES, fx.id, false),
      t('reschedule.savedUnpostponed', { n: f.num(fx.no) }),
    );

  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);

  return (
    <Sheet
      open
      title={t('reschedule.title', { n: f.num(fx.no) })}
      onClose={busy ? undefined : onClose}
      footer={
        <button
          type="button"
          className={`${btn.primary} flex-1`}
          disabled={busy || !validTime || time === fx.time}
          onClick={() =>
            void save(
              changeFixtureTime(FIXTURES, fx.id, time),
              t('reschedule.savedOne', { n: f.num(fx.no), time: formatTime(time, lang, f) }),
            )
          }
        >
          {busy ? t('reschedule.saving') : t('reschedule.save')}
        </button>
      }
    >
      <p lang="en" className="font-semibold">
        {names(fx)}
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('reschedule.now', { time: formatTime(fx.time, lang, f) })}
      </p>

      <section className="mt-4 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-300 dark:bg-amber-950/40 dark:ring-amber-700/60">
        {postponed ? (
          <>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t('reschedule.postponedNow')}
            </p>
            <button
              type="button"
              className={`${btn.secondary} mt-3 w-full`}
              disabled={busy}
              onClick={unpostpone}
            >
              {t('reschedule.unpostpone')}
            </button>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t('reschedule.postponeTitle')}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-semibold text-white active:scale-[.98] disabled:opacity-50"
                disabled={busy}
                onClick={postponeOne}
              >
                {t('reschedule.postpone')}
              </button>
              {dayOpen.length > 1 && (
                <button
                  type="button"
                  className="min-h-11 rounded-xl border border-amber-600 px-4 text-sm font-semibold text-amber-800 active:scale-[.98] disabled:opacity-50 dark:text-amber-300"
                  disabled={busy}
                  onClick={postponeAll}
                >
                  {t('reschedule.postponeDay', { n: f.num(dayOpen.length) })}
                </button>
              )}
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/80">
          {t('reschedule.newDateNote')}
        </p>
      </section>

      <label className="mt-4 block">
        <span className="mb-1 block text-sm font-semibold">{t('reschedule.newTime')}</span>
        <input
          type="time"
          className={`${inputClass} min-h-11`}
          value={time}
          disabled={busy}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>

      <h3 className="mt-5 text-sm font-semibold">{t('reschedule.swapTitle')}</h3>
      {sameDay.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('reschedule.noSwap')}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {sameDay.map((other) => {
            const open = notStarted(other);
            return (
              <li key={other.id}>
                <button
                  type="button"
                  disabled={busy || !open}
                  onClick={() =>
                    void save(
                      swapFixtureTimes(FIXTURES, fx.id, other.id),
                      t('reschedule.savedSwap', {
                        a: f.num(fx.no),
                        b: f.num(other.no),
                      }),
                    )
                  }
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-slate-300 px-3 py-2 text-left active:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:active:bg-slate-800"
                >
                  <span className="tabular shrink-0 font-display text-lg font-bold">
                    {formatTime(other.time, lang, f)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {t('fixtures.matchNo', { n: f.num(other.no) })}
                      {!open && ` · ${t('reschedule.started')}`}
                    </span>
                    <span lang="en" className="block truncate text-sm font-semibold">
                      {names(other)}
                    </span>
                  </span>
                  {open && (
                    <span className="shrink-0 text-sm font-semibold text-bpl-red">
                      {t('reschedule.swap')}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t('reschedule.note')}</p>
    </Sheet>
  );
}
