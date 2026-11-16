import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Fixture } from '../data/fixtures';
import { findTeam, initials } from '../data/teams';
import { runRate } from '../engine/rules';
import { runsNeeded, ballsRemaining, requiredRunRate } from '../engine/stats';
import type { BallSummary, InningsState, Match, MatchState } from '../engine/types';
import { TeamAvatar } from '../components/common/TeamAvatar';
import { TeamEdge } from '../components/common/TeamEdge';
import { Icon } from '../components/common/icons';
import { useShareMatch } from '../hooks/useShareMatch';
import { InstallHint } from '../components/layout/InstallHint';
import { NoticeBanner } from '../components/layout/NoticeBanner';
import { NextMatchCountdown } from '../components/live/NextMatchCountdown';
import { useFormat } from '../hooks/useFormat';
import { useNow, useTournament } from '../hooks/useTournament';
import { usePrefs } from '../store/prefsStore';
import {
  countdown,
  fixtureStart,
  pickHero,
  projectedTotal,
  tournamentProgress,
  upcomingFixtures,
  type HomeHero,
} from '../tournament/home';
import { fixtureTeams, type TournamentState } from '../tournament/standings';
import { formatDate, formatTime, slotLabel, stageLabel } from '../utils/fixtureText';
import { playerName, resultText } from '../utils/matchText';
import { PageSkeleton } from '../components/common/Skeleton';

/** A side in the hero: short code, full name and team colour. */
interface Side {
  short: string;
  name: string;
  color?: string;
  logo?: string;
}

/**
 * Home: a hero that follows the tournament (next match countdown → live
 * score → result), then tournament progress and the next three matches.
 * Live data comes from the matches on this device for now.
 */
export default function HomePage() {
  const { t } = useTranslation();
  const tour = useTournament(5000);
  const now = useNow(1000);
  if (!tour) return <PageSkeleton variant="hero" />;

  const hero = pickHero(tour.matches, tour.ts, now);
  const heroFixtureId =
    hero.kind === 'upcoming' ? hero.fixture.id : hero.kind === 'result' ? hero.next?.id : undefined;
  const next3 = upcomingFixtures(tour.ts, now, 3, heroFixtureId);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4 md:max-w-2xl">
      <h1 className="sr-only">{t('homePage.title')}</h1>
      <NoticeBanner />
      <Hero hero={hero} now={now} />
      <InstallHint />
      <Progress ts={tour.ts} />
      {next3.length > 0 && <NextMatches fixtures={next3} ts={tour.ts} />}
    </main>
  );
}

/* --------------------------------- Hero --------------------------------- */

function sideOfTeam(teamId: string | null | undefined, fallbackName: string): Side {
  const team = findTeam(teamId ?? undefined);
  return team
    ? { short: team.short, name: team.name, color: team.color, logo: team.logo }
    : { short: initials(fallbackName), name: fallbackName };
}

function HeroFrame({
  sides,
  label,
  children,
  to,
  onShare,
}: {
  sides: [Side, Side];
  label: ReactNode;
  children: ReactNode;
  to?: string;
  /** Shows a "Share score" button in the top-right corner. */
  onShare?: () => void;
}) {
  const { t } = useTranslation();
  const [a, b] = sides;
  // Night colours stand in for a side whose team is not decided yet
  const ca = a.color ?? 'var(--color-night-line)';
  const cb = b.color ?? 'var(--color-night-line)';
  const body = (
    <>
      <div
        aria-hidden
        className="countdown-glow absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(60% 55% at 12% 30%, ${ca}, transparent 70%), radial-gradient(60% 55% at 88% 30%, ${cb}, transparent 70%)`,
        }}
      />
      <div className="relative flex flex-col gap-4 p-5">
        <div
          className={`text-xs font-semibold tracking-wide text-white/80 uppercase ${onShare ? 'pr-10' : ''}`}
        >
          {label}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <SideName side={a} />
          <span className="font-display text-2xl font-bold text-white/70">{t('common.vs')}</span>
          <SideName side={b} />
        </div>
        {children}
      </div>
    </>
  );
  const cls =
    'relative block overflow-hidden rounded-3xl bg-night-950 text-white shadow-lg ring-1 ring-night-line';
  const card = to ? (
    <Link to={to} className={`${cls} active:opacity-90`}>
      {body}
    </Link>
  ) : (
    <section className={cls}>{body}</section>
  );
  if (!onShare) return card;
  return (
    <div className="relative">
      {card}
      <button
        type="button"
        onClick={onShare}
        aria-label={t('homePage.shareScore')}
        title={t('homePage.shareScore')}
        className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur active:scale-95"
      >
        <Icon name="share" className="size-5" />
      </button>
    </div>
  );
}

function SideName({ side }: { side: Side }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <TeamAvatar name={side.name} color={side.color} logo={side.logo} size="lg" />
      <span lang="en" className="line-clamp-2 text-sm leading-tight font-semibold">
        {side.name}
      </span>
    </div>
  );
}

function matchSides(m: Match): [Side, Side] {
  return [
    sideOfTeam(m.teams[0].teamId, m.teams[0].name),
    sideOfTeam(m.teams[1].teamId, m.teams[1].name),
  ];
}

function Hero({ hero, now }: { hero: HomeHero; now: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  const fixtureLabel = (fx?: Fixture) =>
    fx
      ? `${t('fixtures.matchNo', { n: f.num(fx.no) })} · ${stageLabel(fx.stage, t)}`
      : t('homePage.friendly');
  const when = (fx: Fixture) =>
    `${formatDate(fx.date, lang, bengaliDigits)} · ${formatTime(fx.time, lang, f)}`;
  const share = useShareMatch();

  switch (hero.kind) {
    case 'upcoming':
      // Same scoreboard clock as the Live tab, with both team logos
      return <NextMatchCountdown />;
    case 'live':
      return (
        <StickyWhenGone ticker={<LiveTicker match={hero.match} state={hero.state} />}>
          <HeroFrame
            sides={matchSides(hero.match)}
            to={`/match/${hero.match.id}`}
            onShare={() => void share(hero.match, hero.state)}
            label={
              <span className="flex items-center gap-2">
                <LiveBadge />
                {fixtureLabel(hero.fixture)}
              </span>
            }
          >
            <LiveScore match={hero.match} state={hero.state} />
          </HeroFrame>
        </StickyWhenGone>
      );
    case 'result':
      return (
        <HeroFrame
          sides={matchSides(hero.match)}
          to={`/match/${hero.match.id}`}
          onShare={() => void share(hero.match, hero.state)}
          label={`${t('homePage.result')} · ${fixtureLabel(hero.fixture)}`}
        >
          {hero.state.result && (
            <p className="text-center font-display text-2xl leading-tight font-bold text-bpl-yellow">
              {resultText(hero.state.result, hero.match, t, f)}
            </p>
          )}
          <InningsTotals match={hero.match} state={hero.state} />
          {hero.next && (
            <div className="rounded-2xl bg-night-950/70 p-3">
              <p className="mb-2 text-center text-xs text-white/80">
                {t('homePage.nextMatch')} · {when(hero.next)}
              </p>
              <Countdown target={fixtureStart(hero.next)} now={now} small />
            </div>
          )}
        </HeroFrame>
      );
    case 'over':
      return (
        <section className="rounded-3xl border border-night-line bg-night-950 p-6 text-center text-white">
          <p className="font-display text-3xl font-bold">{t('homePage.over')}</p>
          <Link to="/points" className="mt-2 inline-block text-bpl-yellow">
            {t('tabs.points')} →
          </Link>
        </section>
      );
  }
}

function Countdown({ target, now, small }: { target: number; now: number; small?: boolean }) {
  const { t } = useTranslation();
  const f = useFormat();
  const c = countdown(target, now);
  if (c.due) {
    return (
      <p className="text-center font-display text-2xl font-bold text-bpl-yellow">
        {t('homePage.startingSoon')}
      </p>
    );
  }
  const units: [number, string][] = [
    [c.days, t('homePage.days')],
    [c.hours, t('homePage.hours')],
    [c.minutes, t('homePage.minutes')],
    [c.seconds, t('homePage.seconds')],
  ];
  return (
    <div role="timer" aria-label={t('homePage.startsIn')} className="grid grid-cols-4 gap-2">
      {units.map(([n, label]) => (
        <div key={label} className="flex flex-col items-center rounded-xl bg-night-950/70 py-2">
          <span
            className={`tabular font-display text-bpl-yellow leading-none font-bold ${small ? 'text-2xl' : 'text-4xl'}`}
          >
            {f.num(String(n).padStart(2, '0'))}
          </span>
          <span className="mt-1 text-xs text-white/75">{label}</span>
        </div>
      ))}
    </div>
  );
}

function LiveScore({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const inn = state.innings[state.innings.length - 1];
  if (!inn) return null;
  const between = state.phase === 'inningsBreak' || state.phase === 'superOverBreak';
  const projected = projectedTotal(inn);
  const need = runsNeeded(inn);
  const rrr = requiredRunRate(inn);
  const batters = [inn.strikerId, inn.nonStrikerId].filter((x): x is string => !!x);
  const over = inn.overs[inn.overs.length - 1];

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <div className="text-xs text-white/80">
          {match.teams[inn.battingTeam].name}
          {inn.superOver && ` · ${t('scoring.superOver')}`}
          {between && ` · ${t('scoring.inningsBreak')}`}
        </div>
        <div className="tabular font-display text-6xl leading-none font-extrabold">
          {f.num(inn.runs)}/{f.num(inn.wickets)}
        </div>
        <div className="tabular mt-1 text-sm text-white/85">
          {t('scoring.oversOf', { overs: f.overs(inn.legalBalls), total: f.num(inn.oversLimit) })}
          {' · '}
          {t('scoring.crr')} {f.dec(runRate(inn.runs, inn.legalBalls))}
          {rrr !== null && !inn.ended && ` · ${t('scoring.rrr')} ${f.dec(rrr)}`}
          {projected !== null &&
            rrr === null &&
            !inn.ended &&
            ` · ${t('homePage.projected', { n: f.num(projected) })}`}
        </div>
        {need !== null && need > 0 && !inn.ended && (
          <div className="mt-1 text-sm font-semibold text-bpl-yellow">
            {t('scoring.need', { runs: f.num(need), balls: f.num(ballsRemaining(inn)) })}
          </div>
        )}
      </div>

      {batters.length > 0 && !inn.ended && (
        <ul className="flex flex-col gap-1 rounded-2xl bg-night-950/70 px-3 py-2 text-sm">
          {batters.map((id) => {
            const b = inn.batters.find((x) => x.playerId === id);
            const striker = id === inn.strikerId;
            return (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className={`flex min-w-0 items-center gap-2 ${striker ? 'font-bold' : ''}`}>
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 rounded-full ${striker ? 'bg-bpl-yellow' : 'bg-transparent'}`}
                  />
                  <span className="truncate">{playerName(match, id)}</span>
                  {striker && <span className="sr-only">{t('scoring.onStrike')}</span>}
                </span>
                <span className="tabular shrink-0">
                  {f.num(b?.runs ?? 0)}{' '}
                  <span className="text-white/60">({f.num(b?.balls ?? 0)})</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {over && over.balls.length > 0 && !inn.ended && (
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-white/70">{t('scoring.thisOver')}</span>
          <ol className="flex flex-wrap gap-1.5">
            {over.balls.map((b) => (
              <li key={b.eventId}>
                <HeroBall ball={b} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function HeroBall({ ball, small }: { ball: BallSummary; small?: boolean }) {
  const { t } = useTranslation();
  const f = useFormat();
  let label =
    ball.extra === 'wide'
      ? t('ball.wide')
      : ball.extra === 'noBall'
        ? t('ball.noBall')
        : ball.extra === 'bye'
          ? `${f.num(ball.runs)}${t('ball.bye')}`
          : ball.extra === 'legBye'
            ? `${f.num(ball.runs)}${t('ball.legBye')}`
            : ball.runs === 0
              ? '•'
              : f.num(ball.runs);
  if (ball.wicket) label = t('ball.wicket');
  const style = ball.wicket
    ? 'bg-bpl-red text-white'
    : ball.boundary && ball.runs === 4
      ? 'bg-bpl-cyan text-night-950'
      : ball.boundary && ball.runs === 6
        ? 'bg-bpl-yellow text-night-950'
        : ball.runs === 0 && ball.extra === null
          ? 'border border-night-line text-white/50'
          : 'border border-night-line bg-night-900 text-white';
  return (
    <span
      className={`flex items-center justify-center rounded-full font-bold ${small ? 'size-6 text-[10px]' : 'size-8 text-xs'} ${style}`}
    >
      {label}
    </span>
  );
}

function InningsTotals({ match, state }: { match: Match; state: MatchState }) {
  const f = useFormat();
  const main = state.innings.filter((i: InningsState) => !i.superOver);
  return (
    <ul className="grid grid-cols-2 gap-2 text-center">
      {main.map((inn) => (
        <li key={inn.index} className="rounded-xl bg-night-950/70 py-2">
          <div className="truncate px-2 text-xs text-white/80">
            {match.teams[inn.battingTeam].name}
          </div>
          <div className="tabular font-display text-2xl font-bold">
            {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
            <span className="text-sm font-normal text-white/70">({f.overs(inn.legalBalls)})</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Red LIVE pill with a pulsing dot. */
function LiveBadge() {
  const { t } = useTranslation();
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-bpl-red px-2 py-0.5 text-white">
      <span aria-hidden className="live-pulse size-2 rounded-full bg-white text-white" />
      {t('homePage.live')}
    </span>
  );
}

/**
 * Renders `children` in place; once most of them have scrolled up, `ticker`
 * is pinned to the top of the screen. The ticker floats over the page, so
 * nothing below moves.
 */
function StickyWhenGone({ children, ticker }: { children: ReactNode; ticker: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // Pinned once two thirds of the card (the big score with it) has scrolled up
    const io = new IntersectionObserver(
      ([e]) => setGone(e.intersectionRatio < 0.35 && e.boundingClientRect.top < 0),
      { threshold: [0, 0.35, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <>
      <div ref={ref}>{children}</div>
      <div
        aria-hidden={!gone}
        className={`fixed inset-x-0 top-0 z-40 transition-transform duration-200 ease-out motion-reduce:transition-none ${
          gone ? 'translate-y-0' : 'pointer-events-none -translate-y-full'
        }`}
      >
        {ticker}
      </div>
    </>
  );
}

/** The compact live score pinned to the top of Home while the big card is scrolled away. */
function LiveTicker({ match, state }: { match: Match; state: MatchState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const inn = state.innings[state.innings.length - 1];
  if (!inn) return null;
  const batting = sideOfTeam(
    match.teams[inn.battingTeam].teamId,
    match.teams[inn.battingTeam].name,
  );
  const bowling = sideOfTeam(
    match.teams[inn.bowlingTeam].teamId,
    match.teams[inn.bowlingTeam].name,
  );
  const rrr = requiredRunRate(inn);
  const balls = inn.overs.flatMap((o) => o.balls).slice(-6);
  return (
    <Link
      to={`/match/${match.id}`}
      tabIndex={-1}
      className="block border-b border-night-line bg-night-950/95 pt-[env(safe-area-inset-top)] text-white shadow-lg backdrop-blur"
    >
      <div className="relative mx-auto flex max-w-lg items-center gap-2.5 overflow-hidden px-4 py-2 md:max-w-2xl">
        <TeamEdge a={batting.color} b={bowling.color} />
        <span
          aria-hidden
          className="live-pulse size-2 shrink-0 rounded-full bg-bpl-red text-bpl-red"
        />
        <TeamAvatar name={batting.name} color={batting.color} logo={batting.logo} size="sm" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="tabular font-display text-xl font-extrabold">
            {f.num(inn.runs)}/{f.num(inn.wickets)}{' '}
            <span className="text-sm font-semibold text-white/70">({f.overs(inn.legalBalls)})</span>
          </span>
          <span className="tabular truncate text-[11px] text-white/70">
            {/* One rate fits next to the balls: the required one while chasing */}
            {rrr !== null
              ? `${t('scoring.rrr')} ${f.dec(rrr)}`
              : `${t('scoring.crr')} ${f.dec(runRate(inn.runs, inn.legalBalls))}`}
          </span>
        </span>
        <ol className="ml-auto flex shrink-0 gap-1" aria-label={t('scoring.thisOver')}>
          {balls.map((b) => (
            <li key={b.eventId}>
              <HeroBall ball={b} small />
            </li>
          ))}
        </ol>
      </div>
    </Link>
  );
}

/* ------------------------------- Below hero ------------------------------ */

function Progress({ ts }: { ts: TournamentState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const p = tournamentProgress(ts);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold tracking-wide">{t('homePage.progress')}</h2>
        <span className="tabular text-sm text-slate-500 dark:text-slate-400">
          {t('homePage.matchesPlayed', { done: f.num(p.done), total: f.num(p.total) })}
        </span>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {p.phases.map((ph) => (
          <li
            key={ph.phase}
            className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-sm"
          >
            <span className="truncate">{t(`homePage.phase_${ph.phase}`)}</span>
            <span
              role="progressbar"
              aria-label={t(`homePage.phase_${ph.phase}`)}
              aria-valuemin={0}
              aria-valuemax={ph.total}
              aria-valuenow={ph.done}
              className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-night-800"
            >
              <span
                className="block h-full rounded-full bg-bpl-green"
                style={{ width: `${(ph.done / ph.total) * 100}%` }}
              />
            </span>
            <span className="tabular w-12 text-right text-slate-500 dark:text-slate-400">
              {f.num(ph.done)}/{f.num(ph.total)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NextMatches({ fixtures, ts }: { fixtures: Fixture[]; ts: TournamentState }) {
  const { t } = useTranslation();
  const f = useFormat();
  const lang = usePrefs((s) => s.lang);
  const bengaliDigits = usePrefs((s) => s.bengaliDigits);
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold tracking-wide">{t('homePage.upcoming')}</h2>
        <Link to="/fixtures" className="text-sm font-semibold text-bpl-red">
          {t('homePage.allFixtures')} →
        </Link>
      </div>
      <ul className="mt-2 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {fixtures.map((fx) => {
          const ids = fixtureTeams(fx, ts);
          return (
            <li key={fx.id} className="relative py-2 pl-3">
              <TeamEdge
                a={findTeam(ids[0] ?? undefined)?.color}
                b={findTeam(ids[1] ?? undefined)?.color}
              />
              <div className="text-[13px] text-slate-600 dark:text-slate-400">
                {t('fixtures.matchNo', { n: f.num(fx.no) })} ·{' '}
                {formatDate(fx.date, lang, bengaliDigits, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {formatTime(fx.time, lang, f)}
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {([0, 1] as const).map((i) => {
                  const team = findTeam(ids[i] ?? undefined);
                  return (
                    <span key={i} className="flex items-center gap-2 font-semibold">
                      {team ? (
                        <TeamAvatar
                          name={team.name}
                          color={team.color}
                          logo={team.logo}
                          size="sm"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="size-8 shrink-0 rounded-full border border-dashed border-slate-400"
                        />
                      )}
                      <span
                        lang={team ? 'en' : undefined}
                        className={team ? '' : 'italic opacity-70'}
                      >
                        {slotLabel(i === 0 ? fx.teamA : fx.teamB, ids[i], t, f)}
                      </span>
                    </span>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
