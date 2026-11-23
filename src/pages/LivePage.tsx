import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { btn } from '../components/common/controls';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { PageTitle } from '../components/layout/AppShell';
import { LiveScoreboard } from '../components/live/LiveScoreboard';
import { NextMatchCountdown } from '../components/live/NextMatchCountdown';
import { NoticeBanner } from '../components/layout/NoticeBanner';
import { teamColors } from '../components/match/WinChance';
import {
  fixtureById,
  isAbandonedMatch,
  isCalledOff,
  isVoidMatch,
  todayInDhaka,
} from '../data/fixtures';
import { findTeam } from '../data/teams';
import { matchRepository } from '../db/repository';
import { deriveMatchState } from '../engine/scoring';
import type { Match, MatchState, TeamIndex } from '../engine/types';
import { useFormat } from '../hooks/useFormat';
import { usePrefs } from '../store/prefsStore';
import { useCanScore } from '../sync/auth';
import { MATCHES_CHANGED } from '../sync/matchSync';
import { FIXTURE_FILTERS, type FixtureFilter } from '../tournament/fixturesView';
import { battingOrder, filterOf, newestFirst } from '../tournament/liveView';
import { formatDate, stageLabel } from '../utils/fixtureText';
import { resultText } from '../utils/matchText';
import { PageSkeleton } from '../components/common/Skeleton';

type Row = { m: Match; s: MatchState };

/** Results shown before "Show earlier results". */
const FOLD = 6;

/** Live tab: the match being played (or the countdown to the next), then the results, newest first. */
export default function LivePage() {
  const { t } = useTranslation();
  const f = useFormat();
  const canScore = useCanScore();
  const [matches, setMatches] = useState<Row[] | null>(null);
  const [filter, setFilter] = useState<FixtureFilter>('all');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const load = () =>
      void matchRepository.list().then((ms) => {
        setMatches(ms.map((m) => ({ m, s: deriveMatchState(m) })));
      });
    load();
    // Live scores from the scorer's phone, plus a slow refresh as a backstop
    window.addEventListener(MATCHES_CHANGED, load);
    const timer = setInterval(load, 20000);
    return () => {
      window.removeEventListener(MATCHES_CHANGED, load);
      clearInterval(timer);
    };
  }, []);

  const live = newestFirst((matches ?? []).filter(isLive));
  const results = newestFirst((matches ?? []).filter((row) => !isLive(row)));
  // Stage filters only for stages that have a result
  const filters = FIXTURE_FILTERS.filter(
    (fl) => fl === 'all' || results.some((r) => filterOf(r.m) === fl),
  );
  const filtered = filter === 'all' ? results : results.filter((r) => filterOf(r.m) === filter);
  const shown = showAll ? filtered : filtered.slice(0, FOLD);
  const hidden = filtered.length - shown.length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-3xl lg:max-w-5xl">
      <div className="flex items-end justify-between gap-3">
        <div>
          <PageTitle>{t('tabs.live')}</PageTitle>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('live.subtitle')}</p>
        </div>
        {/* Only scorers and super admins start matches; viewers just follow them */}
        {canScore && (
          <Link to="/new" className={`${btn.primary} shrink-0 px-4 py-2`}>
            + {t('home.newMatch')}
          </Link>
        )}
      </div>
      {/* A match being played comes first, big; the countdown waits below it */}
      {live.map((row) => (
        <LiveScoreboard key={row.m.id} {...row} />
      ))}
      {live.length === 0 && <NextMatchCountdown />}
      <NoticeBanner page="live" />
      {matches === null && <PageSkeleton variant="hero" inline />}
      {matches?.length === 0 && (
        <p className="rounded-2xl bg-white py-10 text-center text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          {canScore ? t('home.noMatches') : t('home.noMatchesViewer')}
        </p>
      )}

      {results.length > 0 && (
        <section aria-labelledby="live-results" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div>
              <h2 id="live-results" className="font-display text-2xl font-bold tracking-wide">
                {t('live.results')}
              </h2>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">
                {t('live.resultsCount', { n: f.num(filtered.length), count: filtered.length })}
              </p>
            </div>
            {filters.length > 2 && (
              <div role="group" aria-label={t('fixtures.filter')} className="flex flex-wrap gap-2">
                {filters.map((fl) => (
                  <button
                    key={fl}
                    type="button"
                    aria-pressed={filter === fl}
                    onClick={() => {
                      setFilter(fl);
                      setShowAll(false);
                    }}
                    className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                      filter === fl
                        ? 'bg-bpl-yellow text-night-950'
                        : 'bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {t(`fixtures.filter_${fl}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((row) => (
              <li key={row.m.id}>
                <ResultCard {...row} />
              </li>
            ))}
          </ul>
          {(hidden > 0 || showAll) && filtered.length > FOLD && (
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll((v) => !v)}
              className="min-h-11 rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {showAll
                ? t('live.hideEarlier')
                : t('live.showEarlier', { n: f.num(hidden), count: hidden })}
            </button>
          )}
        </section>
      )}

      {live.length > 0 && <NextMatchCountdown />}
    </main>
  );
}

const isLive = ({ m, s }: Row) => s.phase !== 'completed' && m.events.length > 0 && !isCalledOff(m);

const STAGE_PILL: Record<string, string> = {
  groupA: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  groupB: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200',
  superSix: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  knockout: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
};

/** A finished (or called-off, or not yet started) match: both sides with their scores and the result. */
function ResultCard({ m, s }: Row) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((st) => st.lang);
  const bengaliDigits = usePrefs((st) => st.bengaliDigits);
  const fx = fixtureById(m.fixtureId);
  const voided = isVoidMatch(m);
  const calledOff = isAbandonedMatch(m) || voided;
  const done = s.phase === 'completed' || calledOff;
  const winner = s.phase === 'completed' && s.result?.kind === 'won' ? s.result.winner : null;
  const date = fx?.date ?? todayInDhaka(new Date(m.updatedAt));
  const day =
    date === todayInDhaka()
      ? t('live.today')
      : formatDate(date, lang, bengaliDigits, { weekday: 'short', day: 'numeric', month: 'short' });
  const [ca, cb] = teamColors(m);

  const footer = voided
    ? { text: t('fixtures.replayedResult'), cls: 'text-amber-700 dark:text-amber-300' }
    : calledOff
      ? { text: t('fixtures.abandonedResult'), cls: 'text-amber-700 dark:text-amber-300' }
      : s.phase === 'completed' && s.result
        ? { text: resultText(s.result, m, t, f), cls: 'text-emerald-700 dark:text-emerald-400' }
        : {
            text: m.events.length === 0 ? t('home.notStarted') : t('home.inProgress'),
            cls: 'text-slate-600 dark:text-slate-400',
          };

  const side = (ti: TeamIndex) => {
    const team = m.teams[ti];
    const tm = findTeam(team.teamId);
    const inn = s.innings.find((x) => !x.superOver && x.battingTeam === ti);
    const lost = winner !== null && winner !== ti;
    return (
      <div
        className={`flex items-center gap-2.5 py-1 ${lost ? 'text-slate-600 dark:text-slate-400' : ''}`}
      >
        <span
          className={`shrink-0 rounded-full p-[2px] ${lost ? 'opacity-50' : ''}`}
          style={{ backgroundColor: ti === 0 ? ca : cb }}
        >
          <span className="block rounded-full bg-white p-px dark:bg-slate-900">
            <TeamAvatar name={team.name} color={tm?.color} logo={tm?.logo} size="sm" />
          </span>
        </span>
        <span
          lang="en"
          className={`min-w-0 flex-1 leading-tight ${winner === ti ? 'font-bold' : 'font-semibold'}`}
        >
          {team.name}
        </span>
        {inn ? (
          <span className="tabular shrink-0 font-display text-2xl leading-none font-bold">
            {f.num(inn.runs)}/{f.num(inn.wickets)}
            <span className="ml-1 font-sans text-xs font-normal text-slate-600 dark:text-slate-400">
              ({f.overs(inn.legalBalls)})
            </span>
          </span>
        ) : (
          done && (
            <span className="shrink-0 text-xs text-slate-600 dark:text-slate-400">
              {t('live.didNotBat')}
            </span>
          )
        )}
      </div>
    );
  };

  const filterKey = filterOf(m);
  return (
    <Link
      to={`/match/${m.id}`}
      style={{ '--a': ca, '--b': cb } as CSSProperties}
      className={`flex h-full flex-col rounded-2xl bg-white p-3.5 shadow-sm active:bg-slate-50 dark:bg-slate-900 dark:active:bg-slate-800 ${
        calledOff ? 'ring-1 ring-amber-400/50' : 'ring-1 ring-slate-200 dark:ring-slate-800'
      }`}
    >
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>
          {fx
            ? t('fixtures.matchNo', { n: f.num(fx.no) })
            : t('home.oversFormat', { overs: f.num(m.settings.overs), count: m.settings.overs })}
        </span>
        {fx && filterKey && (
          <span className={`rounded-full px-2 py-0.5 font-semibold ${STAGE_PILL[filterKey]}`}>
            {stageLabel(fx.stage, t)}
          </span>
        )}
        <span className="ml-auto">{day}</span>
      </div>
      <div className="mb-2">
        {battingOrder(s).map((ti) => (
          <div key={ti}>{side(ti)}</div>
        ))}
      </div>
      <p
        className={`mt-auto border-t border-slate-100 pt-2 text-sm font-semibold dark:border-slate-800 ${footer.cls}`}
      >
        {footer.text}
      </p>
    </Link>
  );
}
