import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { fixtureStart } from '../home';
import {
  COUNTDOWN_MS,
  filterCounts,
  finalDate,
  matchesFilter,
  matchesPerDay,
  msUntilStart,
  playedCount,
} from '../fixturesView';
import { tournamentState } from '../standings';

describe('filters', () => {
  it('counts every stage of the schedule', () => {
    const c = filterCounts(FIXTURES);
    expect(c.all).toBe(FIXTURES.length);
    expect(c.groupA + c.groupB + c.superSix + c.knockout).toBe(c.all);
    expect(c.knockout).toBe(3);
  });

  it('puts both semis and the final under knockout', () => {
    const ko = FIXTURES.filter((fx) => matchesFilter(fx, 'knockout')).map((fx) => fx.stage);
    expect(new Set(ko)).toEqual(new Set(['semi1', 'semi2', 'final']));
  });
});

describe('progress', () => {
  it('counts nothing played before any match', () => {
    expect(playedCount(tournamentState([]))).toBe(0);
  });

  it('finds the final', () => {
    expect(finalDate()).toBe(FIXTURES.find((f) => f.stage === 'final')!.date);
  });
});

describe('msUntilStart', () => {
  const fx = FIXTURES[0];
  const start = fixtureStart(fx);

  it('counts down inside the window', () => {
    expect(msUntilStart(fx, start - 18 * 60_000)).toBe(18 * 60_000);
    expect(msUntilStart(fx, start - COUNTDOWN_MS)).toBe(COUNTDOWN_MS);
  });

  it('gives null too early, once started, and for a postponed match', () => {
    expect(msUntilStart(fx, start - COUNTDOWN_MS - 1)).toBeNull();
    expect(msUntilStart(fx, start)).toBeNull();
    expect(msUntilStart({ ...fx, postponed: true }, start - 60_000)).toBeNull();
  });
});

describe('matchesPerDay', () => {
  it('adds up to the list length', () => {
    const per = matchesPerDay(FIXTURES);
    expect([...per.values()].reduce((a, b) => a + b, 0)).toBe(FIXTURES.length);
    expect(per.get(FIXTURES[0].date)).toBeGreaterThan(0);
  });
});
