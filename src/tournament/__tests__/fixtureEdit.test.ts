import { describe, expect, it } from 'vitest';
import { FIXTURES, type Fixture } from '../../data/fixtures';
import { makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import {
  FixtureEditError,
  addFixture,
  deleteFixture,
  editLevel,
  hasScore,
  moveFixture,
  updateFixture,
  validateFixture,
} from '../fixtureEdit';
import { tournamentState, type FixtureOutcome } from '../standings';

const team = (teamId: string) => ({ kind: 'team' as const, teamId });

function matchWithBalls(balls: number): Match {
  const m = makeMatch(11, { overs: 1 });
  for (let i = 0; i < balls; i++) {
    m.events.push({ id: `e${i}`, at: i, type: 'ball', runs: 0, extra: null });
  }
  return m;
}

const scheduled: FixtureOutcome = { status: 'scheduled' };
const startedNoBalls: FixtureOutcome = { status: 'live', match: makeMatch() };
const liveWithScore: FixtureOutcome = { status: 'live', match: matchWithBalls(3) };
const completed: FixtureOutcome = { status: 'completed', match: matchWithBalls(12) };

describe('which warning applies', () => {
  it('a match not started can be edited freely; deleting asks once', () => {
    expect(editLevel(scheduled, 'schedule')).toBe('ok');
    expect(editLevel(scheduled, 'teams')).toBe('ok');
    expect(editLevel(scheduled, 'delete')).toBe('confirm');
    expect(editLevel(undefined, 'teams')).toBe('ok');
  });

  it('a started match warns on schedule changes and needs strong confirmation for teams', () => {
    for (const o of [startedNoBalls, liveWithScore, completed]) {
      expect(editLevel(o, 'schedule')).toBe('warn');
      expect(editLevel(o, 'teams')).toBe('strong');
    }
  });

  it('a match with a score cannot be deleted; one set up without balls needs strong confirmation', () => {
    expect(editLevel(liveWithScore, 'delete')).toBe('blocked');
    expect(editLevel(completed, 'delete')).toBe('blocked');
    expect(editLevel(startedNoBalls, 'delete')).toBe('strong');
  });

  it('knows when a match has a score', () => {
    expect(hasScore(scheduled)).toBe(false);
    expect(hasScore(startedNoBalls)).toBe(false);
    expect(hasScore(liveWithScore)).toBe(true);
    expect(hasScore(completed)).toBe(true);
  });
});

describe('editing the list', () => {
  it('changes date, time and teams without touching the id or other matches', () => {
    const next = updateFixture(FIXTURES, 'f2', {
      date: '2026-11-18',
      time: '15:30',
      teamA: team('hr-vikings'),
    });
    const f2 = next.find((f) => f.id === 'f2')!;
    expect(f2).toMatchObject({ id: 'f2', no: 2, date: '2026-11-18', time: '15:30' });
    expect(f2.teamA).toEqual(team('hr-vikings'));
    expect(f2.teamB).toEqual(FIXTURES[1].teamB);
    expect(next.filter((f) => f.id !== 'f2')).toEqual(FIXTURES.filter((f) => f.id !== 'f2'));
    // The original list is not modified
    expect(FIXTURES[1].date).toBe('2026-11-17');
  });

  it('adds a match with a new id and the next number, at the end or after another match', () => {
    const base: Omit<Fixture, 'id' | 'no'> = {
      date: '2026-12-18',
      time: '12:00',
      stage: 'superSix',
      teamA: team('ddc'),
      teamB: team('hr-vikings'),
    };
    const { list, fixture } = addFixture(FIXTURES, base);
    expect(list).toHaveLength(49);
    expect(fixture.no).toBe(49);
    expect(FIXTURES.some((f) => f.id === fixture.id)).toBe(false);
    expect(list[48]).toBe(fixture);

    const after = addFixture(FIXTURES, base, 'f3');
    expect(after.list[3]).toBe(after.fixture);
    expect(after.list[2].id).toBe('f3');
  });

  it('two added matches get different ids', () => {
    const base = { ...FIXTURES[0] };
    const a = addFixture(FIXTURES, base).fixture;
    const b = addFixture(FIXTURES, base).fixture;
    expect(a.id).not.toBe(b.id);
  });

  it('deletes a match that has no score', () => {
    const next = deleteFixture(FIXTURES, 'f5', scheduled);
    expect(next).toHaveLength(47);
    expect(next.some((f) => f.id === 'f5')).toBe(false);
    expect(deleteFixture(FIXTURES, 'f5', startedNoBalls)).toHaveLength(47);
  });

  it('refuses to delete a match with a score', () => {
    expect(() => deleteFixture(FIXTURES, 'f5', liveWithScore)).toThrow(FixtureEditError);
    expect(() => deleteFixture(FIXTURES, 'f5', completed)).toThrow('scored');
  });

  it('moves a match up or down; match numbers stay the same', () => {
    const down = moveFixture(FIXTURES, 'f1', 1);
    expect(down.slice(0, 2).map((f) => [f.id, f.no])).toEqual([
      ['f2', 2],
      ['f1', 1],
    ]);
    const up = moveFixture(down, 'f1', -1);
    expect(up).toEqual(FIXTURES);
    // At the edges nothing changes
    expect(moveFixture(FIXTURES, 'f1', -1)).toEqual(FIXTURES);
    expect(moveFixture(FIXTURES, 'f48', 1)).toEqual(FIXTURES);
  });

  it('reports an unknown id', () => {
    expect(() => updateFixture(FIXTURES, 'nope', {})).toThrow('notFound');
    expect(() => moveFixture(FIXTURES, 'nope', 1)).toThrow('notFound');
  });
});

describe('checks before saving', () => {
  const f1 = FIXTURES[0]; // Mon 16 Nov, Finishing Victorians v Rainbow Cutting

  it('the official fixture has nothing to flag', () => {
    for (const f of FIXTURES) expect(validateFixture(f, FIXTURES), `match ${f.no}`).toEqual([]);
  });

  it('flags the same team on both sides and a team playing twice on one day', () => {
    expect(validateFixture({ ...f1, teamB: f1.teamA }, FIXTURES)).toContain('sameTeam');
    // Match 2 is on 17 Nov; moving it to 16 Nov with Finishing Victorians clashes with match 1
    const f2 = { ...FIXTURES[1], date: '2026-11-16', teamA: team('finishing-victorians') };
    expect(validateFixture(f2, FIXTURES)).toContain('teamTwiceOnDay');
  });

  it('flags a team from the other group in a group match', () => {
    expect(validateFixture({ ...f1, teamB: team('ddc') }, FIXTURES)).toContain('wrongGroup');
  });

  it('flags rest days, bad dates and times, and a match number used twice', () => {
    expect(validateFixture({ ...f1, date: '2026-11-20' }, FIXTURES)).toContain('restDay'); // Friday
    expect(validateFixture({ ...f1, date: '2026-12-16' }, FIXTURES)).toContain('restDay'); // holiday
    expect(validateFixture({ ...f1, date: '16/11/2026' }, FIXTURES)).toContain('badDate');
    expect(validateFixture({ ...f1, time: '25:00' }, FIXTURES)).toContain('badTime');
    expect(validateFixture({ ...f1, no: 2 }, FIXTURES)).toContain('duplicateNo');
  });

  it('placeholder sides (Group A – 1st) are not checked against groups', () => {
    const ss = FIXTURES.find((f) => f.stage === 'superSix')!;
    expect(validateFixture(ss, FIXTURES)).toEqual([]);
  });
});

describe('edits and the tournament tables', () => {
  it('a scored match stays linked after the list is reordered and edited', () => {
    const m = makeMatch(11, { overs: 1 });
    m.fixtureId = 'f1';
    m.teams[0].teamId = 'finishing-victorians';
    m.teams[1].teamId = 'rainbow-cutting';
    const edited = moveFixture(updateFixture(FIXTURES, 'f1', { time: '14:00' }), 'f1', 1);
    expect(tournamentState([m], edited).outcomes.get('f1')!.status).toBe('live');
  });
});
