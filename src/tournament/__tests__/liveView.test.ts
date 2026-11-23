import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { battingOrder, filterOf, newestFirst, playedAt } from '../liveView';

const fx = (no: number) => FIXTURES.find((f) => f.no === no)!;

describe('liveView', () => {
  it('files a match under its stage filter', () => {
    expect(filterOf({ fixtureId: fx(1).id })).toBe(fx(1).stage);
    const final = FIXTURES.find((f) => f.stage === 'final')!;
    expect(filterOf({ fixtureId: final.id })).toBe('knockout');
    expect(filterOf({})).toBeNull();
  });

  it('orders by the fixture, newest first; a friendly by when it was scored', () => {
    const rows = [
      { m: { fixtureId: fx(1).id, updatedAt: 9e15 } },
      { m: { fixtureId: fx(12).id, updatedAt: 1 } },
      { m: { fixtureId: undefined, updatedAt: playedAt({ fixtureId: fx(5).id, updatedAt: 0 }) } },
    ];
    expect(newestFirst(rows).map((r) => r.m.fixtureId)).toEqual([fx(12).id, undefined, fx(1).id]);
  });

  it('puts the side that batted first on top', () => {
    expect(battingOrder({ innings: [] })).toEqual([0, 1]);
    const inn = (battingTeam: 0 | 1, superOver = false) => ({ battingTeam, superOver }) as never;
    expect(battingOrder({ innings: [inn(1), inn(0)] })).toEqual([1, 0]);
    // A super over (batted in either order) doesn't change who batted first
    expect(battingOrder({ innings: [inn(1), inn(0), inn(0, true), inn(1, true)] })).toEqual([1, 0]);
  });
});
