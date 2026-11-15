import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import { playerTotals } from '../awards';
import { leaderboard, playerMatchLines } from '../leaders';

/** A: 5/1 (a1 4+1, a2 0 c b2 b b1). B chase: b1 hits a six and wins. */
function sampleMatch(id: string, createdAt: number): Match {
  const m = makeMatch(11, { overs: 1 });
  m.id = id;
  m.createdAt = createdAt;
  m.teams[0].teamId = 'ta';
  m.teams[1].teamId = 'tb';
  const g = new Game(m);
  g.start('a1', 'a2', 'b1').ball(4, { boundary: true }).ball(1);
  g.ball(0, { wicket: { kind: 'caught', batterId: 'a2', fielderId: 'b2' } });
  g.batter('a3').balls(0, 0, 0);
  g.start('b1', 'b2', 'a1').ball(6, { boundary: true });
  return g.match;
}

describe('player totals extras', () => {
  it('keeps the best bowling figures and whether the high score was not out', () => {
    const [b1] = playerTotals([sampleMatch('m1', 1)]).filter((r) => r.name === 'B1');
    expect(b1.bestBowling).toEqual({ wickets: 1, runs: 5 });
    expect(b1).toMatchObject({ highScore: 6, highScoreNotOut: true });
  });
});

describe('leaderboards', () => {
  const totals = playerTotals([sampleMatch('m1', 1), sampleMatch('m2', 2)]);

  it('ranks runs, wickets, sixes and fielding', () => {
    expect(leaderboard(totals, 'runs')[0]).toMatchObject({ name: 'B1', runs: 12 });
    expect(leaderboard(totals, 'wickets')[0]).toMatchObject({ name: 'B1', wickets: 2 });
    expect(leaderboard(totals, 'sixes').map((r) => r.name)).toEqual(['B1']);
    expect(leaderboard(totals, 'fielding')[0]).toMatchObject({ name: 'B2', catches: 2 });
  });

  it('leaves rates out until a player has faced or bowled enough balls', () => {
    // Nobody has faced 20 balls; B1 has bowled 12, A1 only 2
    expect(leaderboard(totals, 'strikeRate')).toEqual([]);
    expect(leaderboard(totals, 'economy').map((r) => r.name)).toEqual(['B1']);
  });
});

describe('player match lines', () => {
  it('lists batting, bowling and fielding per match, newest first', () => {
    const lines = playerMatchLines([sampleMatch('m1', 1), sampleMatch('m2', 2)], 'tb', 'B1');
    expect(lines.map((l) => l.matchId)).toEqual(['m2', 'm1']);
    expect(lines[0]).toMatchObject({
      opponentTeamId: 'ta',
      outcome: 'W',
      batting: { runs: 6, balls: 1, out: false, sixes: 1 },
      bowling: { legalBalls: 6, runs: 5, wickets: 1 },
      fielding: 0,
    });
    const b2 = playerMatchLines([sampleMatch('m1', 1)], 'tb', 'B2')[0];
    expect(b2.fielding).toBe(1);
  });
});
