import { describe, expect, it } from 'vitest';
import {
  finishMatch,
  isMatchLocked,
  reopenMatch,
  setManOfTheMatch,
  undoLastEvent,
} from '../scoring';
import { Game, makeMatch } from './helpers';

/** A one-over match: A makes 5/1, B wins with a six off the first ball. */
function finished() {
  const g = new Game(makeMatch(11, { overs: 1 }));
  g.start('a1', 'a2', 'b1').ball(4, { boundary: true }).ball(1);
  g.ball(0, { wicket: { kind: 'caught', batterId: 'a2', fielderId: 'b2' } });
  g.batter('a3').balls(0, 0, 0);
  g.start('b1', 'b2', 'a1').ball(6, { boundary: true });
  return g;
}

describe('finish match', () => {
  it('locks a completed match and syncs as a change', () => {
    const g = finished();
    const m = finishMatch(g.match, 100);
    expect(isMatchLocked(m)).toBe(true);
    expect(m.finishedAt).toBe(100);
    expect(m.rev).toBe((g.match.rev ?? 0) + 1);
  });

  it("won't finish a match that is still being played", () => {
    const g = new Game(makeMatch(11, { overs: 1 }));
    g.start('a1', 'a2', 'b1').ball(1);
    expect(finishMatch(g.match, 1)).toBe(g.match);
  });

  it('blocks balls and undo once locked, but still allows the Man of the Match', () => {
    const g = finished();
    g.match = finishMatch(g.match, 100);
    expect(g.tryDo({ type: 'swapStrike' })).toBe('matchLocked');
    expect(undoLastEvent(g.match, 101)).toBe(g.match);
    expect(setManOfTheMatch(g.match, 'b1', 102).manOfTheMatch).toBe('b1');
  });

  it('unlocks again for a correction', () => {
    const g = finished();
    const locked = finishMatch(g.match, 100);
    const open = reopenMatch(locked, 101);
    expect(isMatchLocked(open)).toBe(false);
    expect('finishedAt' in open).toBe(false);
    expect(undoLastEvent(open, 102).events.length).toBe(open.events.length - 1);
    expect(reopenMatch(open, 103)).toBe(open);
  });
});
