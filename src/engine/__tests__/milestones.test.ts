import { describe, expect, it } from 'vitest';
import { battingMilestone, isWicketHaul } from '../milestones';
import { setManOfTheMatch } from '../scoring';
import { makeMatch } from './helpers';

describe('milestones', () => {
  it('marks fifties, hundreds and three-wicket hauls', () => {
    expect(battingMilestone(49)).toBeNull();
    expect(battingMilestone(50)).toBe(50);
    expect(battingMilestone(99)).toBe(50);
    expect(battingMilestone(100)).toBe(100);
    expect(isWicketHaul(2)).toBe(false);
    expect(isWicketHaul(3)).toBe(true);
  });
});

describe('man of the match', () => {
  it('sets, changes and clears the pick, bumping the revision each time', () => {
    const m = { ...makeMatch(), rev: 4 };
    const a = setManOfTheMatch(m, 'a1', 10);
    expect(a.manOfTheMatch).toBe('a1');
    expect(a.rev).toBe(5);
    expect(a.updatedAt).toBe(10);
    const b = setManOfTheMatch(a, 'b3', 11);
    expect(b.manOfTheMatch).toBe('b3');
    expect(b.rev).toBe(6);
    const c = setManOfTheMatch(b, null, 12);
    expect('manOfTheMatch' in c).toBe(false);
    expect(c.rev).toBe(7);
  });

  it('ignores a player who is not in the match and an unchanged pick', () => {
    const m = makeMatch();
    expect(setManOfTheMatch(m, 'zz', 1)).toBe(m);
    const a = setManOfTheMatch(m, 'a1', 1);
    expect(setManOfTheMatch(a, 'a1', 2)).toBe(a);
  });
});

describe('man of the match helpers', () => {
  it('only trusts an id that belongs to a player of the match', async () => {
    const { manOfTheMatchId, teamOfPlayer } = await import('../milestones');
    const m = makeMatch();
    expect(manOfTheMatchId(m)).toBeNull();
    expect(manOfTheMatchId({ ...m, manOfTheMatch: 'b2' })).toBe('b2');
    expect(manOfTheMatchId({ ...m, manOfTheMatch: 'nobody' })).toBeNull();
    expect(manOfTheMatchId({ ...m, manOfTheMatch: 42 as unknown as string })).toBeNull();
    expect(teamOfPlayer(m, 'a3')).toBe(0);
    expect(teamOfPlayer(m, 'b3')).toBe(1);
  });
});
