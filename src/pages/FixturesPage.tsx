import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useEdgeFade } from '../hooks/useEdgeFade';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { TeamEdge } from '../components/common/TeamEdge';
import { PageTitle } from '../components/layout/AppShell';
import {
  FIXTURES,
  HOLIDAYS,
  todayInDhaka,
  tournamentDays,
  type Fixture,
  type StageId,
} from '../data/fixtures';
import { findTeam, TOURNAMENT_TEAMS, type TournamentTeam } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { useNow, useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import {
  fixtureTeams,
  type FixtureOutcome,
  type LeagueStage,
  type TournamentState,
} from '../tournament/standings';
import { formatDate, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { teamFixtures, teamRecord } from '../tournament/teamView';
import { resultText } from '../utils/matchText';
// Imported through Vite, the PDF is published under a name with a content fingerprint
// (bpl-2027-fixture-AbC123.pdf), so phones and the host's cache never serve an old copy.
import { FIXTURE_PDF_NAME, fixturePdfUrl } from '../utils/fixturePdf';
import { PageSkeleton } from '../components/common/Skeleton';
import { groupOf } from '../tournament/groups';
import { roleCanScore, useAuth } from '../sync/auth';
import { RescheduleSheet } from '../components/fixtures/RescheduleSheet';
import { QUALIFIERS } from '../tournament/format';
import { countdown } from '../tournament/home';
import { placeIn } from '../tournament/pointsView';
import {
  FIXTURE_FILTERS,
  filterCounts,
  finalDate,
  matchesFilter,
  matchesPerDay,
  msUntilStart,
  playedCount,
  type FixtureFilter,
} from '../tournament/fixturesView';

/** Stage label colours, readable in both themes. */
const STAGE_PILL: Record<StageId, string> = {
  groupA: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  groupB: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200',
  superSix: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  semi1: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  semi2: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  final: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
};
const LEAGUE: readonly StageId[] = ['groupA', 'groupB', 'superSix'];

/** Fixtures tab: today's matches, then the official schedule by date, with live status and results. */
export default function FixturesPage() {
  const { t } = useTranslation();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const tour = useTournament();
  const f = useFormat();
  const [filter, setFilter] = useState<FixtureFilter>('all');
  const chipRow = useEdgeFade<HTMLDivElement>();
  // The chosen team lives in the link (#/fixtures?team=ddc) so it can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const teamId = findTeam(params.get('team') ?? undefined)?.id ?? '';
  const setTeam = (id: string) => setParams(id ? { team: id } : {}, { replace: true });

  // Days already played fold away, so the list opens at the next match day
  const [showPast, setShowPast] = useState(false);
  // A super admin or a scorer can move a match that has not started
  const auth = useAuth();
  const [moving, setMoving] = useState<Fixture | null>(null);
  const onMove = roleCanScore(auth.role) ? setMoving : undefined;

  if (!tour) return <PageSkeleton />;

  const today = todayInDhaka();
  const todays = FIXTURES.filter((fx) => fx.date === today);
  const next = FIXTURES.find((fx) => fx.date > today);
  const pool = teamId ? teamFixtures(teamId, tour.ts) : FIXTURES;
  const counts = filterCounts(pool);
  const list = pool.filter((fx) => matchesFilter(fx, filter));
  const byDate = new Map<string, Fixture[]>();
  for (const fx of list) byDate.set(fx.date, [...(byDate.get(fx.date) ?? []), fx]);
  const day = (d: string) => formatDate(d, lang, bengaliDigits);
  const team = findTeam(teamId || undefined);
  const showRestDays = filter === 'all' && !team;
  // A chosen team's own list stays whole: its results are the point of choosing it
  const foldPast = !team;
  // Today's matches are in the box at the top, so the list starts after today
  const allDates = (showRestDays ? tournamentDays() : [...byDate.keys()]).filter(
    (d) => d !== today || !!team,
  );
  const pastCount = foldPast ? [...byDate.keys()].filter((d) => d < today).length : 0;
  const dates = foldPast && !showPast ? allDates.filter((d) => d > today) : allDates;
  const played = playedCount(tour.ts);
  const final = finalDate();

  const jump = (date: string) => {
    if (date === today && !team) {
      document.getElementById('today')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    // Earlier days are folded away: unfold them first, so the day is on the page to scroll to
    if (date < today && foldPast && !showPast) flushSync(() => setShowPast(true));
    document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl lg:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <PageTitle>{t('tabs.fixtures')}</PageTitle>
        <a
          href={fixturePdfUrl}
          download={FIXTURE_PDF_NAME}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-bpl-red px-3.5 text-sm font-semibold text-white shadow-sm active:scale-95"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12m0 0-5-5m5 5 5-5M5 21h14" />
          </svg>
          {t('fixtures.downloadPdf')}
        </a>
      </div>

      {/* How far the tournament has got */}
      <div className="-mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-600 dark:text-slate-400">
        <span>
          {t('fixtures.progress', { played: f.num(played), total: f.num(FIXTURES.length) })}
        </span>
        <span
          aria-hidden
          className="relative order-last h-1.5 w-full overflow-hidden rounded-full bg-slate-200 sm:order-none sm:w-auto sm:flex-1 dark:bg-slate-800"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-bpl-yellow"
            style={{ width: `${(played / FIXTURES.length) * 100}%` }}
          />
        </span>
        {final && (
          <span>
            {t('fixtures.finalOn', {
              date: formatDate(final, lang, bengaliDigits, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }),
            })}
          </span>
        )}
      </div>

      <section id="today" aria-labelledby="today-title" className="scroll-mt-4">
        <h2
          id="today-title"
          className="mb-2 flex flex-wrap items-baseline gap-x-2 font-display text-xl font-bold tracking-wide"
        >
          <span
            aria-hidden
            className="size-2 self-center rounded-full bg-bpl-yellow shadow-[0_0_0_4px_rgb(245_158_11/0.2)]"
          />
          {t('fixtures.today')}
          <span className="font-sans text-sm font-medium tracking-normal text-slate-600 dark:text-slate-400">
            {day(today)}
          </span>
        </h2>
        {todays.length > 0 ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {todays.map((fx) => (
              <li key={fx.id}>
                <TodayCard fx={fx} ts={tour.ts} onMove={onMove} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
            {t('fixtures.noneToday')}
            {next && ` ${t('fixtures.nextOn', { date: day(next.date) })}`}
          </p>
        )}
      </section>

      {/* Date strip, stage filter and team filter */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-900">
        <DateStrip
          today={today}
          perDay={matchesPerDay(list)}
          onPick={jump}
          label={(d, n) =>
            ` ${formatDate(d, lang, bengaliDigits, { month: 'long' })}, ${
              n > 0 ? t('fixtures.dayMatches', { n: f.num(n), count: n }) : t('fixtures.dayNone')
            }`
          }
        />
        <div
          role="group"
          aria-label={t('fixtures.filter')}
          ref={chipRow}
          className="edge-fade -mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5"
        >
          {FIXTURE_FILTERS.map((fl) => (
            <button
              key={fl}
              type="button"
              aria-pressed={filter === fl}
              onClick={() => setFilter(fl)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap ${
                filter === fl
                  ? 'bg-bpl-yellow text-night-950'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {t(`fixtures.filter_${fl}`)}
              {/* The count is extra; the button's name stays the stage name */}
              <span
                aria-hidden
                className={`rounded-full px-1.5 text-[11px] leading-4 ${
                  filter === fl
                    ? 'bg-night-950/15'
                    : 'bg-white text-slate-600 dark:bg-night-950 dark:text-slate-300'
                }`}
              >
                {f.num(counts[fl])}
              </span>
            </button>
          ))}
        </div>
        <TeamPicker teamId={teamId} onPick={setTeam} />
      </div>

      {team && <TeamRecord team={team} ts={tour.ts} onClear={() => setTeam('')} />}

      {team && list.length === 0 && (
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 dark:text-slate-400 shadow-sm dark:bg-slate-900">
          {t('fixtures.teamNoMatches')}
        </p>
      )}

      {pastCount > 0 && (
        <button
          type="button"
          aria-expanded={showPast}
          onClick={() => setShowPast((v) => !v)}
          className="min-h-11 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          {showPast
            ? t('fixtures.hidePast')
            : t('fixtures.showPast', { n: f.num(pastCount), count: pastCount })}
        </button>
      )}

      {dates.map((date) => {
        const fxs = byDate.get(date);
        if (!fxs) {
          // A day off inside the tournament
          return (
            <p
              key={date}
              className="flex items-center gap-2 px-1 text-xs text-slate-600 dark:text-slate-400"
            >
              <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              {day(date)} · {t('fixtures.restDay')}
              {HOLIDAYS.includes(date) && ` (${t('fixtures.holiday')})`}
              <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </p>
          );
        }
        const short = (opts: Intl.DateTimeFormatOptions) =>
          formatDate(date, lang, bengaliDigits, opts);
        return (
          <section
            key={date}
            id={`day-${date}`}
            aria-label={day(date)}
            className="scroll-mt-4 md:grid md:grid-cols-[4.5rem_minmax(0,1fr)] md:gap-3"
          >
            {/* Phones: a heading that stays at the top while its matches scroll past.
                Wider screens: a date block beside the day's matches. */}
            <h2
              className={`sticky top-[env(safe-area-inset-top)] z-10 -mx-4 mb-1 bg-slate-100/95 px-4 py-1.5 font-display text-lg font-bold tracking-wide backdrop-blur-sm md:static md:mx-0 md:mb-0 md:flex md:flex-col md:items-center md:justify-center md:rounded-2xl md:bg-white md:p-2 md:text-center md:shadow-sm md:backdrop-blur-none dark:bg-slate-950/95 md:dark:bg-slate-900 ${
                date === today
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-600 md:text-slate-900 dark:text-slate-400 md:dark:text-slate-100'
              }`}
            >
              <span className="md:hidden">
                {day(date)}
                {date === today && ` · ${t('fixtures.today')}`}
              </span>
              <span aria-hidden className="hidden md:contents">
                <span className="font-sans text-xs font-medium text-slate-600 dark:text-slate-400">
                  {short({ weekday: 'short' })}
                </span>
                <span className="text-3xl leading-none font-extrabold">
                  {short({ day: 'numeric' })}
                </span>
                <span className="font-sans text-xs font-medium text-slate-600 dark:text-slate-400">
                  {short({ month: 'short' })}
                </span>
              </span>
            </h2>
            <ul className="grid gap-2 md:grid-cols-2 md:gap-3">
              {fxs.map((fx) => (
                <li key={fx.id}>
                  <FixtureCard fx={fx} ts={tour.ts} highlight={date === today} onMove={onMove} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {moving && (
        <RescheduleSheet
          fx={moving}
          ts={tour.ts}
          onClose={() => setMoving(null)}
          // FIXTURES was updated in place; closing the sheet re-renders the list
          onSaved={() => setMoving(null)}
        />
      )}
    </main>
  );
}

/** Every tournament day as a small tile with a dot per match; tap one to jump to it. */
function DateStrip({
  today,
  perDay,
  onPick,
  label,
}: {
  today: string;
  perDay: Map<string, number>;
  onPick: (date: string) => void;
  label: (date: string, n: number) => string;
}) {
  const { t } = useTranslation();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const row = useRef<HTMLDivElement>(null);
  const fade = useEdgeFade<HTMLDivElement>();
  // Open with today (or the start, before the tournament) in view
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[data-today]');
    if (el && row.current) {
      row.current.scrollLeft = el.offsetLeft - row.current.clientWidth / 2 + el.clientWidth / 2;
    }
  }, []);
  const fmt = (d: string, opts: Intl.DateTimeFormatOptions) =>
    formatDate(d, lang, bengaliDigits, opts);
  return (
    <div
      role="group"
      aria-label={t('fixtures.dates')}
      ref={(el) => {
        row.current = el;
        fade(el);
      }}
      className="edge-fade -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5"
    >
      {tournamentDays().map((d) => {
        const n = perDay.get(d) ?? 0;
        const isToday = d === today;
        return (
          <button
            key={d}
            type="button"
            data-today={isToday || undefined}
            aria-current={isToday ? 'date' : undefined}
            disabled={n === 0}
            onClick={() => onPick(d)}
            className={`relative flex min-h-14 w-11 shrink-0 flex-col items-center justify-center rounded-xl border pt-1 pb-1.5 ${
              isToday
                ? 'border-bpl-yellow bg-bpl-yellow text-night-950'
                : d < today
                  ? 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-night-950 dark:text-slate-400'
                  : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-night-950 dark:text-slate-100'
            } disabled:border-transparent disabled:bg-transparent disabled:opacity-50`}
          >
            <span className="text-[11px] leading-tight">{fmt(d, { weekday: 'short' })}</span>
            <span className="font-display text-lg leading-tight font-bold">
              {fmt(d, { day: 'numeric' })}
            </span>
            <span className="sr-only">{label(d, n)}</span>
            <span aria-hidden className="flex h-1.5 gap-0.5">
              {Array.from({ length: Math.min(n, 3) }, (_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full ${
                    isToday ? 'bg-night-950' : d < today ? 'bg-slate-400' : 'bg-bpl-yellow'
                  }`}
                />
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The twelve team logos: tap one to see only its matches, tap it again for all teams. */
function TeamPicker({ teamId, onPick }: { teamId: string; onPick: (id: string) => void }) {
  const { t } = useTranslation();
  const fade = useEdgeFade<HTMLDivElement>();
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
        {t('fixtures.team')}
      </span>
      <div
        role="group"
        aria-label={t('fixtures.team')}
        ref={fade}
        className="edge-fade -mr-3 flex min-w-0 flex-1 gap-1 overflow-x-auto pr-3 pb-0.5"
      >
        <button
          type="button"
          aria-pressed={!teamId}
          onClick={() => onPick('')}
          className={`flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-semibold ${
            !teamId
              ? 'bg-night-950 text-white dark:bg-white dark:text-night-950'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {t('fixtures.allTeams')}
        </button>
        {TOURNAMENT_TEAMS.map((tm) => {
          const on = tm.id === teamId;
          return (
            <button
              key={tm.id}
              type="button"
              aria-pressed={on}
              aria-label={tm.name}
              title={tm.name}
              onClick={() => onPick(on ? '' : tm.id)}
              className={`grid size-11 shrink-0 place-items-center rounded-full transition ${
                teamId && !on ? 'opacity-40' : ''
              }`}
            >
              <span
                className={`rounded-full p-[2px] ${on ? 'scale-110' : ''}`}
                style={{ backgroundColor: on ? tm.color : 'transparent' }}
              >
                <TeamAvatar name={tm.name} color={tm.color} logo={tm.logo} size="sm" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Where a team stands in its league table, as a small chip (qualifying places in green). */
function PlaceChip({
  fx,
  teamId,
  ts,
}: {
  fx: Fixture;
  teamId: string | null;
  ts: TournamentState;
}) {
  const { t } = useTranslation();
  if (!teamId || !LEAGUE.includes(fx.stage)) return null;
  const stage = fx.stage as LeagueStage;
  const pos = placeIn(stage, teamId, ts);
  if (!pos) return null;
  const q = pos <= (stage === 'superSix' ? QUALIFIERS.superSix : QUALIFIERS.group);
  return (
    <span
      className={`shrink-0 rounded-md px-1.5 text-[11px] leading-5 font-semibold ${
        q
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {t(`slot.ord${pos}`)}
      {q && <span className="sr-only"> {t('points.qualifiedMark')}</span>}
    </span>
  );
}

/** Live, result, postponed or abandoned state; otherwise null. */
function useStatus(fx: Fixture, outcome: FixtureOutcome) {
  const { t } = useTranslation();
  if (outcome.status === 'live')
    return (
      <span className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400">
        <span aria-hidden className="live-pulse size-2 rounded-full bg-bpl-red text-bpl-red" />
        {t('fixtures.live')}
      </span>
    );
  if (outcome.abandoned)
    return (
      <span className="font-bold text-amber-700 dark:text-amber-300">
        {t('fixtures.abandoned')}
      </span>
    );
  if (outcome.status === 'completed')
    return (
      <span className="font-bold text-emerald-700 dark:text-emerald-400">
        {t('fixtures.completed')}
      </span>
    );
  if (fx.postponed)
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-300/15 dark:text-amber-300">
        {t('fixtures.postponed')}
      </span>
    );
  return null;
}

/** The team index that won, when the match has a winner. */
function winnerId(outcome: FixtureOutcome): string | undefined {
  const r = outcome.result;
  if (outcome.status !== 'completed' || !r || r.kind !== 'won' || !outcome.match) return undefined;
  return outcome.match.teams[r.winner]?.teamId;
}

/** Notes under a card: postponed, abandoned, the result, and the admin's change-time button. */
function CardNotes({
  fx,
  outcome,
  onMove,
}: {
  fx: Fixture;
  outcome: FixtureOutcome;
  onMove?: (fx: Fixture) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const match = outcome.match;
  return (
    <>
      {fx.postponed && outcome.status === 'scheduled' && (
        <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {t('fixtures.postponedNote')}
        </p>
      )}
      {outcome.abandoned && (
        <p className="mt-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
          {t('fixtures.abandonedResult')}
        </p>
      )}
      {outcome.status === 'completed' && outcome.result && match && (
        <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          {resultText(outcome.result, match, t, f)}
        </p>
      )}
      {onMove && outcome.status === 'scheduled' && (
        <div className="relative z-10 mt-1 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              // The card itself may be a link
              e.preventDefault();
              onMove(fx);
            }}
            className="-mr-1 -mb-1 flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-bpl-red dark:text-rose-400"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            {t('reschedule.change')}
          </button>
        </div>
      )}
    </>
  );
}

/** A card that opens the match once it has started; a plain box before that. */
function CardShell({
  outcome,
  className,
  children,
}: {
  outcome: FixtureOutcome;
  className: string;
  children: React.ReactNode;
}) {
  const match = outcome.match;
  return match && !outcome.abandoned ? (
    <Link to={`/match/${match.id}`} className={`${className} active:opacity-80`}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}

/** Today's match, large: both logos, places in the table, a countdown, then the live score or result. */
function TodayCard({
  fx,
  ts,
  onMove,
}: {
  fx: Fixture;
  ts: TournamentState;
  onMove?: (fx: Fixture) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const now = useNow(30_000);
  const outcome: FixtureOutcome = ts.outcomes.get(fx.id) ?? { status: 'scheduled' };
  const sides = fixtureTeams(fx, ts);
  const winner = winnerId(outcome);
  const status = useStatus(fx, outcome);
  const ms = outcome.status === 'scheduled' ? msUntilStart(fx, now) : null;
  const left = ms !== null ? countdown(ms, 0) : null;
  const time = formatTime(fx.time, lang, f);

  const side = (i: 0 | 1) => {
    const id = sides[i];
    const team = findTeam(id ?? undefined);
    const inn = outcome.innings?.find((x) => x.teamId && x.teamId === id);
    const lost = !!winner && !!id && winner !== id;
    return (
      <div
        className={`flex min-w-0 flex-col items-center gap-1.5 text-center ${lost ? 'text-slate-600 dark:text-slate-400' : ''}`}
      >
        {team ? (
          <span
            className={`rounded-full p-[3px] ${lost ? 'opacity-50' : ''}`}
            style={{
              backgroundColor: team.color,
              boxShadow: `0 10px 22px -10px ${team.color}`,
            }}
          >
            <span className="block rounded-full bg-white p-0.5 dark:bg-slate-900">
              <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="lg" />
            </span>
          </span>
        ) : (
          <span
            aria-hidden
            className="grid size-[4.5rem] place-items-center rounded-full border-2 border-dashed border-slate-400 text-xl text-slate-500"
          >
            ?
          </span>
        )}
        <span
          lang={team ? 'en' : undefined}
          className={`text-[15px] leading-tight font-bold break-words ${team ? '' : 'italic opacity-70'}`}
        >
          {slotLabel(i === 0 ? fx.teamA : fx.teamB, id, t, f)}
        </span>
        {inn ? (
          <span className="tabular font-display text-xl leading-none font-bold">
            {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
            <span className="font-sans text-xs font-normal text-slate-600 dark:text-slate-400">
              ({f.overs(inn.legalBalls)})
            </span>
          </span>
        ) : (
          <PlaceChip fx={fx} teamId={id} ts={ts} />
        )}
      </div>
    );
  };

  return (
    <CardShell
      outcome={outcome}
      className={`relative block h-full overflow-hidden rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 ${
        outcome.status === 'live'
          ? 'ring-2 ring-bpl-red/70'
          : 'ring-1 ring-slate-200 dark:ring-slate-800'
      }`}
    >
      <TeamEdge
        a={findTeam(sides[0] ?? undefined)?.color}
        b={findTeam(sides[1] ?? undefined)?.color}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {t('fixtures.matchNo', { n: f.num(fx.no) })}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${STAGE_PILL[fx.stage]}`}>
          {stageLabel(fx.stage, t)}
        </span>
        <span className="ml-auto">
          {status ?? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
              {left
                ? t('fixtures.startsIn', {
                    time:
                      left.hours > 0
                        ? t('fixtures.hoursMins', {
                            h: f.num(left.hours),
                            m: f.num(String(left.minutes).padStart(2, '0')),
                          })
                        : t('fixtures.mins', { n: f.num(Math.max(1, left.minutes)) }),
                  })
                : t('fixtures.startsAt', { time })}
            </span>
          )}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        {side(0)}
        <div className="flex flex-col items-center px-1">
          <span className="font-display text-lg leading-tight font-bold whitespace-nowrap">
            {time}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">{t('common.vs')}</span>
        </div>
        {side(1)}
      </div>
      <CardNotes fx={fx} outcome={outcome} onMove={onMove} />
    </CardShell>
  );
}

/** The chosen team's record so far: played, won, lost, tied or no result, and the next match. */
function TeamRecord({
  team,
  ts,
  onClear,
}: {
  team: TournamentTeam;
  ts: TournamentState;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const mine = teamFixtures(team.id, ts);
  const {
    played,
    won,
    lost,
    tiedNr,
    next: upcoming,
    onlyGroupSoFar,
  } = teamRecord(team.id, ts, todayInDhaka());
  const stats: [string, number][] = [
    [t('points.playedLong'), played],
    [t('points.wonLong'), won],
    [t('points.lostLong'), lost],
    [t('points.tiedLong'), tiedNr],
  ];

  return (
    <section
      aria-label={team.name}
      className="rounded-2xl border-l-4 bg-white p-4 shadow-sm dark:bg-slate-900"
      style={{ borderLeftColor: team.color }}
    >
      <div className="flex items-center gap-3">
        <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="md" />
        <div className="min-w-0 flex-1">
          <h2 lang="en" className="font-display text-xl leading-tight font-bold">
            {team.name}
          </h2>
          <p className="text-[13px] text-slate-600 dark:text-slate-400">
            {t(`fixtures.filter_group${groupOf(team.id) ?? team.group}`)} ·{' '}
            {t('fixtures.teamMatches', { n: f.num(mine.length) })}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 dark:text-slate-300 dark:ring-slate-700"
        >
          {t('fixtures.clearTeam')}
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {stats.map(([label, n]) => (
          <div
            key={label}
            className="flex flex-col-reverse rounded-xl bg-slate-50 px-1 py-2 dark:bg-slate-800"
          >
            <dt className="mt-1 text-xs leading-tight text-slate-500 dark:text-slate-400">
              {label}
            </dt>
            <dd className="tabular font-display text-2xl leading-none font-bold">{f.num(n)}</dd>
          </div>
        ))}
      </dl>
      {upcoming && (
        <p className="mt-3 text-sm">
          {t('fixtures.nextOn', {
            date: `${formatDate(upcoming.date, lang, bengaliDigits)}, ${formatTime(upcoming.time, lang, f)}`,
          })}
        </p>
      )}
      {onlyGroupSoFar && (
        <p className="mt-2 text-[13px] text-slate-600 dark:text-slate-400">
          {t('fixtures.teamLater')}
        </p>
      )}
    </section>
  );
}

function FixtureCard({
  fx,
  ts,
  highlight,
  onMove,
}: {
  fx: Fixture;
  ts: TournamentState;
  highlight?: boolean;
  /** Set for a super admin or a scorer: opens the change-time / postpone sheet. */
  onMove?: (fx: Fixture) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const outcome: FixtureOutcome = ts.outcomes.get(fx.id) ?? { status: 'scheduled' };
  const sides = fixtureTeams(fx, ts);
  const winner = winnerId(outcome);
  const status = useStatus(fx, outcome);

  const side = (i: 0 | 1) => {
    const id = sides[i];
    const team = findTeam(id ?? undefined);
    const label = slotLabel(i === 0 ? fx.teamA : fx.teamB, id, t, f);
    const inn = outcome.innings?.find((x) => x.teamId && x.teamId === id);
    const lost = !!winner && !!id && winner !== id;
    return (
      <div
        className={`flex items-center gap-2 ${lost ? 'text-slate-600 dark:text-slate-400' : ''}`}
      >
        {team ? (
          <span
            className={`shrink-0 rounded-full p-[2px] ${lost ? 'opacity-50' : ''}`}
            style={{ backgroundColor: team.color }}
          >
            <span className="block rounded-full bg-white p-px dark:bg-slate-900">
              <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="sm" />
            </span>
          </span>
        ) : (
          <span
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-400 text-xs text-slate-500 dark:text-slate-400"
          >
            ?
          </span>
        )}
        <span
          lang={team ? 'en' : undefined}
          className={`min-w-0 flex-1 leading-tight ${winner === id && id ? 'font-bold' : 'font-semibold'} ${team ? '' : 'italic opacity-70'}`}
        >
          {label}
        </span>
        {inn ? (
          <span className="tabular shrink-0 font-display text-lg font-bold">
            {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
            <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
              ({f.overs(inn.legalBalls)})
            </span>
          </span>
        ) : (
          outcome.status === 'scheduled' && <PlaceChip fx={fx} teamId={id} ts={ts} />
        )}
      </div>
    );
  };

  return (
    <CardShell
      outcome={outcome}
      className={`relative block h-full overflow-hidden rounded-2xl bg-white p-3 pl-4 shadow-sm dark:bg-slate-900 ${
        outcome.status === 'live'
          ? 'ring-2 ring-bpl-red/70'
          : highlight
            ? 'ring-2 ring-sky-400'
            : ''
      }`}
    >
      <TeamEdge
        a={findTeam(sides[0] ?? undefined)?.color}
        b={findTeam(sides[1] ?? undefined)?.color}
      />
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>{t('fixtures.matchNo', { n: f.num(fx.no) })}</span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${STAGE_PILL[fx.stage]}`}>
          {stageLabel(fx.stage, t)}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {outcome.status !== 'scheduled' && <span>{formatTime(fx.time, lang, f)}</span>}
          {status ?? (
            <span className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {formatTime(fx.time, lang, f)}
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {side(0)}
        {side(1)}
      </div>
      <CardNotes fx={fx} outcome={outcome} onMove={onMove} />
    </CardShell>
  );
}
