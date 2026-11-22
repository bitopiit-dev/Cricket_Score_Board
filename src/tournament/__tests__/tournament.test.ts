import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match, MatchSettings } from '../../engine/types';
import { bestWicketTakers, manOfTheSeries, playerTotals } from '../awards';
import { LEAGUE_POINTS, QUALIFIERS } from '../format';

describe('format', () => {
  it('uses 2 / 1 / 1 / 0 league points; 3 per group and 4 from the Super Six go through', () => {
    expect(LEAGUE_POINTS).toEqual({ win: 2, tie: 1, noResult: 1, loss: 0 });
    expect(QUALIFIERS).toEqual({ group: 3, superSix: 4 });
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

describe('awards (rule 31)', () => {
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
