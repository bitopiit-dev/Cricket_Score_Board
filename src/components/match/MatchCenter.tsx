import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '../common/Header';
import { Icon } from '../common/icons';
import { toast } from '../common/Toast';
import { TeamAvatar } from '../common/TeamAvatar';
import { CreasePanel } from '../scoring/CreasePanel';
import { MatchCharts } from './MatchCharts';
import { MomentBurst } from './MomentBurst';
import { PlayerCards } from './PlayerCards';
import { ImageShareSheet, type ImageJob } from './ImageShareSheet';
import { WinChanceMeter } from './WinChance';
import { BallChip, ThisOver } from '../scoring/ThisOver';
import { BattingBadge, HaulBadge, MomBadge } from './Badges';
import { manOfTheMatchId, playerFigures, teamOfPlayer } from '../../engine/milestones';
import { isAbandonedMatch } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { buildCommentary, type CommentaryBall } from '../../engine/commentary';
import { runRate, strikeRate } from '../../engine/rules';
import {
  ballsRemaining,
  didNotBat,
  economy,
  extrasTotal,
  requiredRunRate,
  runsNeeded,
} from '../../engine/stats';
import type { InningsState, Match, MatchState, TeamIndex } from '../../engine/types';
import { useFormat } from '../../hooks/useFormat';
import { ballOutcome } from '../../utils/ballText';
import { dismissalText, inningsLabel, playerName, resultText } from '../../utils/matchText';

type Tab = 'summary' | 'scorecard' | 'overs' | 'charts';

/**
 * What people who follow a match see (scorers get the scoring screen):
 * both teams with their scores, then Summary, a full Scorecard and the
 * ball-by-ball Overs. Updates live as the scorer's balls arrive.
 */
export function MatchCenter({
  match,
  state,
  title,
  onShare,
}: {
  match: Match;
  state: MatchState;
  title: string;
  onShare: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('summary');
  const tabs: Tab[] = ['summary', 'scorecard', 'overs', 'charts'];

  return (
    <div className="flex min-h-dvh flex-col">
      <Header
        title={title}
        backTo="/home"
        actions={
          <>
            {state.innings.length > 0 && <ScorecardImageButton match={match} state={state} />}
            <button
              type="button"
              onClick={onShare}
              aria-label={t('common.share')}
              className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
            >
              <Icon name="share" className="size-5" />
            </button>
          </>
        }
      />
      <MatchHero match={match} state={state} />
      <MomentBurst match={match} />

      <div
        role="tablist"
        aria-label={t('matchCenter.sections')}
        className="sticky top-[calc(3rem+max(0.5rem,env(safe-area-inset-top)))] z-30 border-b border-slate-200 bg-slate-100/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4">
          {tabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`relative py-3 text-sm font-semibold ${
                tab === id ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {t(`matchCenter.${id}`)}
              {tab === id && (
                <span
                  aria-hidden
                  className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-bpl-red"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 py-3">
        {tab === 'summary' && <Summary match={match} state={state} />}
        {tab === 'scorecard' && <Scorecard match={match} state={state} />}
        {tab === 'overs' && <Overs match={match} />}
        {tab === 'charts' && <MatchCharts match={match} state={state} />}
      </main>
    </div>
  );
}

/* ---------------------------------- Hero ---------------------------------- */

/** Both teams with logos and scores, the live badge and where the match stands. */
export function MatchHero({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const inn = state.current;
  const abandoned = isAbandonedMatch(match);
  const live = !abandoned && match.events.length > 0 && state.phase !== 'completed';
  const color = (i: TeamIndex) =>
    findTeam(match.teams[i].teamId)?.color ?? 'var(--color-night-line)';
  const need = inn ? runsNeeded(inn) : null;
  const rrr = inn ? requiredRunRate(inn) : null;

  let status: string;
  if (abandoned) status = t('fixtures.abandonedResult');
  else if (state.phase === 'completed' && state.result)
    status = resultText(state.result, match, t, f);
  else if (match.events.length === 0) status = t('home.notStarted');
  else if (state.phase === 'inningsBreak') status = t('scoring.inningsBreak');
  else if (state.phase === 'superOverBreak') status = t('scoring.scoresLevel');
  else if (inn && need !== null && need > 0 && !inn.ended)
    status = t('scoring.need', { runs: f.num(need), balls: f.num(ballsRemaining(inn)) });
  else status = t('matchCenter.inPlay');

  return (
    <section className="relative overflow-hidden bg-night-950 text-white">
      <div
        aria-hidden
        className="countdown-glow absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(55% 70% at 10% 35%, ${color(0)}, transparent 70%), radial-gradient(55% 70% at 90% 35%, ${color(1)}, transparent 70%)`,
        }}
      />
      <div className="relative mx-auto flex max-w-lg flex-col gap-3 px-4 pt-3 pb-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
          <Side match={match} state={state} team={0} />
          <div className="flex flex-col items-center pt-4">
            {live ? (
              <span className="flex items-center gap-1.5 rounded-full bg-bpl-red px-2.5 py-0.5 text-xs font-bold">
                <span
                  aria-hidden
                  className="live-pulse size-1.5 rounded-full bg-white text-white"
                />
                {t('homePage.live')}
              </span>
            ) : (
              <span className="font-display text-lg font-bold text-night-muted">
                {t('common.vs')}
              </span>
            )}
          </div>
          <Side match={match} state={state} team={1} />
        </div>

        <p
          className={`text-center font-display text-xl leading-tight font-bold ${
            abandoned
              ? 'text-amber-300'
              : state.phase === 'completed'
                ? 'text-bpl-yellow'
                : 'text-white'
          }`}
        >
          {status}
        </p>

        {!abandoned && inn && !inn.ended && match.events.length > 0 && (
          <div className="tabular flex flex-wrap justify-center gap-x-4 text-xs text-white/80">
            <span>
              {t('scoring.crr')} {f.dec(runRate(inn.runs, inn.legalBalls))}
            </span>
            {inn.target !== null && (
              <span>
                {t('scoring.target')} {f.num(inn.target)}
              </span>
            )}
            {rrr !== null && (
              <span>
                {t('scoring.rrr')} {f.dec(rrr)}
              </span>
            )}
            {inn.freeHitNext && (
              <span className="rounded-full bg-amber-400 px-2 font-bold text-amber-950">
                {t('scoring.freeHit')}
              </span>
            )}
          </div>
        )}

        {!abandoned && <WinChanceMeter match={match} state={state} />}
      </div>
    </section>
  );
}

/** A team's logo, name and its innings scores (main innings first, then any super over). */
function Side({ match, state, team }: { match: Match; state: MatchState; team: TeamIndex }) {
  const { t } = useTranslation();
  const f = useFormat();
  const tm = match.teams[team];
  const info = findTeam(tm.teamId);
  const batting = state.current?.battingTeam === team && state.phase !== 'completed';
  const inns = state.innings.filter((i) => i.battingTeam === team);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
      <TeamAvatar name={tm.name} color={info?.color} logo={info?.logo} size="lg" />
      <span lang="en" className="line-clamp-2 text-sm leading-tight font-semibold">
        {tm.name}
      </span>
      {inns.length === 0 ? (
        <span className="text-xs text-white/60">{t('matchCenter.yetToBat')}</span>
      ) : (
        inns.map((i) => (
          <span key={i.index} className="flex flex-col items-center leading-none">
            <span
              className={`tabular font-display font-extrabold ${
                i.superOver ? 'text-lg text-amber-300' : 'text-3xl'
              } ${batting && !i.ended ? 'text-white' : 'text-white/85'}`}
            >
              {f.num(i.runs)}/{f.num(i.wickets)}
            </span>
            <span className="tabular mt-0.5 text-[11px] text-white/65">
              {i.superOver ? `${t('scoring.superOver')} · ` : ''}
              {t('matchCenter.oversShort', { overs: f.overs(i.legalBalls) })}
            </span>
          </span>
        ))
      )}
    </div>
  );
}

/* -------------------------------- Summary --------------------------------- */

function Summary({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const inn = state.current;
  const playing =
    inn &&
    (state.phase === 'inPlay' || state.phase === 'needBatter' || state.phase === 'needBowler');
  return (
    <>
      <ManOfTheMatchCard match={match} state={state} />
      {playing && (
        <Card>
          <CreasePanel match={match} inn={inn} />
          <ThisOver inn={inn} />
          {state.phase !== 'inPlay' && (
            <p className="px-4 pb-3 text-center text-[13px] text-slate-600 dark:text-slate-400">
              {t('scoring.waitingForScorer')}
            </p>
          )}
        </Card>
      )}
      {match.events.length === 0 && (
        <Card>
          <p className="p-6 text-center text-slate-600 dark:text-slate-400">
            {t('scoring.notStartedYet')}
          </p>
        </Card>
      )}
      {inn && inn.overs.length > 0 && <RecentOvers match={match} inn={inn} />}
      {state.innings.length > 0 && <TopPerformers match={match} state={state} />}
      {state.innings.length > 0 && <PlayerCards match={match} state={state} />}
    </>
  );
}

function RecentOvers({ match, inn }: { match: Match; inn: InningsState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const recent = inn.overs.slice(-4).reverse();
  return (
    <Card title={t('matchCenter.recentOvers')}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {recent.map((o) => (
          <li key={o.number} className="flex items-center gap-3 px-4 py-2">
            <span className="w-24 shrink-0 text-[13px] leading-tight">
              <span className="block font-semibold">
                {t('matchCenter.overN', { n: f.num(o.number) })}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {playerName(match, o.bowlerId)}
              </span>
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {o.balls.map((b) => (
                <BallChip key={b.eventId} ball={b} />
              ))}
            </div>
            <span className="tabular shrink-0 font-display text-lg font-bold">{f.num(o.runs)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Each team's best batter and best bowler so far (main innings only). */
function TopPerformers({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const main = state.innings.filter((i) => !i.superOver);
  const rows = ([0, 1] as const)
    .map((team) => {
      const bat = main
        .filter((i) => i.battingTeam === team)
        .flatMap((i) => i.batters)
        .sort((a, b) => b.runs - a.runs || a.balls - b.balls)[0];
      const bowl = main
        .filter((i) => i.bowlingTeam === team)
        .flatMap((i) => i.bowlers)
        .sort((a, b) => b.wickets - a.wickets || a.runsConceded - b.runsConceded)[0];
      return { team, bat, bowl };
    })
    .filter((r) => r.bat || r.bowl);
  if (rows.length === 0) return null;
  return (
    <Card title={t('matchCenter.topPerformers')}>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map(({ team, bat, bowl }) => (
          <li key={team} className="px-4 py-2.5">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {match.teams[team].name}
            </p>
            <div className="mt-1 grid grid-cols-2 gap-3 text-sm">
              <span className="min-w-0">
                {bat && (
                  <>
                    <span className="block truncate font-semibold">
                      {playerName(match, bat.playerId)}
                    </span>
                    <span className="tabular text-slate-600 dark:text-slate-400">
                      🏏 {f.num(bat.runs)}
                      {bat.dismissal ? '' : '*'} ({f.num(bat.balls)})
                      <BattingBadge runs={bat.runs} />
                    </span>
                  </>
                )}
              </span>
              <span className="min-w-0">
                {bowl && (
                  <>
                    <span className="block truncate font-semibold">
                      {playerName(match, bowl.playerId)}
                    </span>
                    <span className="tabular text-slate-600 dark:text-slate-400">
                      ● {f.num(bowl.wickets)}/{f.num(bowl.runsConceded)} ({f.overs(bowl.legalBalls)}
                      )
                      <HaulBadge wickets={bowl.wickets} />
                    </span>
                  </>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The Man of the Match with their figures, once the scorer has chosen one. */
export function ManOfTheMatchCard({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const id = manOfTheMatchId(match);
  if (!id) return null;
  const team = teamOfPlayer(match, id);
  const { batting, bowling } = playerFigures(state, id);
  const parts: string[] = [];
  if (batting)
    parts.push(`🏏 ${f.num(batting.runs)}${batting.out ? '' : '*'} (${f.num(batting.balls)})`);
  if (bowling && bowling.legalBalls > 0)
    parts.push(
      `● ${f.num(bowling.wickets)}/${f.num(bowling.runs)} (${f.overs(bowling.legalBalls)})`,
    );
  return (
    <section className="relative overflow-hidden rounded-2xl bg-night-900 p-4 text-white ring-1 ring-bpl-yellow/60 sm:rounded-2xl">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(70%_120%_at_0%_0%,rgb(245_158_11/0.28),transparent_70%)]"
      />
      <div className="relative flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-bpl-yellow text-2xl shadow-[0_0_18px_rgb(245_158_11/0.55)]"
        >
          🏅
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-bpl-yellow uppercase">
            {t('mom.title')}
          </p>
          <p className="truncate font-display text-2xl leading-tight font-bold">
            {playerName(match, id)}
          </p>
          <p className="tabular truncate text-sm text-white/75">
            {team !== null && match.teams[team].name}
            {parts.length > 0 && ` · ${parts.join(' · ')}`}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Scorecard -------------------------------- */

function Scorecard({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  if (state.innings.length === 0) {
    return (
      <Card>
        <p className="p-6 text-center text-slate-600 dark:text-slate-400">
          {t('scoring.notStartedYet')}
        </p>
      </Card>
    );
  }
  // Latest innings first: that's the one people are following
  return (
    <>
      {[...state.innings].reverse().map((inn) => (
        <InningsCard key={inn.index} match={match} inn={inn} mom={manOfTheMatchId(match)} />
      ))}
    </>
  );
}

function InningsCard({
  match,
  inn,
  mom,
}: {
  match: Match;
  inn: InningsState;
  /** Man of the Match's player id, marked with a badge. */
  mom: string | null;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const th = 'px-1.5 py-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400';
  const td = 'tabular px-1.5 py-2 text-right align-top';
  const batters = [...inn.batters].sort((a, b) => a.order - b.order);
  const bowlers = [...inn.bowlers].sort((a, b) => a.order - b.order);
  const dnb = didNotBat(inn, match);
  const e = inn.extras;

  return (
    <section className="overflow-hidden bg-white shadow-sm sm:rounded-2xl dark:bg-slate-900">
      <header className="flex items-baseline justify-between gap-2 bg-night-950 px-4 py-2.5 text-white">
        <h2 className="min-w-0 truncate font-semibold">
          {match.teams[inn.battingTeam].name}
          <span className="ml-2 text-xs font-normal text-white/70">{inningsLabel(inn, t, f)}</span>
        </h2>
        <span className="tabular shrink-0 font-display text-xl font-bold">
          {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
          <span className="text-sm font-normal text-white/70">({f.overs(inn.legalBalls)})</span>
        </span>
      </header>

      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 dark:border-slate-800">
          <tr>
            <th className={`${th} w-full pl-4 text-left`}>{t('scoring.batter')}</th>
            <th className={th}>{t('col.runs')}</th>
            <th className={th}>{t('col.balls')}</th>
            <th className={th}>{t('col.fours')}</th>
            <th className={th}>{t('col.sixes')}</th>
            <th className={`${th} pr-4`}>{t('col.sr')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {batters.map((b) => {
            const atCrease = !b.dismissal && !b.retiredHurt && !inn.ended;
            return (
              <tr key={b.playerId}>
                <td className="py-2 pr-1.5 pl-4">
                  <span
                    className={`block font-semibold ${atCrease ? 'text-emerald-700 dark:text-emerald-400' : ''}`}
                  >
                    {playerName(match, b.playerId)}
                    {atCrease && b.playerId === inn.strikerId ? ' *' : ''}
                    <BattingBadge runs={b.runs} />
                    {mom === b.playerId && <MomBadge />}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {dismissalText(b, match, inn, t)}
                  </span>
                </td>
                <td className={`${td} font-bold`}>{f.num(b.runs)}</td>
                <td className={td}>{f.num(b.balls)}</td>
                <td className={td}>{f.num(b.fours)}</td>
                <td className={td}>{f.num(b.sixes)}</td>
                <td className={`${td} pr-4 text-slate-600 dark:text-slate-400`}>
                  {f.dec(strikeRate(b.runs, b.balls), 1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-2.5 text-[13px] dark:border-slate-800">
        <p>
          <span className="font-semibold">{t('scoring.extras')}</span>{' '}
          <span className="tabular">{f.num(extrasTotal(e))}</span>{' '}
          <span className="text-slate-500 dark:text-slate-400">
            (
            {t('matchCenter.extrasDetail', {
              w: f.num(e.wides),
              nb: f.num(e.noBalls),
              b: f.num(e.byes),
              lb: f.num(e.legByes),
            })}
            )
          </span>
        </p>
        {inn.penaltyRuns !== 0 && (
          <p>
            <span className="font-semibold">{t('scoring.penalty')}</span>{' '}
            {inn.penaltyRuns > 0 ? '+' : '−'}
            {f.num(Math.abs(inn.penaltyRuns))}
          </p>
        )}
        {dnb.length > 0 && (
          <p>
            <span className="font-semibold">{t('matchCenter.didNotBat')}</span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              {dnb.map((id) => playerName(match, id)).join(', ')}
            </span>
          </p>
        )}
        {inn.fallOfWickets.length > 0 && (
          <p>
            <span className="font-semibold">{t('matchCenter.fallOfWickets')}</span>{' '}
            <span className="tabular text-slate-600 dark:text-slate-400">
              {inn.fallOfWickets
                .map(
                  (w) =>
                    `${f.num(w.score)}-${f.num(w.wicketNumber)} (${playerName(match, w.batterId)}, ${f.overs(w.legalBalls)})`,
                )
                .join(', ')}
            </span>
          </p>
        )}
      </div>

      {bowlers.length > 0 && (
        <table className="w-full border-t border-slate-200 text-sm dark:border-slate-800">
          <thead className="border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className={`${th} w-full pl-4 text-left`}>{t('scoring.bowler')}</th>
              <th className={th}>{t('col.overs')}</th>
              <th className={th}>{t('col.maidens')}</th>
              <th className={th}>{t('col.conceded')}</th>
              <th className={th}>{t('col.wickets')}</th>
              <th className={`${th} pr-4`}>{t('col.econ')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {bowlers.map((b) => (
              <tr key={b.playerId}>
                <td className="py-2 pr-1.5 pl-4 font-semibold">
                  {playerName(match, b.playerId)}
                  <HaulBadge wickets={b.wickets} />
                  {mom === b.playerId && <MomBadge />}
                </td>
                <td className={td}>{f.overs(b.legalBalls)}</td>
                <td className={td}>{f.num(b.maidens)}</td>
                <td className={td}>{f.num(b.runsConceded)}</td>
                <td className={`${td} font-bold`}>{f.num(b.wickets)}</td>
                <td className={`${td} pr-4 text-slate-600 dark:text-slate-400`}>
                  {f.dec(economy(b), 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ---------------------------------- Overs --------------------------------- */

function Overs({ match }: { match: Match }) {
  const { t } = useTranslation();
  const f = useFormat();
  // Replays the match once per change (a few hundred events at most)
  const balls = useMemo(() => buildCommentary(match), [match]);
  if (balls.length === 0) {
    return (
      <Card>
        <p className="p-6 text-center text-slate-600 dark:text-slate-400">
          {t('scoring.notStartedYet')}
        </p>
      </Card>
    );
  }

  // Newest first, grouped by innings and over
  const groups: {
    key: string;
    inn: number;
    superOver: boolean;
    over: number;
    balls: CommentaryBall[];
  }[] = [];
  for (const b of [...balls].reverse()) {
    const key = `${b.inningsIndex}-${b.over}`;
    const last = groups[groups.length - 1];
    if (last?.key === key) last.balls.push(b);
    else
      groups.push({ key, inn: b.inningsIndex, superOver: b.superOver, over: b.over, balls: [b] });
  }

  return (
    <>
      {groups.map((g, gi) => {
        const runs = g.balls.reduce((s, b) => s + b.total, 0);
        const newInnings = gi === 0 || groups[gi - 1].inn !== g.inn;
        const battingTeam = match.teams[g.balls[0].battingTeam];
        return (
          <section key={g.key} className="flex flex-col gap-2">
            {newInnings && (
              <h2 className="px-4 pt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {battingTeam.name}
                {g.superOver ? ` · ${t('scoring.superOver')}` : ''}
              </h2>
            )}
            <Card>
              <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
                <span className="font-semibold">
                  {t('matchCenter.overN', { n: f.num(g.over) })}
                  <span className="ml-2 text-[13px] font-normal text-slate-500 dark:text-slate-400">
                    {playerName(match, g.balls[0].bowlerId)}
                  </span>
                </span>
                <span className="tabular text-[13px] text-slate-600 dark:text-slate-400">
                  {t('matchCenter.runsInOver', { n: f.num(runs) })} ·{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {f.num(g.balls[0].score.runs)}/{f.num(g.balls[0].score.wickets)}
                  </span>
                </span>
              </header>
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {g.balls.map((b) => (
                  <BallLine key={b.eventId} b={b} match={match} />
                ))}
              </ol>
            </Card>
          </section>
        );
      })}
    </>
  );
}

function BallLine({ b, match }: { b: CommentaryBall; match: Match }) {
  const { t } = useTranslation();
  const f = useFormat();
  const ev = b.event;
  const bowler = playerName(match, b.bowlerId);
  const batter = playerName(match, b.batterId);

  const outcome = ballOutcome(ev, match, t, f);

  const accent = ev.wicket
    ? 'text-rose-700 dark:text-rose-400'
    : ev.boundary && ev.runs === 6
      ? 'text-amber-600 dark:text-bpl-yellow'
      : ev.boundary && ev.runs === 4
        ? 'text-emerald-700 dark:text-emerald-400'
        : '';

  const summary = {
    eventId: b.eventId,
    runs: ev.runs,
    extra: ev.extra,
    boundary: !!ev.boundary,
    wicket: !!ev.wicket,
    legal: ev.extra !== 'wide' && ev.extra !== 'noBall',
    freeHit: false,
  };

  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <span className="tabular w-8 shrink-0 pt-1.5 text-[13px] text-slate-500 dark:text-slate-400">
        {f.num(b.over - 1)}.{f.num(b.ball)}
      </span>
      <BallChip ball={summary} />
      <p className="min-w-0 flex-1 pt-1 text-sm leading-snug">
        <span className="text-slate-600 dark:text-slate-400">
          {t('matchCenter.bowlerToBatter', { bowler, batter })}
        </span>{' '}
        <span className={`font-semibold ${accent}`}>{outcome}</span>
      </p>
    </li>
  );
}

/* --------------------------------- Shared --------------------------------- */

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden bg-white shadow-sm sm:rounded-2xl dark:bg-slate-900">
      {title && (
        <h2 className="px-4 pt-3 pb-1 font-display text-lg font-bold tracking-wide">{title}</h2>
      )}
      {children}
    </section>
  );
}

/** Draws the match as a picture and opens the share sheet (or downloads it). */
function ScorecardImageButton({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const [job, setJob] = useState<ImageJob | null>(null);
  async function onClick() {
    const title = `${match.teams[0].name} ${t('common.vs')} ${match.teams[1].name}`;
    const fileName = `BPL-2027-${match.teams[0].name}-vs-${match.teams[1].name}.png`.replace(
      /[^\w.-]+/g,
      '-',
    );
    setJob({ title, fileName, blob: null });
    try {
      const { drawScorecard } = await import('../../utils/scorecardImage');
      const blob = await drawScorecard(match, state, t, f);
      setJob((j) => (j ? { ...j, blob } : j));
    } catch {
      setJob(null);
      toast(t('scorecardImage.failed'));
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        aria-label={t('scorecardImage.button')}
        className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
      >
        <Icon name="image" className="size-5" />
      </button>
      <ImageShareSheet job={job} onClose={() => setJob(null)} />
    </>
  );
}
