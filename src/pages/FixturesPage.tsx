import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import {
  FIXTURES,
  HOLIDAYS,
  todayInDhaka,
  tournamentDays,
  type Fixture,
  type StageId,
} from '../data/fixtures';
import { findTeam } from '../data/teams';
import { useFormat } from '../hooks/useFormat';
import { useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import { fixtureTeams, type FixtureOutcome, type TournamentState } from '../tournament/standings';
import { formatDate, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { resultText } from '../utils/matchText';

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
  const loaded = tour !== null;

  // Open the list at the next match day (today's, or the next one), once loaded.
  useEffect(() => {
    if (!loaded) return;
    const today = todayInDhaka();
    const target = FIXTURES.find((fx) => fx.date >= today)?.date;
    if (!target || target === FIXTURES[0].date) return;
    document.getElementById(`day-${target}`)?.scrollIntoView({ block: 'start' });
  }, [loaded]);

  if (!tour) return null;

  const today = todayInDhaka();
  const todays = FIXTURES.filter((fx) => fx.date === today);
  const next = FIXTURES.find((fx) => fx.date > today);
  const list = FIXTURES.filter((fx) => matchesFilter(fx, filter));
  const byDate = new Map<string, Fixture[]>();
  for (const fx of list) byDate.set(fx.date, [...(byDate.get(fx.date) ?? []), fx]);
  const day = (d: string) => formatDate(d, lang, bengaliDigits);

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:max-w-3xl">
      <PageTitle>{t('tabs.fixtures')}</PageTitle>

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

      {(filter === 'all' ? tournamentDays() : [...byDate.keys()]).map((date) => {
        const fxs = byDate.get(date);
        if (!fxs) {
          // A day off inside the tournament
          return (
            <p
              key={date}
              className="flex items-center gap-2 px-1 text-xs text-slate-400 dark:text-slate-500"
            >
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
        <span
          aria-hidden
          className="size-2 animate-pulse rounded-full bg-bpl-red motion-reduce:animate-none"
        />
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

  const cls = `block rounded-2xl p-3 ${
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
