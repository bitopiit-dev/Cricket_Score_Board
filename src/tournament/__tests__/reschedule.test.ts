import { describe, expect, it } from 'vitest';
import type { Fixture } from '../../data/fixtures';
import {
  FixtureEditError,
  changeFixtureTime,
  onlyTimesChanged,
  swapFixtureTimes,
  updateFixture,
} from '../fixtureEdit';

const team = (teamId: string) => ({ kind: 'team' as const, teamId });
const fx = (id: string, no: number, date: string, time: string): Fixture => ({
  id,
  no,
  date,
  time,
  stage: 'groupA',
  teamA: team(`${id}-a`),
  teamB: team(`${id}-b`),
});

const LIST: Fixture[] = [
  fx('f1', 1, '2026-11-17', '12:00'),
  fx('f2', 2, '2026-11-17', '13:00'),
  fx('f3', 3, '2026-11-18', '12:00'),
  fx('f4', 4, '2026-11-18', '13:00'),
  fx('f5', 5, '2026-11-19', '12:00'),
];
const ids = (l: Fixture[]) => l.map((f) => f.id);
const time = (l: Fixture[], id: string) => l.find((f) => f.id === id)?.time;

describe('swapping two matches on the same day', () => {
  it('trades the start times and keeps the day in time order', () => {
    const next = swapFixtureTimes(LIST, 'f3', 'f4');
    expect(time(next, 'f3')).toBe('13:00');
    expect(time(next, 'f4')).toBe('12:00');
    expect(ids(next)).toEqual(['f1', 'f2', 'f4', 'f3', 'f5']);
  });

  it('keeps match numbers, teams and other days as they were', () => {
    const next = swapFixtureTimes(LIST, 'f3', 'f4');
    expect(next.find((f) => f.id === 'f3')?.no).toBe(3);
    expect(next.find((f) => f.id === 'f4')?.teamA).toEqual(team('f4-a'));
    expect(next.filter((f) => f.date !== '2026-11-18')).toEqual(
      LIST.filter((f) => f.date !== '2026-11-18'),
    );
  });

  it('does not change the list it was given', () => {
    const copy = structuredClone(LIST);
    swapFixtureTimes(LIST, 'f3', 'f4');
    expect(LIST).toEqual(copy);
  });

  it('refuses matches on different days', () => {
    expect(() => swapFixtureTimes(LIST, 'f2', 'f3')).toThrow(FixtureEditError);
  });

  it('swapping a match with itself changes nothing', () => {
    expect(swapFixtureTimes(LIST, 'f3', 'f3')).toEqual(LIST);
  });
});

describe('changing one start time', () => {
  it('moves the match and re-orders only its own day', () => {
    const next = changeFixtureTime(LIST, 'f3', '14:30');
    expect(time(next, 'f3')).toBe('14:30');
    expect(ids(next)).toEqual(['f1', 'f2', 'f4', 'f3', 'f5']);
  });

  it('an earlier time on the same day stays first', () => {
    expect(ids(changeFixtureTime(LIST, 'f4', '11:00'))).toEqual(['f1', 'f2', 'f4', 'f3', 'f5']);
  });
});

describe('what a scorer may save', () => {
  it('accepts new times and a new order', () => {
    expect(onlyTimesChanged(LIST, swapFixtureTimes(LIST, 'f3', 'f4'))).toBe(true);
  });

  it('rejects any other change', () => {
    expect(onlyTimesChanged(LIST, updateFixture(LIST, 'f3', { teamA: team('x') }))).toBe(false);
    expect(onlyTimesChanged(LIST, updateFixture(LIST, 'f3', { date: '2026-11-20' }))).toBe(false);
    expect(onlyTimesChanged(LIST, updateFixture(LIST, 'f3', { no: 9 }))).toBe(false);
    expect(onlyTimesChanged(LIST, LIST.slice(1))).toBe(false);
    expect(onlyTimesChanged(LIST, [...LIST.slice(1), LIST[1]])).toBe(false);
  });

  it('ignores key order inside a fixture', () => {
    const reordered = LIST.map(({ teamB, teamA, ...rest }) => ({ teamB, ...rest, teamA }));
    expect(onlyTimesChanged(LIST, reordered)).toBe(true);
  });
});
