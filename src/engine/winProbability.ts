import { BALLS_PER_OVER, maxWickets, SUPER_OVER } from './rules';
import { deriveMatchState } from './scoring';
import type { InningsState, Match, MatchState, TeamIndex } from './types';

/**
 * Live win chance for both teams, from the score alone (no player ratings,
 * no history). A simple resource model in the spirit of Duckworth-Lewis:
 *
 * - The pitch's scoring rate comes from the first innings of the pair (the
 *   current one while it is being played), pulled towards a default rate
 *   until enough balls have been bowled to trust it.
 * - Runs still to come = what the balls left would give at that rate,
 *   capped by the wickets in hand (few wickets left → the batters can't
 *   keep up the rate for long).
 * - The chance is how likely those expected runs are to beat the runs
 *   needed, allowing for the swing of the balls still to be bowled.
 *
 * First innings: the batting side's projected total is set as a target for
 * the other side, with full balls and wickets, so 50/50 means "on par".
 */

/** Runs per over assumed before the match tells us better. */
export const DEFAULT_RUN_RATE = 8;
/** Balls of evidence the default rate is worth when blending. */
const PRIOR_BALLS = 18;
/** Runs a wicket in hand is worth, in balls of scoring at the pitch rate. */
const BALLS_PER_WICKET = 12;
/** Variance of runs per ball (amateur short-format cricket). */
const VAR_PER_BALL = 1.8;

export interface WinChance {
  /** Chance of each team winning, 0–1; the two add up to 1. */
  chance: [number, number];
  /** The team batting now (or about to bat in a chase). */
  batting: TeamIndex;
}

/** Scoring rate per ball, the evidence blended with the default. */
function pitchRate(runs: number, legalBalls: number): number {
  const prior = DEFAULT_RUN_RATE / BALLS_PER_OVER;
  return (runs + prior * PRIOR_BALLS) / (legalBalls + PRIOR_BALLS);
}

/** Expected runs from the balls left with the wickets in hand (uncalibrated). */
function rawResource(balls: number, wickets: number, rate: number): number {
  if (balls <= 0 || wickets <= 0) return 0;
  const cap = wickets * rate * BALLS_PER_WICKET;
  return cap * (1 - Math.exp((-rate * balls) / cap));
}

/**
 * Expected runs, scaled so a full innings with every wicket in hand gives
 * exactly rate × balls (the cap only bites when wickets are short).
 */
function expectedRuns(
  balls: number,
  wickets: number,
  rate: number,
  fullBalls: number,
  fullWickets: number,
): number {
  const full = rawResource(fullBalls, fullWickets, rate);
  const scale = full > 0 ? (rate * fullBalls) / full : 1;
  return rawResource(balls, wickets, rate) * scale;
}

/** Normal CDF via the logistic approximation (good to ~1%). */
function normalCdf(z: number): number {
  return 1 / (1 + Math.exp(-1.702 * z));
}

/** Keep a live chance off 0 % and 100 %: one ball can always change things. */
function clamp(p: number): number {
  return Math.min(0.99, Math.max(0.01, p));
}

interface ChaseInput {
  need: number;
  balls: number;
  wickets: number;
  rate: number;
  fullBalls: number;
  fullWickets: number;
  /** Extra uncertainty in the target itself (first-innings projection). */
  extraVar?: number;
}

/** Chance that the chasing side scores `need` more runs. */
function chaseChance(c: ChaseInput): number {
  if (c.need <= 0) return 1;
  if (c.balls <= 0 || c.wickets <= 0) return 0;
  const exp = expectedRuns(c.balls, c.wickets, c.rate, c.fullBalls, c.fullWickets);
  const sd = 1 + Math.sqrt(VAR_PER_BALL * c.balls + (c.extraVar ?? 0));
  // +0.5: runs are whole numbers, so "reach need" starts halfway below it
  return normalCdf((exp - c.need + 0.5) / sd);
}

function fullBallsOf(inn: InningsState): number {
  return inn.oversLimit * BALLS_PER_OVER;
}

/** Wickets the side batting second will have, before its innings exists. */
function chaseWickets(match: Match, first: InningsState): number {
  return first.superOver
    ? SUPER_OVER.wickets
    : maxWickets(match.teams[first.bowlingTeam], match.settings);
}

function pair(battingFirst: TeamIndex, pFirst: number, batting: TeamIndex): WinChance {
  const p = clamp(pFirst);
  const chance: [number, number] = battingFirst === 0 ? [p, 1 - p] : [1 - p, p];
  return { chance, batting };
}

/**
 * Both teams' chances right now, or null when there is nothing to say: the
 * match hasn't started, is over, or a super over is about to start.
 */
export function winChance(match: Match, state: MatchState): WinChance | null {
  if (state.phase === 'completed' || state.phase === 'superOverBreak') return null;
  const last = state.innings[state.innings.length - 1];
  if (!last) return null;
  const isFirstOfPair = last.index % 2 === 0;
  const full = fullBallsOf(last);

  if (isFirstOfPair) {
    const first = last;
    const rate = pitchRate(first.runs, first.legalBalls);
    const wicketsLeft = first.wicketsLimit - first.wickets;
    const ballsLeft = first.ended ? 0 : Math.max(0, full - first.legalBalls);
    const target =
      first.runs + expectedRuns(ballsLeft, wicketsLeft, rate, full, first.wicketsLimit) + 1;
    const pChase = chaseChance({
      need: target,
      balls: full,
      wickets: chaseWickets(match, first),
      rate,
      fullBalls: full,
      fullWickets: chaseWickets(match, first),
      extraVar: VAR_PER_BALL * ballsLeft,
    });
    // Innings over: the chase is next, so it's the other side "batting"
    const batting = first.ended ? first.bowlingTeam : first.battingTeam;
    return pair(first.battingTeam, 1 - pChase, batting);
  }

  const first = state.innings[last.index - 1];
  const chase = last;
  if (!first || chase.target === null) return null;
  const rate = pitchRate(first.runs, first.legalBalls);
  const pChase = chaseChance({
    need: chase.target - chase.runs,
    balls: chase.ended ? 0 : Math.max(0, full - chase.legalBalls),
    wickets: chase.wicketsLimit - chase.wickets,
    rate,
    fullBalls: full,
    fullWickets: chase.wicketsLimit,
  });
  return pair(first.battingTeam, 1 - pChase, chase.battingTeam);
}

export interface WinChancePoint {
  /** Legal balls bowled in the match so far (both main innings). */
  ball: number;
  /** Chance of the team that batted first (0–1). */
  first: number;
}

/**
 * The first-batting team's chance after every legal ball of the two main
 * innings (and after any wicket on a no-ball / wide), for the chart. Ends
 * on 1 or 0 once the match is decided.
 */
export function winChanceTimeline(match: Match): WinChancePoint[] {
  const pts: WinChancePoint[] = [];
  let firstTeam: TeamIndex | null = null;
  for (let i = 0; i < match.events.length; i += 1) {
    const ev = match.events[i];
    if (ev.type !== 'ball' && ev.type !== 'inningsStart' && ev.type !== 'endInnings') continue;
    const state = deriveMatchState({ ...match, events: match.events.slice(0, i + 1) });
    const main = state.innings.filter((inn) => !inn.superOver);
    if (main.length === 0) continue;
    if (state.innings.some((inn) => inn.superOver)) break;
    firstTeam ??= main[0].battingTeam;
    const ball = main.reduce((s, inn) => s + inn.legalBalls, 0);
    const wc = winChance(match, state);
    let first: number | null = wc ? wc.chance[firstTeam] : null;
    if (first === null && state.result) {
      first = state.result.kind === 'tie' ? 0.5 : state.result.winner === firstTeam ? 1 : 0;
    }
    if (first === null) first = 0.5; // scores level, super over next
    const prev = pts[pts.length - 1];
    if (prev && prev.ball === ball && !(ev.type === 'ball' && ev.wicket)) prev.first = first;
    else pts.push({ ball, first });
  }
  // A super over decided it: finish the line at the winner
  const final = deriveMatchState(match);
  const end = pts[pts.length - 1];
  if (
    end &&
    firstTeam !== null &&
    final.result?.kind === 'won' &&
    final.result.by === 'superOver'
  ) {
    pts.push({ ball: end.ball, first: final.result.winner === firstTeam ? 1 : 0 });
  }
  return pts;
}
