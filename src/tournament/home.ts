import { FIXTURES, type Fixture, type StageId } from '../data/fixtures';
import { BALLS_PER_OVER } from '../engine/rules';
import { deriveMatchState } from '../engine/scoring';
import type { InningsState, Match, MatchState } from '../engine/types';
import type { TournamentState } from './standings';

/**
 * What the home page shows, worked out from the fixture, the matches on this
 * device and the current time. Pure functions so every state is testable.
 */

/** How long a result stays in the hero before the next countdown takes over. */
export const RESULT_HOLD_MS = 12 * 60 * 60 * 1000;
/** A match that has not started this long after its start time is no longer "next". */
export const LATE_START_GRACE_MS = 3 * 60 * 60 * 1000;

/** Fixture start as a timestamp. Fixture times are Bangladesh time (UTC+6). */
export function fixtureStart(f: Pick<Fixture, 'date' | 'time'>): number {
  return Date.parse(`${f.date}T${f.time}:00+06:00`);
}

export type HomeHero =
  | { kind: 'live'; match: Match; state: MatchState; fixture?: Fixture }
  | { kind: 'result'; match: Match; state: MatchState; fixture?: Fixture; next?: Fixture }
  | { kind: 'upcoming'; fixture: Fixture }
  | { kind: 'over' };

const isLive = (m: Match, s: MatchState) => m.events.length > 0 && s.phase !== 'completed';

/** The next fixture that has not started, allowing for a late start. */
export function nextFixture(
  ts: TournamentState,
  now: number,
  fixtures: readonly Fixture[] = FIXTURES,
): Fixture | undefined {
  return [...fixtures]
    .sort((a, b) => fixtureStart(a) - fixtureStart(b))
    .find(
      (f) =>
        ts.outcomes.get(f.id)?.status === 'scheduled' &&
        fixtureStart(f) > now - LATE_START_GRACE_MS,
    );
}

export function pickHero(
  matches: Match[],
  ts: TournamentState,
  now: number,
  fixtures: readonly Fixture[] = FIXTURES,
): HomeHero {
  const byId = (id?: string) => fixtures.find((f) => f.id === id);
  const withState = matches.map((m) => ({ m, s: deriveMatchState(m) }));

  // 1. A match being scored: fixture matches first, then the most recently updated
  const live = withState
    .filter(({ m, s }) => isLive(m, s))
    .sort(
      (a, b) => Number(!!b.m.fixtureId) - Number(!!a.m.fixtureId) || b.m.updatedAt - a.m.updatedAt,
    )[0];
  if (live) return { kind: 'live', match: live.m, state: live.s, fixture: byId(live.m.fixtureId) };

  const next = nextFixture(ts, now, fixtures);

  // 2. A fixture match that finished recently
  const recent = withState
    .filter(
      ({ m, s }) => m.fixtureId && s.phase === 'completed' && now - m.updatedAt < RESULT_HOLD_MS,
    )
    .sort((a, b) => b.m.updatedAt - a.m.updatedAt)[0];
  if (recent) {
    return {
      kind: 'result',
      match: recent.m,
      state: recent.s,
      fixture: byId(recent.m.fixtureId),
      next,
    };
  }

  // 3. The next match, or the tournament is over
  return next ? { kind: 'upcoming', fixture: next } : { kind: 'over' };
}

/** The next `count` fixtures still to be played, after `skipId` (shown in the hero). */
export function upcomingFixtures(
  ts: TournamentState,
  now: number,
  count: number,
  skipId?: string,
  fixtures: readonly Fixture[] = FIXTURES,
): Fixture[] {
  return [...fixtures]
    .sort((a, b) => fixtureStart(a) - fixtureStart(b))
    .filter(
      (f) =>
        f.id !== skipId &&
        ts.outcomes.get(f.id)?.status === 'scheduled' &&
        fixtureStart(f) > now - LATE_START_GRACE_MS,
    )
    .slice(0, count);
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True when the start time has passed. */
  due: boolean;
}

export function countdown(target: number, now: number): CountdownParts {
  const ms = Math.max(0, target - now);
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    due: ms === 0,
  };
}

/** Total at the current run rate over the full innings (null before the first ball). */
export function projectedTotal(inn: Pick<InningsState, 'runs' | 'legalBalls' | 'oversLimit'>) {
  if (inn.legalBalls === 0) return null;
  return Math.round((inn.runs / inn.legalBalls) * inn.oversLimit * BALLS_PER_OVER);
}

export type ProgressPhase = 'groups' | 'superSix' | 'semis' | 'final';

const PHASE_OF: Record<StageId, ProgressPhase> = {
  groupA: 'groups',
  groupB: 'groups',
  superSix: 'superSix',
  semi1: 'semis',
  semi2: 'semis',
  final: 'final',
};

export interface TournamentProgress {
  done: number;
  total: number;
  phases: { phase: ProgressPhase; done: number; total: number }[];
}

/** Completed fixture matches, overall and by phase. */
export function tournamentProgress(
  ts: TournamentState,
  fixtures: readonly Fixture[] = FIXTURES,
): TournamentProgress {
  const order: ProgressPhase[] = ['groups', 'superSix', 'semis', 'final'];
  const phases = order.map((phase) => {
    const fs = fixtures.filter((f) => PHASE_OF[f.stage] === phase);
    return {
      phase,
      total: fs.length,
      done: fs.filter((f) => ts.outcomes.get(f.id)?.status === 'completed').length,
    };
  });
  return {
    done: phases.reduce((n, p) => n + p.done, 0),
    total: fixtures.length,
    phases,
  };
}
