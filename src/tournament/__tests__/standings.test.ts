import { describe, expect, it } from 'vitest';
import { FIXTURES, type Fixture } from '../../data/fixtures';
import { TOURNAMENT_TEAMS, findTeam } from '../../data/teams';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import {
  fixturesForTeams,
  matchFitsFixture,
  movedToFixture,
  nrrBalls,
  tournamentState,
} from '../standings';

let seq = 0;

/** Scores a 1-over fixture: side A makes `a` runs, side B chases with up to `b`. */
function play(no: number, a: number, b: number, sides?: [string, string]): Match {
  const f = FIXTURES.find((x) => x.no === no)!;
  const ids =
    sides ??
    ([f.teamA, f.teamB].map((s) => (s.kind === 'team' ? s.teamId : '')) as [string, string]);
  const m = makeMatch(11, { overs: 1 });
  m.id = `m${++seq}`;
  m.updatedAt = seq;
  m.fixtureId = f.id;
  ids.forEach((id, i) => {
    m.teams[i].teamId = id;
    m.teams[i].name = findTeam(id)!.name;
  });
  const g = new Game(m);
  g.start('a1', 'a2', 'b1');
  for (let i = 0; i < 6; i++) g.ball(i < a ? 1 : 0);
  g.start('b1', 'b2', 'a1');
  for (let i = 0; i < 6 && g.state.phase !== 'completed'; i++) g.ball(i < b ? 1 : 0);
  return g.match;
}

const groupIds = (g: 'A' | 'B') => TOURNAMENT_TEAMS.filter((t) => t.group === g).map((t) => t.id);

/** Every group match: the team listed earlier in the group wins 6 to 3. */
function playGroup(g: 'A' | 'B'): Match[] {
  const order = groupIds(g);
  return FIXTURES.filter((f) => f.stage === (g === 'A' ? 'groupA' : 'groupB')).map((f) => {
    const [x, y] = [f.teamA, f.teamB].map((s) => (s.kind === 'team' ? s.teamId : ''));
    const xFirst = order.indexOf(x) < order.indexOf(y);
    return play(f.no, xFirst ? 6 : 3, xFirst ? 3 : 6);
  });
}

describe('standings', () => {
  it('lists all six teams of a group before any match', () => {
    const ts = tournamentState([]);
    expect(ts.tables.groupA.map((r) => r.teamId).sort()).toEqual(groupIds('A').sort());
    expect(ts.tables.groupA.every((r) => r.played === 0 && r.points === 0)).toBe(true);
    expect(ts.tables.superSix).toEqual([]);
    expect(ts.outcomes.get('f2')).toEqual({ status: 'scheduled' });
  });

  it('gives 2 points for a win and works out net run rate', () => {
    // Match 2: MCD Super Stars 6/0 (1 ov) beat Quality Flying Fighter 3/0 (1 ov)
    const ts = tournamentState([play(2, 6, 3)]);
    const fv = ts.tables.groupA[0];
    expect(fv).toMatchObject({ teamId: 'mcd-super-stars', played: 1, won: 1, points: 2 });
    expect(fv.nrr).toBeCloseTo(3);
    const rc = ts.tables.groupA.find((r) => r.teamId === 'quality-flying-fighter')!;
    expect(rc).toMatchObject({ lost: 1, points: 0 });
    expect(rc.nrr).toBeCloseTo(-3);
    expect(ts.outcomes.get('f2')!.status).toBe('completed');
  });

  it('a tie is 1 point each', () => {
    const ts = tournamentState([play(2, 3, 3)]);
    const rows = ts.tables.groupA.filter((r) => r.played === 1);
    expect(rows.map((r) => [r.tiedNr, r.points])).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  it('a started but unfinished match is live and not counted', () => {
    const m = makeMatch(11, { overs: 1 });
    m.fixtureId = 'f2';
    const ts = tournamentState([m]);
    expect(ts.outcomes.get('f2')!.status).toBe('live');
    expect(ts.tables.groupA.every((r) => r.played === 0)).toBe(true);
  });

  it('a completed match wins over an unfinished duplicate of the same fixture', () => {
    const done = play(2, 6, 3);
    const later = { ...makeMatch(11, { overs: 1 }), id: 'dup', fixtureId: 'f2', updatedAt: 1e12 };
    expect(tournamentState([later, done]).outcomes.get('f2')!.status).toBe('completed');
  });

  it('fills "Group A – 1st" places only when the whole group is done', () => {
    const a = playGroup('A');
    const partial = tournamentState(a.slice(0, 14));
    expect(partial.resolve({ kind: 'groupPos', group: 'A', pos: 1 })).toBeNull();

    const ts = tournamentState([...a, ...playGroup('B')]);
    expect(ts.complete.groupA && ts.complete.groupB).toBe(true);
    expect(ts.tables.groupA.map((r) => r.teamId)).toEqual(groupIds('A'));
    expect(ts.tables.groupA.map((r) => r.points)).toEqual([10, 8, 6, 4, 2, 0]);
    const a1 = groupIds('A')[0];
    const b3 = groupIds('B')[2];
    // Match 31: Group A – 1st v Group B – 3rd
    const m31 = FIXTURES.find((f) => f.no === 31)!;
    expect([ts.resolve(m31.teamA), ts.resolve(m31.teamB)]).toEqual([a1, b3]);
    // 4th place does not go through
    expect(ts.resolve({ kind: 'groupPos', group: 'A', pos: 4 })).toBeNull();
    // The Super Six table starts empty with the six qualifiers
    expect(ts.tables.superSix).toHaveLength(6);
    expect(ts.tables.superSix.every((r) => r.played === 0)).toBe(true);
  });

  it('Super Six points start again and its top four go to the semi-finals', () => {
    const groups = [...playGroup('A'), ...playGroup('B')];
    const ts0 = tournamentState(groups);
    const ss = FIXTURES.filter((f) => f.stage === 'superSix');
    const order = ts0.tables.superSix.map((r) => r.teamId); // seed order
    const superSix = ss.map((f) => {
      const [x, y] = [ts0.resolve(f.teamA)!, ts0.resolve(f.teamB)!];
      const xFirst = order.indexOf(x) < order.indexOf(y);
      return play(f.no, xFirst ? 6 : 3, xFirst ? 3 : 6, [x, y]);
    });
    const ts = tournamentState([...groups, ...superSix]);
    expect(ts.complete.superSix).toBe(true);
    expect(ts.tables.superSix.map((r) => r.points)).toEqual([10, 8, 6, 4, 2, 0]);
    const semi1 = FIXTURES.find((f) => f.stage === 'semi1')!;
    expect([ts.resolve(semi1.teamA), ts.resolve(semi1.teamB)]).toEqual([order[0], order[3]]);

    // SF-1 won by the team batting second → it fills the final
    const sf = play(semi1.no, 2, 6, [order[0], order[3]]);
    const final = FIXTURES.find((f) => f.stage === 'final')!;
    expect(tournamentState([...groups, ...superSix, sf]).resolve(final.teamA)).toBe(order[3]);
  });

  it('charges an all-out side its full overs for net run rate', () => {
    expect(nrrBalls({ legalBalls: 40, endReason: 'allOut', oversLimit: 12 })).toBe(72);
    expect(nrrBalls({ legalBalls: 40, endReason: 'targetReached', oversLimit: 12 })).toBe(40);
  });
});

describe('fixture ids', () => {
  it('a match keeps its fixture when the match number is edited', () => {
    const m = play(2, 6, 3);
    const edited = FIXTURES.map((f) => (f.id === 'f2' ? { ...f, no: 99 } : f));
    const ts = tournamentState([m], edited);
    expect(ts.outcomes.get('f2')!.status).toBe('completed');
    expect(ts.tables.groupA[0]).toMatchObject({ teamId: 'mcd-super-stars', points: 2 });
  });

  describe('abandoned match', () => {
    const abandon = (no: number): Fixture[] =>
      FIXTURES.map((f) => (f.no === no ? { ...f, abandoned: true } : f));

    it('gives both teams 1 point and counts as played with no result', () => {
      // Match 2: MCD Super Stars v Quality Flying Fighter, rained off before a ball
      const ts = tournamentState([], abandon(2));
      expect(ts.outcomes.get('f2')).toMatchObject({ status: 'completed', abandoned: true });
      for (const id of ['mcd-super-stars', 'quality-flying-fighter']) {
        expect(ts.tables.groupA.find((r) => r.teamId === id)).toMatchObject({
          played: 1,
          won: 0,
          lost: 0,
          tiedNr: 1,
          points: 1,
          nrr: 0,
        });
      }
    });

    it('ignores a partly scored match for points and NRR', () => {
      const ts = tournamentState([play(2, 6, 3)], abandon(2));
      const row = ts.tables.groupA.find((r) => r.teamId === 'mcd-super-stars')!;
      expect(row).toMatchObject({ won: 0, tiedNr: 1, points: 1, runsFor: 0, ballsFaced: 0 });
      expect(ts.outcomes.get('f2')?.result).toBeNull();
    });
  });
});

describe('a match saved under the wrong match number', () => {
  // As on 23 Nov: Finishing Victorians v Power (match 12, Group A) saved under
  // match 13 (Power Player v Engineer Warrior, Group B) with the teams changed by hand
  const fv = 'finishing-victorians';
  const ppw = 'power-printing-washing';
  const wrong = () => play(13, 6, 3, [fv, ppw]);

  it('is not counted for that fixture', () => {
    const f13 = FIXTURES.find((f) => f.no === 13)!;
    expect(matchFitsFixture(wrong(), f13)).toBe(false);
    const ts = tournamentState([wrong()]);
    expect(ts.outcomes.get(f13.id)?.status).toBe('scheduled');
  });

  it('keeps both teams out of the other group’s table', () => {
    const ts = tournamentState([wrong()]);
    const groupB = ts.tables.groupB.map((r) => r.teamId);
    expect(groupB).toHaveLength(6);
    expect(groupB).not.toContain(fv);
    expect(groupB).not.toContain(ppw);
    expect(ts.tables.groupB.every((r) => r.played === 0)).toBe(true);
  });

  it('counts once moved to the right fixture', () => {
    const [f12] = fixturesForTeams(fv, ppw);
    expect(f12.no).toBe(12);
    const moved = movedToFixture(wrong(), f12.id, Date.now());
    const ts = tournamentState([moved]);
    expect(ts.outcomes.get(f12.id)?.status).toBe('completed');
    const rows = ts.tables.groupA.filter((r) => r.teamId === fv || r.teamId === ppw);
    expect(rows.map((r) => r.played)).toEqual([1, 1]);
  });

  it('is a new revision when moved, so the server takes it', () => {
    const before = wrong();
    const moved = movedToFixture(before, 'f12', 1_800_000_000_000);
    expect(moved.rev).toBe((before.rev ?? 0) + 1);
    expect(moved.fixtureId).toBe('f12');
    expect(moved.updatedAt).toBe(1_800_000_000_000);
    // The scoring itself is untouched
    expect(moved.events).toEqual(before.events);
    expect(before.fixtureId).not.toBe('f12');
  });

  it('accepts the fixture’s teams in either order', () => {
    const f12 = FIXTURES.find((f) => f.no === 12)!;
    expect(matchFitsFixture(play(12, 6, 3, [ppw, fv]), f12)).toBe(true);
  });
});
