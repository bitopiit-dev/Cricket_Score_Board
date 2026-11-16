import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import {
  RESULT_HOLD_MS,
  countdown,
  fixtureStart,
  nextFixture,
  nextMatchDay,
  pickHero,
  projectedTotal,
  tournamentProgress,
  upcomingFixtures,
} from '../home';
import { tournamentState } from '../standings';

const at = (iso: string) => Date.parse(iso);
const M1_START = at('2026-11-17T12:00:00+06:00');

/** A 1-over match for fixture f1 (Red Bulls Warriors v Rainbow Cutting). `finish` plays it to the end. */
function fixtureMatch(finish: boolean, updatedAt: number, fixtureId = 'f1'): Match {
  const m = makeMatch(11, { overs: 1 });
  m.id = `${fixtureId}-${updatedAt}`;
  m.fixtureId = fixtureId;
  m.teams[0].teamId = 'red-bulls-warriors';
  m.teams[1].teamId = 'rainbow-cutting';
  const g = new Game(m);
  g.start('a1', 'a2', 'b1').balls(4, 1);
  if (finish) {
    g.balls(0, 0, 0, 0);
    g.start('b1', 'b2', 'a1').balls(0, 0, 0, 0, 0, 0);
  }
  return { ...g.match, updatedAt };
}

describe('fixture start time', () => {
  it('reads the fixture date and time as Bangladesh time', () => {
    expect(new Date(fixtureStart(FIXTURES[0])).toISOString()).toBe('2026-11-17T06:00:00.000Z');
  });
});

describe('hero', () => {
  it('before the tournament: the first match, counting down', () => {
    const now = at('2026-11-15T10:00:00+06:00');
    const hero = pickHero([], tournamentState([]), now);
    expect(hero).toMatchObject({ kind: 'upcoming', fixture: { id: 'f1' } });
    expect(countdown(M1_START, now)).toEqual({
      days: 2,
      hours: 2,
      minutes: 0,
      seconds: 0,
      due: false,
    });
  });

  it('during a match: the live score', () => {
    const live = fixtureMatch(false, M1_START + 600_000);
    const now = M1_START + 900_000;
    const hero = pickHero([live], tournamentState([live]), now);
    expect(hero.kind).toBe('live');
    if (hero.kind === 'live') {
      expect(hero.fixture?.id).toBe('f1');
      expect(hero.state.current?.runs).toBe(5);
    }
  });

  it('a fixture match is preferred over a friendly being scored at the same time', () => {
    const friendly = makeMatch(11, { overs: 1 });
    friendly.id = 'friendly';
    const g = new Game(friendly).start('a1', 'a2', 'b1').ball(1);
    const live = fixtureMatch(false, M1_START + 1_000);
    const hero = pickHero(
      [{ ...g.match, updatedAt: M1_START + 2_000_000 }, live],
      tournamentState([live]),
      M1_START + 3_000_000,
    );
    expect(hero.kind === 'live' && hero.match.fixtureId).toBe('f1');
  });

  it('a match set up but with no ball yet is not live', () => {
    const m = makeMatch(11, { overs: 1 });
    m.fixtureId = 'f1';
    const hero = pickHero([m], tournamentState([m]), at('2026-11-17T11:00:00+06:00'));
    expect(hero.kind).toBe('upcoming');
  });

  it('after a match: the result, with the next match to count down to', () => {
    const done = fixtureMatch(true, M1_START + 3_600_000);
    const now = M1_START + 4_000_000;
    const hero = pickHero([done], tournamentState([done]), now);
    expect(hero.kind).toBe('result');
    if (hero.kind === 'result') {
      expect(hero.state.result).toMatchObject({ kind: 'won', winner: 0 });
      expect(hero.next?.id).toBe('f2');
    }
  });

  it('the result gives way to the next countdown after a while', () => {
    const done = fixtureMatch(true, M1_START + 3_600_000);
    const later = M1_START + 3_600_000 + RESULT_HOLD_MS + 1;
    // By then match 2 (13:00 the same day) is past its grace too: the next day's first match
    expect(pickHero([done], tournamentState([done]), later)).toMatchObject({
      kind: 'upcoming',
      fixture: { id: 'f3' },
    });
  });

  it('a late start keeps the match as "next" for a few hours, then moves on', () => {
    const ts = tournamentState([]);
    expect(nextFixture(ts, M1_START + 60 * 60_000)?.id).toBe('f1');
    expect(countdown(M1_START, M1_START + 60_000).due).toBe(true);
    // f1 (12:00) is past its grace by 15:30; f2 (13:00) is not yet
    expect(nextFixture(ts, at('2026-11-17T15:30:00+06:00'))?.id).toBe('f2');
  });

  it("next match day: both of the day's matches, then only the one still to start", () => {
    const ts = tournamentState([]);
    const ids = (now: number) => nextMatchDay(ts, now).map((f) => f.id);
    // The evening before: the opening day's two matches
    expect(ids(at('2026-11-16T21:00:00+06:00'))).toEqual(['f1', 'f2']);
    // f1 is past its late-start grace by 15:30, f2 is not
    expect(ids(at('2026-11-17T15:30:00+06:00'))).toEqual(['f2']);
    // Once a match has been scored it is no longer "to start"
    const started = fixtureMatch(false, M1_START + 60_000);
    expect(nextMatchDay(tournamentState([started]), M1_START + 120_000).map((f) => f.id)).toEqual([
      'f2',
    ]);
  });

  it('upcoming list can skip several fixtures already on screen', () => {
    const ts = tournamentState([]);
    const now = at('2026-11-16T21:00:00+06:00');
    expect(upcomingFixtures(ts, now, 2, ['f1', 'f2']).map((f) => f.id)).toEqual(['f3', 'f4']);
  });

  it('after the final: nothing left', () => {
    expect(pickHero([], tournamentState([]), at('2027-01-01T00:00:00+06:00'))).toEqual({
      kind: 'over',
    });
  });
});

describe('below the hero', () => {
  it('lists the next three matches after the one in the hero', () => {
    const now = at('2026-11-15T10:00:00+06:00');
    expect(upcomingFixtures(tournamentState([]), now, 3, 'f1').map((f) => f.id)).toEqual([
      'f2',
      'f3',
      'f4',
    ]);
  });

  it('leaves out matches already played', () => {
    const done = fixtureMatch(true, M1_START + 3_600_000);
    const now = at('2026-11-15T10:00:00+06:00');
    expect(upcomingFixtures(tournamentState([done]), now, 2).map((f) => f.id)).toEqual([
      'f2',
      'f3',
    ]);
  });

  it('counts tournament progress by phase', () => {
    const empty = tournamentProgress(tournamentState([]));
    expect(empty).toEqual({
      done: 0,
      total: 48,
      phases: [
        { phase: 'groups', done: 0, total: 30 },
        { phase: 'superSix', done: 0, total: 15 },
        { phase: 'semis', done: 0, total: 2 },
        { phase: 'final', done: 0, total: 1 },
      ],
    });
    const done = fixtureMatch(true, M1_START);
    expect(tournamentProgress(tournamentState([done])).phases[0].done).toBe(1);
  });
});

describe('numbers in the live hero', () => {
  it('projects the total at the current run rate', () => {
    expect(projectedTotal({ runs: 30, legalBalls: 24, oversLimit: 12 })).toBe(90);
    expect(projectedTotal({ runs: 0, legalBalls: 0, oversLimit: 12 })).toBeNull();
  });

  it('splits a countdown into days, hours, minutes and seconds', () => {
    expect(countdown(1000 * (2 * 86400 + 3 * 3600 + 4 * 60 + 5), 0)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      due: false,
    });
  });
});
