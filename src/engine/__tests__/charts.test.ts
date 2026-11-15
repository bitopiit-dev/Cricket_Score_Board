import { describe, expect, it } from 'vitest';
import { overBars, wormPoints } from '../charts';
import { Game, makeMatch } from './helpers';

describe('chart data', () => {
  const play = () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.ball(4, { boundary: true }).ball(1).do({ type: 'ball', runs: 0, extra: 'wide' });
    g.ball(0, { wicket: { kind: 'bowled', batterId: 'a2' } }).do({
      type: 'newBatter',
      batterId: 'a3',
    });
    g.ball(2).ball(1).ball(6, { boundary: true });
    g.do({ type: 'newBowler', bowlerId: 'b2' }).ball(1);
    return g;
  };

  it('Manhattan: runs and wickets per over', () => {
    const g = play();
    expect(overBars(g.inn)).toEqual([
      { over: 1, runs: 15, wickets: 1 },
      { over: 2, runs: 1, wickets: 0 },
    ]);
  });

  it('worm: running total by overs, ending at the innings total', () => {
    const g = play();
    const pts = wormPoints(g.inn, g.match.settings);
    expect(pts[0]).toEqual({ x: 0, runs: 0, wicket: false });
    expect(pts.find((p) => p.wicket)).toMatchObject({ x: 3 / 6, runs: 6 });
    expect(pts.at(-1)).toMatchObject({ x: 7 / 6, runs: g.inn.runs });
    // The wide is joined to the ball before it, not a separate point
    expect(pts.filter((p) => p.x === 2 / 6)).toHaveLength(1);
  });
});
