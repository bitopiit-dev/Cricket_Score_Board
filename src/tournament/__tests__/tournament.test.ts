import { describe, expect, it } from 'vitest';
import { TOURNAMENT_TEAMS } from '../../data/teams';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match, MatchSettings } from '../../engine/types';
import { bestWicketTakers, manOfTheSeries, playerTotals } from '../awards';
import {
  BPL_PLAYOFFS,
  LEAGUE_POINTS,
  resolvePlayoffs,
  roundRobinMatchCount,
  roundRobinRounds,
} from '../format';

describe('round robin (rule 3)', () => {
  const ids = TOURNAMENT_TEAMS.map((t) => t.id);
  const rounds = roundRobinRounds(ids);
  const pairs = rounds.flat();

  it('12 teams play 66 matches in 11 rounds', () => {
    expect(roundRobinMatchCount(12)).toBe(66);
    expect(rounds).toHaveLength(11);
    expect(pairs).toHaveLength(66);
  });

  it('every pair meets exactly once', () => {
    const keys = pairs.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(66);
    expect(pairs.every(([a, b]) => a !== b)).toBe(true);
  });

  it('no team plays twice in a round', () => {
    for (const r of rounds) expect(new Set(r.flat()).size).toBe(r.length * 2);
  });

  it('each team plays 11 matches, home and away roughly balanced', () => {
    for (const id of ids) {
      const games = pairs.filter((p) => p.includes(id));
      expect(games).toHaveLength(11);
      const first = games.filter((p) => p[0] === id).length;
      expect(Math.abs(first - (11 - first))).toBeLessThanOrEqual(3);
    }
  });

  it('handles an odd number of teams with a rest each round', () => {
    const r = roundRobinRounds(['a', 'b', 'c', 'd', 'e']);
    expect(r).toHaveLength(5);
    expect(r.flat()).toHaveLength(10);
  });

  it('rejects duplicate teams', () => {
    expect(() => roundRobinRounds(['a', 'a'])).toThrow();
  });

  it('uses 2 / 1 / 1 / 0 league points', () => {
    expect(LEAGUE_POINTS).toEqual({ win: 2, tie: 1, noResult: 1, loss: 0 });
  });
});

describe('BPL play-offs', () => {
  const table = ['t1', 't2', 't3', 't4', 't5'];

  it('has qualifier 1, eliminator, qualifier 2 and final', () => {
    expect(BPL_PLAYOFFS.map((p) => p.id)).toEqual([
      'qualifier1',
      'eliminator',
      'qualifier2',
      'final',
    ]);
  });

  it('places the top four, then fills in winners and losers', () => {
    expect(resolvePlayoffs(table, {})).toEqual([
      { id: 'qualifier1', home: 't1', away: 't2' },
      { id: 'eliminator', home: 't3', away: 't4' },
      { id: 'qualifier2', home: null, away: null },
      { id: 'final', home: null, away: null },
    ]);
    const after = resolvePlayoffs(table, { qualifier1: 't2', eliminator: 't3', qualifier2: 't1' });
    expect(after[2]).toEqual({ id: 'qualifier2', home: 't1', away: 't3' });
    expect(after[3]).toEqual({ id: 'final', home: 't2', away: 't1' });
  });

  it('ignores a winner who did not play in that match', () => {
    expect(resolvePlayoffs(table, { qualifier1: 't9' })[3].home).toBeNull();
  });

  it('leaves slots empty until the league table has four teams', () => {
    expect(resolvePlayoffs(['t1', 't2'], {})[1]).toEqual({
      id: 'eliminator',
      home: null,
      away: null,
    });
  });
});

/* --------------------------------- Awards --------------------------------- */

function tournamentGame(id: string, settings: Partial<MatchSettings> = {}) {
  const m = makeMatch(11, { overs: 1, ...settings });
  m.id = id;
  m.teams[0].teamId = 'ta';
  m.teams[1].teamId = 'tb';
  return new Game(m);
}

/** A: 5/1 (a1 4+1, a2 0 c b2 b b1). B chase: b1 hits a six. */
function sampleMatch(id: string): Match {
  const g = tournamentGame(id);
  g.start('a1', 'a2', 'b1').ball(4, { boundary: true }).ball(1);
  g.ball(0, { wicket: { kind: 'caught', batterId: 'a2', fielderId: 'b2' } });
  g.batter('a3').balls(0, 0, 0);
  g.start('b1', 'b2', 'a1').ball(6, { boundary: true });
  expect(g.state.phase).toBe('completed');
  return g.match;
}

describe('awards (rule 30)', () => {
  it('adds up batting, bowling and fielding across matches', () => {
    const totals = playerTotals([sampleMatch('m1'), sampleMatch('m2')]);
    const b1 = totals.find((r) => r.name === 'B1')!;
    expect(b1).toMatchObject({
      matches: 2,
      runs: 12,
      sixes: 2,
      wickets: 2,
      legalBalls: 12,
      runsConceded: 10,
      highScore: 6,
      notOuts: 2,
    });
    expect(totals.find((r) => r.name === 'B2')!.catches).toBe(2);
    expect(totals.find((r) => r.name === 'A1')!.fours).toBe(2);
  });

  it('ranks the best wicket-taker and Man of the Series', () => {
    const totals = playerTotals([sampleMatch('m1')]);
    expect(bestWicketTakers(totals).map((r) => r.name)).toEqual(['B1']);
    // B1: 6 runs + 1 wicket (20) = 26; B2: 1 catch = 10; A1: 5 runs. A2 (0) is left out.
    expect(manOfTheSeries(totals).map((r) => [r.name, r.points])).toEqual([
      ['B1', 26],
      ['B2', 10],
      ['A1', 5],
    ]);
  });

  it('skips unfinished matches and matches outside the tournament', () => {
    const unfinished = tournamentGame('m3').start('a1', 'a2', 'b1').ball(4).match;
    const friendly = sampleMatch('m4');
    friendly.teams[0].teamId = undefined;
    expect(playerTotals([unfinished, friendly])).toEqual([]);
  });

  it('leaves super over runs out of the totals', () => {
    const g = tournamentGame('m5', { superOver: true });
    g.start('a1', 'a2', 'b1').balls(1, 1, 1, 1, 1, 1);
    g.start('b1', 'b2', 'a1').balls(1, 1, 1, 1, 1, 1);
    g.start('b1', 'b2', 'a1').ball(4, { boundary: true }).balls(0, 0, 0, 0, 0);
    g.start('a1', 'a2', 'b1').balls(0, 0, 0, 0, 0, 0);
    expect(g.state.result).toMatchObject({ by: 'superOver', winner: 1 });
    const b1 = playerTotals([g.match]).find((r) => r.name === 'B1')!;
    expect(b1.runs).toBe(3);
    expect(b1.fours).toBe(0);
  });
});
