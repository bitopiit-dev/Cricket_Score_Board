import { describe, expect, it } from 'vitest';
import { makeMatch } from '../../engine/__tests__/helpers';
import type { MatchState } from '../../engine/types';
import { leadsWithBowling, playerMoments } from '../playerMoments';

const bat = (playerId: string, runs: number, balls = runs) => ({
  playerId,
  order: 0,
  runs,
  balls,
  fours: 2,
  sixes: 1,
  dismissal: null,
  retiredHurt: false,
});
const bowl = (playerId: string, wickets: number, runsConceded = 10) => ({
  playerId,
  order: 0,
  legalBalls: 18,
  runsConceded,
  wickets,
  maidens: 0,
  dots: 0,
  wides: 0,
  noBalls: 0,
});
const state = (innings: unknown[]) => ({ innings, phase: 'completed' }) as unknown as MatchState;

describe('player moments', () => {
  it('finds fifties, hundreds and hauls, and skips quiet players', () => {
    const m = makeMatch();
    const s = state([
      { superOver: false, batters: [bat('a1', 54), bat('a2', 12)], bowlers: [bowl('b1', 3)] },
      { superOver: false, batters: [bat('b2', 101)], bowlers: [bowl('a3', 2)] },
    ]);
    const got = playerMoments(m, s).map((x) => [x.kind, x.playerId]);
    expect(got).toEqual([
      ['fifty', 'a1'],
      ['haul', 'b1'],
      ['hundred', 'b2'],
    ]);
  });

  it('puts the Man of the Match first, once', () => {
    const m = { ...makeMatch(), manOfTheMatch: 'a1' };
    const s = state([{ superOver: false, batters: [bat('a1', 60)], bowlers: [] }]);
    const got = playerMoments(m, s);
    expect(got).toHaveLength(1);
    expect(got[0].kind).toBe('mom');
  });

  it('leaves super overs out', () => {
    const s = state([{ superOver: true, batters: [bat('a1', 70)], bowlers: [bowl('b1', 4)] }]);
    expect(playerMoments(makeMatch(), s)).toEqual([]);
  });

  it('leads with wickets when they outweigh the runs', () => {
    const m = { ...makeMatch(), manOfTheMatch: 'a1' };
    const s = state([
      { superOver: false, batters: [bat('a1', 15)], bowlers: [] },
      { superOver: false, batters: [], bowlers: [bowl('a1', 2)] },
    ]);
    expect(leadsWithBowling(playerMoments(m, s)[0])).toBe(true);
  });
});
