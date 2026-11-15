import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { TOURNAMENT_TEAMS, findTeam } from '../../data/teams';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import { tournamentState } from '../standings';
import { teamFixtures, teamRecord } from '../teamView';

let seq = 0;

/** Scores a 1-over fixture: side A makes `a` runs, side B chases with up to `b`. */
function play(no: number, a: number, b: number): Match {
  const f = FIXTURES.find((x) => x.no === no)!;
  const ids = [f.teamA, f.teamB].map((s) => (s.kind === 'team' ? s.teamId : ''));
  const m = makeMatch(11, { overs: 1 });
  m.id = `tv${++seq}`;
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

/** Every group match: the team listed earlier in its group wins. */
function playGroups(): Match[] {
  return (['A', 'B'] as const).flatMap((g) => {
    const order = TOURNAMENT_TEAMS.filter((t) => t.group === g).map((t) => t.id);
    return FIXTURES.filter((f) => f.stage === (g === 'A' ? 'groupA' : 'groupB')).map((f) => {
      const [x, y] = [f.teamA, f.teamB].map((s) => (s.kind === 'team' ? s.teamId : ''));
      const xFirst = order.indexOf(x) < order.indexOf(y);
      return play(f.no, xFirst ? 6 : 3, xFirst ? 3 : 6);
    });
  });
}

const BEFORE_START = '2026-11-15';
const FV = 'finishing-victorians';
const RC = 'rainbow-cutting';

describe('team view on the Fixtures page', () => {
  it('before the start: five group matches, no record, next is the first one', () => {
    const ts = tournamentState([]);
    const mine = teamFixtures(FV, ts);
    expect(mine.map((f) => f.no)).toEqual([1, 7, 13, 19, 25]);
    expect(mine.every((f) => f.stage === 'groupA')).toBe(true);
    expect(teamRecord(FV, ts, BEFORE_START)).toMatchObject({
      played: 0,
      won: 0,
      lost: 0,
      tiedNr: 0,
      onlyGroupSoFar: true,
    });
    expect(teamRecord(FV, ts, BEFORE_START).next?.no).toBe(1);
  });

  it('every team has five group matches and only against its own group', () => {
    const ts = tournamentState([]);
    for (const team of TOURNAMENT_TEAMS) {
      const mine = teamFixtures(team.id, ts);
      expect(mine, team.name).toHaveLength(5);
      const opponents = mine.map((f) =>
        [f.teamA, f.teamB]
          .map((s) => (s.kind === 'team' ? s.teamId : ''))
          .find((id) => id !== team.id),
      );
      expect(new Set(opponents).size, team.name).toBe(5);
      for (const o of opponents) expect(findTeam(o)?.group, `${team.name} v ${o}`).toBe(team.group);
    }
  });

  it('counts a win for the winner and a loss for the other side', () => {
    const ts = tournamentState([play(1, 6, 3)]);
    expect(teamRecord(FV, ts, '2026-11-16')).toMatchObject({ played: 1, won: 1, lost: 0 });
    expect(teamRecord(RC, ts, '2026-11-16')).toMatchObject({ played: 1, won: 0, lost: 1 });
  });

  it('a win batting second counts for the chasing side', () => {
    const ts = tournamentState([play(1, 3, 6)]);
    expect(teamRecord(RC, ts, '2026-11-16')).toMatchObject({ won: 1, lost: 0 });
    expect(teamRecord(FV, ts, '2026-11-16')).toMatchObject({ won: 0, lost: 1 });
  });

  it('a tie counts as tied / no result for both sides', () => {
    const ts = tournamentState([play(1, 3, 3)]);
    for (const id of [FV, RC]) {
      expect(teamRecord(id, ts, '2026-11-16')).toMatchObject({ played: 1, tiedNr: 1, won: 0 });
    }
  });

  it('adds up over several matches and moves the next match on', () => {
    // Match 1: FV beat RC. Match 7: QFF beat FV.
    const ts = tournamentState([play(1, 6, 3), play(7, 6, 3)]);
    const r = teamRecord(FV, ts, '2026-11-20');
    expect(r).toMatchObject({ played: 2, won: 1, lost: 1, tiedNr: 0 });
    expect(r.next?.no).toBe(13);
  });

  it('a live match is not counted and stays the next match', () => {
    const live = makeMatch(11, { overs: 1 });
    live.fixtureId = 'f1';
    const ts = tournamentState([live]);
    const r = teamRecord(FV, ts, '2026-11-16');
    expect(r.played).toBe(0);
    expect(r.next?.no).toBe(1);
  });

  it('an unplayed match from an earlier day is not shown as next', () => {
    const r = teamRecord(FV, tournamentState([]), '2026-11-20');
    expect(r.next?.no).toBe(13);
  });

  it('Super Six matches join once the groups are decided', () => {
    const ts = tournamentState(playGroups());
    const top = ts.tables.groupA[0].teamId;
    const mine = teamFixtures(top, ts);
    expect(mine.filter((f) => f.stage === 'superSix')).toHaveLength(5);
    const r = teamRecord(top, ts, '2026-12-07');
    expect(r).toMatchObject({ played: 5, won: 5, lost: 0, onlyGroupSoFar: false });
    expect(r.next?.stage).toBe('superSix');

    // The bottom team of a group does not reach the Super Six.
    const last = ts.tables.groupA[5].teamId;
    expect(teamFixtures(last, ts).every((f) => f.stage === 'groupA')).toBe(true);
    expect(teamRecord(last, ts, '2026-12-07')).toMatchObject({
      played: 5,
      lost: 5,
      onlyGroupSoFar: true,
      next: undefined,
    });
  });
});
