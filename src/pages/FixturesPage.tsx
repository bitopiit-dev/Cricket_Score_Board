import { useEffect, useState } from 'react';
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
import { useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import { fixtureTeams, type FixtureOutcome, type TournamentState } from '../tournament/standings';
import { formatDate, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { teamFixtures, teamRecord } from '../tournament/teamView';
import { resultText } from '../utils/matchText';
// Imported through Vite, the PDF is published under a name with a content fingerprint
// (bpl-2027-fixture-AbC123.pdf), so phones and the host's cache never serve an old copy.
// Rebuild both files with: python scripts/build-fixture-pdf.py
import fixturePdfUrl from '../assets/bpl-2027-fixture.pdf?url';
import fixturePdfInfo from '../assets/bpl-2027-fixture.json';
import { PageSkeleton } from '../components/common/Skeleton';
import { groupOf } from '../tournament/groups';

/** Download name carries the update date, so a new copy never overwrites or hides behind the old one. */
const FIXTURE_PDF_NAME = `BPL-2027-Fixture-${fixturePdfInfo.updated}.pdf`;

type Filter = 'all' | 'groupA' | 'groupB' | 'superSix' | 'knockout';
const FILTERS: Filter[] = ['all', 'groupA', 'groupB', 'superSix', 'knockout'];
const KNOCKOUT: StageId[] = ['semi1', 'semi2', 'final'];

const matchesFilter = (fx: Fixture, filter: Filter) =>
  filter === 'all' || (filter === 'knockout' ? KNOCKOUT.includes(fx.stage) : fx.stage === filter);

/** Fixtures tab: the official schedule by date, with live status and results. */
export default function FixturesPage() {
  const { t } = useTranslation();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const tour = useTournament();
  const [filter, setFilter] = useState<Filter>('all');
  // The chosen team lives in the link (#/fixtures?team=ddc) so it can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const teamId = findTeam(params.get('team') ?? undefined)?.id ?? '';
  const setTeam = (id: string) => setParams(id ? { team: id } : {}, { replace: true });
  const loaded = tour !== null;

  // Open the list at the next match day (today's, or the next one), once loaded.
  useEffect(() => {
    if (!loaded || teamId) return;
    const today = todayInDhaka();
    const target = FIXTURES.find((fx) => fx.date >= today)?.date;
    if (!target || target === FIXTURES[0].date) return;
    document.getElementById(`day-${target}`)?.scrollIntoView({ block: 'start' });
  }, [loaded, teamId]);

  if (!tour) return <PageSkeleton />;

  const today = todayInDhaka();
  const todays = FIXTURES.filter((fx) => fx.date === today);
  const next = FIXTURES.find((fx) => fx.date > today);
  const pool = teamId ? teamFixtures(teamId, tour.ts) : FIXTURES;
  const list = pool.filter((fx) => matchesFilter(fx, filter));
  const byDate = new Map<string, Fixture[]>();
  for (const fx of list) byDate.set(fx.date, [...(byDate.get(fx.date) ?? []), fx]);
  const day = (d: string) => formatDate(d, lang, bengaliDigits);
  const team = findTeam(teamId || undefined);
  const showRestDays = filter === 'all' && !team;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <PageTitle>{t('tabs.fixtures')}</PageTitle>
        <a
          href={fixturePdfUrl}
          download={FIXTURE_PDF_NAME}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-bpl-red px-3.5 py-2 text-sm font-semibold text-white shadow-sm active:scale-95"
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

      <section aria-label={t('fixtures.today')} className="rounded-2xl bg-night-950 p-4 text-white">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-wide text-bpl-yellow">
          <span aria-hidden className="size-2 rounded-full bg-bpl-yellow" />
          {t('fixtures.today')} · {day(today)}
        </h2>
        {todays.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {todays.map((fx) => (
              <li key={fx.id}>
                <FixtureCard fx={fx} ts={tour.ts} dark />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-night-muted">
            {t('fixtures.noneToday')}
            {next && ` ${t('fixtures.nextOn', { date: day(next.date) })}`}
          </p>
        )}
      </section>

      <div
        role="group"
        aria-label={t('fixtures.filter')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {FILTERS.map((fl) => (
          <button
            key={fl}
            type="button"
            aria-pressed={filter === fl}
            onClick={() => setFilter(fl)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold whitespace-nowrap ${
              filter === fl
                ? 'bg-bpl-yellow text-night-950'
                : 'bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {t(`fixtures.filter_${fl}`)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {t('fixtures.team')}
        </span>
        <select
          value={teamId}
          onChange={(e) => setTeam(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">{t('fixtures.allTeams')}</option>
          {TOURNAMENT_TEAMS.map((tm) => (
            <option key={tm.id} value={tm.id} lang="en">
              {tm.name}
            </option>
          ))}
        </select>
      </label>

      {team && <TeamRecord team={team} ts={tour.ts} onClear={() => setTeam('')} />}

      {team && list.length === 0 && (
        <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm dark:bg-slate-900">
          {t('fixtures.teamNoMatches')}
        </p>
      )}

      {(showRestDays ? tournamentDays() : [...byDate.keys()]).map((date) => {
        const fxs = byDate.get(date);
        if (!fxs) {
          // A day off inside the tournament
          return (
            <p key={date} className="flex items-center gap-2 px-1 text-xs text-slate-500">
              <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              {day(date)} · {t('fixtures.restDay')}
              {HOLIDAYS.includes(date) && ` (${t('fixtures.holiday')})`}
              <span aria-hidden className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </p>
          );
        }
        return (
          <section key={date} id={`day-${date}`} aria-label={day(date)} className="scroll-mt-4">
            <h2
              className={`mb-2 font-display text-lg font-bold tracking-wide ${
                date === today ? 'text-bpl-red' : 'text-slate-500'
              }`}
            >
              {day(date)}
              {date === today && ` · ${t('fixtures.today')}`}
            </h2>
            <ul className="flex flex-col gap-2">
              {fxs.map((fx) => (
                <li key={fx.id}>
                  <FixtureCard fx={fx} ts={tour.ts} highlight={date === today} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
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
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 dark:text-slate-300 dark:ring-slate-700"
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
  dark,
  highlight,
}: {
  fx: Fixture;
  ts: TournamentState;
  dark?: boolean;
  highlight?: boolean;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const outcome: FixtureOutcome = ts.outcomes.get(fx.id) ?? { status: 'scheduled' };
  const sides = fixtureTeams(fx, ts);
  const match = outcome.match;

  const side = (i: 0 | 1) => {
    const id = sides[i];
    const team = findTeam(id ?? undefined);
    const label = slotLabel(i === 0 ? fx.teamA : fx.teamB, id, t, f);
    const inn = outcome.innings?.find((x) => x.teamId && x.teamId === id);
    return (
      <div className="flex items-center gap-2">
        {team ? (
          <TeamAvatar name={team.name} color={team.color} logo={team.logo} size="sm" />
        ) : (
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-400 text-xs text-slate-400"
          >
            ?
          </span>
        )}
        <span
          lang={team ? 'en' : undefined}
          className={`min-w-0 flex-1 leading-tight font-semibold ${team ? '' : 'italic opacity-70'}`}
        >
          {label}
        </span>
        {inn && (
          <span className="tabular shrink-0 font-display text-lg font-bold">
            {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
            <span className="text-xs font-normal opacity-70">({f.overs(inn.legalBalls)})</span>
          </span>
        )}
      </div>
    );
  };

  const status =
    outcome.status === 'live' ? (
      <span className="flex items-center gap-1.5 font-bold text-bpl-red">
        <span aria-hidden className="live-pulse size-2 rounded-full bg-bpl-red text-bpl-red" />
        {t('fixtures.live')}
      </span>
    ) : outcome.status === 'completed' ? (
      <span className="font-bold text-emerald-700 dark:text-emerald-400">
        {t('fixtures.completed')}
      </span>
    ) : (
      <span>{formatTime(fx.time, lang, f)}</span>
    );

  const body = (
    <>
      <TeamEdge
        a={findTeam(sides[0] ?? undefined)?.color}
        b={findTeam(sides[1] ?? undefined)?.color}
      />
      <div
        className={`flex items-center justify-between gap-2 text-xs ${dark ? 'text-night-muted' : 'text-slate-500 dark:text-slate-400'}`}
      >
        <span>
          {t('fixtures.matchNo', { n: f.num(fx.no) })} · {stageLabel(fx.stage, t)}
          {outcome.status !== 'scheduled' && ` · ${formatTime(fx.time, lang, f)}`}
        </span>
        {status}
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {side(0)}
        {side(1)}
      </div>
      {outcome.status === 'completed' && outcome.result && match && (
        <p
          className={`mt-2 text-sm font-semibold ${dark ? 'text-bpl-yellow' : 'text-emerald-700 dark:text-emerald-400'}`}
        >
          {resultText(outcome.result, match, t, f)}
        </p>
      )}
    </>
  );

  const cls = `relative block overflow-hidden rounded-2xl p-3 pl-4 ${
    dark
      ? 'border border-night-line bg-night-900'
      : `bg-white shadow-sm dark:bg-slate-900 ${highlight ? 'ring-2 ring-sky-400' : ''}`
  } ${outcome.status === 'live' ? 'ring-2 ring-bpl-red/70' : ''}`;

  return match ? (
    <Link to={`/match/${match.id}`} className={`${cls} active:opacity-80`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
