import { fixtureById, type StageId } from '../data/fixtures';
import type { Match, MatchState, TeamIndex } from '../engine/types';
import type { FixtureFilter } from './fixturesView';
import { fixtureStart } from './home';

const STAGE_FILTER: Record<StageId, FixtureFilter> = {
  groupA: 'groupA',
  groupB: 'groupB',
  superSix: 'superSix',
  semi1: 'knockout',
  semi2: 'knockout',
  final: 'knockout',
};

/** The stage filter a match belongs to; null for a match outside the fixture. */
export function filterOf(m: Pick<Match, 'fixtureId'>): FixtureFilter | null {
  const fx = fixtureById(m.fixtureId);
  return fx ? STAGE_FILTER[fx.stage] : null;
}

/** When the match was (to be) played: its fixture's start, or for a friendly when it was last scored. */
export function playedAt(m: Pick<Match, 'fixtureId' | 'updatedAt'>): number {
  const fx = fixtureById(m.fixtureId);
  return fx ? fixtureStart(fx) : m.updatedAt;
}

/** Newest first. */
export function newestFirst<T extends { m: Pick<Match, 'fixtureId' | 'updatedAt'> }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => playedAt(b.m) - playedAt(a.m));
}

/** The two sides in batting order (the side that batted first on top); toss order before a ball. */
export function battingOrder(s: Pick<MatchState, 'innings'>): [TeamIndex, TeamIndex] {
  const first = s.innings.find((inn) => !inn.superOver)?.battingTeam ?? 0;
  return first === 0 ? [0, 1] : [1, 0];
}
