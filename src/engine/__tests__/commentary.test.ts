import { describe, expect, it } from 'vitest';
import { buildCommentary } from '../commentary';
import { undoLastEvent } from '../scoring';
import { Game, makeMatch } from './helpers';

describe('ball-by-ball commentary', () => {
  it('numbers balls, keeps an extra on the next legal ball and tracks the score', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.ball(4, { boundary: true }).do({ type: 'ball', runs: 0, extra: 'wide' }).ball(1);
    const c = buildCommentary(g.match);
    expect(c.map((b) => `${b.over - 1}.${b.ball}`)).toEqual(['0.1', '0.2', '0.2']);
    expect(c[0]).toMatchObject({ bowlerId: 'b1', batterId: 'a1', total: 4, score: { runs: 4 } });
    expect(c[1].total).toBe(1); // wide penalty
    expect(c[2]).toMatchObject({ batterId: 'a1', score: { runs: 6, wickets: 0 } });
  });

  it('follows strike changes and new overs', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.ball(1); // a2 now on strike
    for (let i = 0; i < 5; i++) g.ball(0);
    g.do({ type: 'newBowler', bowlerId: 'b2' }).ball(2);
    const c = buildCommentary(g.match);
    expect(c[1].batterId).toBe('a2');
    expect(c[6]).toMatchObject({ over: 2, ball: 1, bowlerId: 'b2' });
  });

  it('drops a ball that was undone', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(4).ball(6);
    g.match = undoLastEvent(g.match, 9);
    expect(buildCommentary(g.match)).toHaveLength(1);
  });
});
