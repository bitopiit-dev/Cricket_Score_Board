import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import { suggestManOfTheMatch } from '../momSuggest';

/** A: 5/1 (a1 4+1, a2 c b2 b b1). B chase: b1 hits a six and wins. */
function play() {
  const g = new Game(makeMatch(11, { overs: 1 }));
  g.start('a1', 'a2', 'b1').ball(4, { boundary: true }).ball(1);
  g.ball(0, { wicket: { kind: 'caught', batterId: 'a2', fielderId: 'b2' } });
  g.batter('a3').balls(0, 0, 0);
  return g;
}

describe('Man of the Match suggestion', () => {
  it('ranks only the winning team by match points', () => {
    const g = play();
    g.start('b1', 'b2', 'a1').ball(6, { boundary: true });
    const list = suggestManOfTheMatch(g.match, g.state);
    // B1: 6 runs + 1 wicket (20) = 26; B2: 1 catch = 10. A1's 5 runs don't count: A lost.
    expect(list.map((c) => [c.playerId, c.points])).toEqual([
      ['b1', 26],
      ['b2', 10],
    ]);
    expect(list[0]).toMatchObject({ team: 1, runs: 6, notOut: true, wickets: 1, fielding: 0 });
    expect(list.every((c) => c.team === 1)).toBe(true);
  });

  it('suggests nothing before the match is over', () => {
    const g = play();
    expect(suggestManOfTheMatch(g.match, g.state)).toEqual([]);
  });

  it('keeps to the limit', () => {
    const g = play();
    g.start('b1', 'b2', 'a1').ball(6, { boundary: true });
    expect(suggestManOfTheMatch(g.match, g.state, 1).map((c) => c.playerId)).toEqual(['b1']);
  });
});
