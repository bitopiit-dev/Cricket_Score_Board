import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import {
  placeIn,
  pointsRows,
  projectedSuperSix,
  stageProgress,
  todaysLeagueFixtures,
} from '../pointsView';
import { tournamentState } from '../standings';

let seq = 0;

/** Scores a 1-over fixture: side A makes `a` runs, side B chases with up to `b`. */
function play(no: number, a: number, b: number, finish = true): Match {
  const f = FIXTURES.find((x) => x.no === no)!;
  const ids = [f.teamA, f.teamB].map((s) => (s.kind === 'team' ? s.teamId : ''));
  const m = makeMatch(11, { overs: 1 });
  m.id = `pv${++seq}`;
  m.updatedAt = seq;
  m.fixtureId = f.id;
  ids.forEach((id, i) => {
    m.teams[i].teamId = id;
    m.teams[i].name = findTeam(id)!.name;
  });
  const g = new Game(m);
  g.start('a1', 'a2', 'b1');
  for (let i = 0; i < 6; i++) g.ball(i < a ? 1 : 0);
  if (!finish) return g.match;
  g.start('b1', 'b2', 'a1');
  for (let i = 0; i < 6 && g.state.phase !== 'completed'; i++) g.ball(i < b ? 1 : 0);
  return g.match;
}

const sideA = (no: number) => {
  const s = FIXTURES.find((x) => x.no === no)!.teamA;
  return s.kind === 'team' ? s.teamId : '';
};
const sideB = (no: number) => {
  const s = FIXTURES.find((x) => x.no === no)!.teamB;
  return s.kind === 'team' ? s.teamId : '';
};

// The first two group A fixtures, and the first group B one
const [a1, a2] = FIXTURES.filter((f) => f.stage === 'groupA').map((f) => f.no);
const [b1] = FIXTURES.filter((f) => f.stage === 'groupB').map((f) => f.no);

describe('pointsRows', () => {
  it('gives form oldest first, max points and next match', () => {
    // a1: side A wins; a2: side B wins
    const ts = tournamentState([play(a1, 6, 3), play(a2, 3, 6)]);
    const rows = pointsRows('groupA', ts, '2026-11-01');
    const winner = rows.find((r) => r.row.teamId === sideA(a1))!;
    const loser = rows.find((r) => r.row.teamId === sideB(a1))!;
    expect(winner.form).toEqual(['W']);
    expect(loser.form).toEqual(['L']);
    // Five group matches each: one done, four to play
    expect(winner.slots).toBe(5);
    expect(winner.maxPoints).toBe(2 + 2 * 4);
    expect(loser.maxPoints).toBe(0 + 2 * 4);
    expect(winner.next?.stage).toBe('groupA');
    expect(winner.next?.no).toBeGreaterThan(a1);
  });

  it('shows the live match instead of the next one', () => {
    const ts = tournamentState([play(a1, 6, 3, false)]);
    const row = pointsRows('groupA', ts, '2026-11-01').find((r) => r.row.teamId === sideA(a1))!;
    expect(row.live?.no).toBe(a1);
    expect(row.next).toBeUndefined();
    expect(row.form).toEqual([]);
  });
});

describe('stageProgress', () => {
  it('counts completed matches of the stage only', () => {
    const ts = tournamentState([play(a1, 6, 3), play(b1, 6, 3), play(a2, 6, 3, false)]);
    expect(stageProgress('groupA', ts)).toEqual({ played: 1, total: 15 });
    expect(stageProgress('groupB', ts)).toEqual({ played: 1, total: 15 });
  });
});

describe('todaysLeagueFixtures', () => {
  it('lists the day’s league matches in start order', () => {
    const day = FIXTURES.find((f) => f.stage === 'groupA')!.date;
    const today = todaysLeagueFixtures(day);
    expect(today.length).toBeGreaterThan(0);
    expect(today.every((f) => f.date === day)).toBe(true);
    expect(today.map((f) => f.time)).toEqual([...today.map((f) => f.time)].sort());
  });

  it('is empty on a day without matches', () => {
    expect(todaysLeagueFixtures('2026-01-01')).toEqual([]);
  });
});

describe('placeIn and projectedSuperSix', () => {
  it('ranks nobody and projects nothing before the first match', () => {
    const ts = tournamentState([]);
    expect(placeIn('groupA', sideA(a1), ts)).toBeUndefined();
    expect(projectedSuperSix(ts)).toBeNull();
  });

  it('waits until both groups have started', () => {
    expect(projectedSuperSix(tournamentState([play(a1, 6, 3)]))).toBeNull();
  });

  it('takes the top three of each group', () => {
    const ts = tournamentState([play(a1, 6, 3), play(b1, 3, 6)]);
    const six = projectedSuperSix(ts)!;
    expect(six).toHaveLength(6);
    expect(six.map((p) => `${p.group}${p.position}`)).toEqual(['A1', 'A2', 'A3', 'B1', 'B2', 'B3']);
    expect(six[0].teamId).toBe(sideA(a1));
    expect(six[3].teamId).toBe(sideB(b1));
    expect(placeIn('groupA', sideA(a1), ts)).toBe(1);
  });
});
