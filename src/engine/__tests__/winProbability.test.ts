import { describe, expect, it } from 'vitest';
import { winChance, winChanceTimeline } from '../winProbability';
import { Game, makeMatch } from './helpers';

/** Two-over matches keep the tests short; each over needs a fresh bowler. */
const newGame = () => new Game(makeMatch(11, { overs: 2, maxOversPerBowler: 1 }));

const chanceOf = (g: Game, team: 0 | 1) => winChance(g.match, g.state)!.chance[team];

/** Team A bats first and makes `runs` in its two overs (no wickets). */
function firstInnings(runs: [number[], number[]]) {
  const g = newGame().start('a1', 'a2', 'b1');
  g.balls(...runs[0])
    .bowler('b2')
    .balls(...runs[1]);
  return g;
}

describe('win chance', () => {
  it('says nothing before the first ball', () => {
    const g = newGame();
    expect(winChance(g.match, g.state)).toBeNull();
  });

  it('starts close to even and always adds up to 100 %', () => {
    const g = newGame().start('a1', 'a2', 'b1').ball(1);
    const wc = winChance(g.match, g.state)!;
    expect(wc.batting).toBe(0);
    expect(wc.chance[0] + wc.chance[1]).toBeCloseTo(1, 10);
    expect(wc.chance[0]).toBeGreaterThan(0.35);
    expect(wc.chance[0]).toBeLessThan(0.65);
  });

  it('first innings: boundaries help the batting side, wickets hurt it', () => {
    const quiet = newGame().start('a1', 'a2', 'b1').balls(1, 1, 1);
    const fast = newGame().start('a1', 'a2', 'b1').balls(6, 6, 4);
    const wickets = newGame().start('a1', 'a2', 'b1');
    wickets.out('bowled').batter('a3').out('bowled').batter('a4').ball(1);
    expect(chanceOf(fast, 0)).toBeGreaterThan(chanceOf(quiet, 0));
    expect(chanceOf(wickets, 0)).toBeLessThan(chanceOf(quiet, 0));
  });

  it('at the innings break the chasing side is the one "batting"', () => {
    const g = firstInnings([
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
    ]);
    expect(g.state.phase).toBe('inningsBreak');
    const wc = winChance(g.match, g.state)!;
    expect(wc.batting).toBe(1);
  });

  it('chase: easy targets are likely, steep ones unlikely', () => {
    const g = firstInnings([
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
    ]); // 12, target 13
    g.start('b1', 'b2', 'a1').balls(4, 4, 4); // need 1 off 9
    expect(chanceOf(g, 1)).toBeGreaterThan(0.9);

    const h = firstInnings([
      [6, 6, 6, 6, 6, 6],
      [6, 6, 6, 6, 6, 6],
    ]); // 72, target 73
    h.start('b1', 'b2', 'a1').balls(0, 0, 0, 0, 0, 0).bowler('a2').ball(1); // need 72 off 5
    expect(chanceOf(h, 1)).toBeLessThan(0.05);
  });

  it('chase: losing a wicket lowers the chasing side\u2019s chance', () => {
    const base = () => {
      const g = firstInnings([
        [2, 2, 2, 2, 2, 2],
        [2, 2, 2, 2, 2, 2],
      ]);
      return g.start('b1', 'b2', 'a1').balls(2, 2);
    };
    const safe = base().ball(0);
    const out = base().out('bowled');
    expect(chanceOf(out, 1)).toBeLessThan(chanceOf(safe, 1));
  });

  it('says nothing once the match is over', () => {
    const g = firstInnings([
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
    ]);
    g.start('b1', 'b2', 'a1').balls(6, 6, 4);
    expect(g.state.phase).toBe('completed');
    expect(winChance(g.match, g.state)).toBeNull();
  });
});

describe('win chance timeline', () => {
  it('one point per legal ball, ending on the winner', () => {
    const g = firstInnings([
      [1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1],
    ]);
    g.start('b1', 'b2', 'a1').wide().balls(6, 6); // 1 + 12 = 13, target reached
    const pts = winChanceTimeline(g.match);
    expect(pts[0].ball).toBe(0);
    // Balls 0 to 14; the wide shares a ball number with its neighbour
    expect(new Set(pts.map((p) => p.ball)).size).toBe(15);
    expect(pts.at(-1)).toEqual({ ball: 14, first: 0 });
    for (const p of pts) {
      expect(p.first).toBeGreaterThanOrEqual(0);
      expect(p.first).toBeLessThanOrEqual(1);
    }
  });
});
