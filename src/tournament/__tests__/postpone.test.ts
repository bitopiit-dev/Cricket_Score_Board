import { describe, expect, it } from 'vitest';
import { FIXTURES, type Fixture } from '../../data/fixtures';
import {
  changeFixtureTime,
  onlyScorerEdits,
  postponeDay,
  setPostponed,
  updateFixture,
} from '../fixtureEdit';
import { nextFixture, nextMatchDay, postponedFixtures, upcomingFixtures } from '../home';
import { tournamentState } from '../standings';
import { teamRecord } from '../teamView';

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
];
const get = (l: Fixture[], id: string) => l.find((f) => f.id === id)!;
const at = (iso: string) => Date.parse(iso);

describe('postponing a match', () => {
  it('marks one match and leaves the others alone', () => {
    const next = setPostponed(LIST, 'f2', true);
    expect(get(next, 'f2').postponed).toBe(true);
    expect(get(next, 'f1').postponed).toBeUndefined();
    expect(LIST[1].postponed).toBeUndefined();
  });

  it('undo removes the key, so the list is as before', () => {
    expect(setPostponed(setPostponed(LIST, 'f2', true), 'f2', false)).toEqual(LIST);
  });

  it('a whole day: only the matches asked for, only on that day', () => {
    const next = postponeDay(LIST, '2026-11-17', ['f1', 'f2', 'f3']);
    expect(next.map((f) => !!f.postponed)).toEqual([true, true, false]);
    // A match that already started is not passed in, so it stays on
    expect(postponeDay(LIST, '2026-11-17', ['f2']).map((f) => !!f.postponed)).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('a new date clears the mark; a new time does not', () => {
    const off = setPostponed(LIST, 'f1', true);
    expect(get(updateFixture(off, 'f1', { date: '2026-11-20' }), 'f1').postponed).toBeUndefined();
    expect(get(updateFixture(off, 'f1', { date: '2026-11-17' }), 'f1').postponed).toBe(true);
    expect(get(changeFixtureTime(off, 'f1', '14:00'), 'f1').postponed).toBe(true);
  });

  it('a scorer may save it, but still not a new date', () => {
    expect(onlyScorerEdits(LIST, setPostponed(LIST, 'f1', true))).toBe(true);
    expect(onlyScorerEdits(LIST, postponeDay(LIST, '2026-11-17', ['f1', 'f2']))).toBe(true);
    const off = setPostponed(LIST, 'f1', true);
    expect(onlyScorerEdits(off, setPostponed(off, 'f1', false))).toBe(true);
    expect(onlyScorerEdits(off, updateFixture(off, 'f1', { date: '2026-11-20' }))).toBe(false);
  });
});

describe('a postponed match on the home page', () => {
  const ts = tournamentState([]);
  const before = at('2026-11-15T10:00:00+06:00');
  const off = postponeDay([...FIXTURES], FIXTURES[0].date, [FIXTURES[0].id, FIXTURES[1].id]);

  it('is not the next match and not in the countdown', () => {
    expect(nextFixture(ts, before, off)?.id).toBe(FIXTURES[2].id);
    expect(nextMatchDay(ts, before, off).map((f) => f.date)).not.toContain(FIXTURES[0].date);
    expect(upcomingFixtures(ts, before, 3, undefined, off).map((f) => f.id)).not.toContain(
      FIXTURES[0].id,
    );
  });

  it('is listed in the announcement until it gets a new date', () => {
    expect(postponedFixtures(ts, off).map((f) => f.id)).toEqual([FIXTURES[0].id, FIXTURES[1].id]);
    const moved = updateFixture(off, FIXTURES[0].id, { date: '2026-12-18' });
    expect(postponedFixtures(ts, moved).map((f) => f.id)).toEqual([FIXTURES[1].id]);
    expect(postponedFixtures(ts, FIXTURES)).toEqual([]);
  });
});

describe('a team whose match is postponed', () => {
  it('shows its next playable match instead', () => {
    const first = FIXTURES[0];
    const teamId = first.teamA.kind === 'team' ? first.teamA.teamId : '';
    const ts = tournamentState([]);
    const nextBefore = teamRecord(teamId, ts, first.date).next;
    expect(nextBefore?.id).toBe(first.id);

    const saved = [...FIXTURES];
    try {
      (FIXTURES as Fixture[]).splice(0, FIXTURES.length, ...setPostponed(saved, first.id, true));
      const nextAfter = teamRecord(teamId, tournamentState([]), first.date).next;
      expect(nextAfter?.id).not.toBe(first.id);
    } finally {
      (FIXTURES as Fixture[]).splice(0, FIXTURES.length, ...saved);
    }
  });
});
