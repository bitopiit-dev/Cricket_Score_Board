import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { TOURNAMENT_TEAMS, findTeam } from '../../data/teams';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import { tournamentState } from '../standings';
import { teamFixtures, teamLiveFixture, teamRecord, teamResults, teamStanding } from '../teamView';

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
const MCD = 'mcd-super-stars';
const QFF = 'quality-flying-fighter';

describe('team view on the Fixtures page', () => {
  it('before the start: five group matches, no record, next is the first one', () => {
    const ts = tournamentState([]);
    const mine = teamFixtures(MCD, ts);
    expect(mine.map((f) => f.no)).toEqual([2, 8, 16, 24, 28]);
    expect(mine.every((f) => f.stage === 'groupA')).toBe(true);
    expect(teamRecord(MCD, ts, BEFORE_START)).toMatchObject({
      played: 0,
      won: 0,
      lost: 0,
      tiedNr: 0,
      onlyGroupSoFar: true,
    });
    expect(teamRecord(MCD, ts, BEFORE_START).next?.no).toBe(2);
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
    const ts = tournamentState([play(2, 6, 3)]);
    expect(teamRecord(MCD, ts, '2026-11-17')).toMatchObject({ played: 1, won: 1, lost: 0 });
    expect(teamRecord(QFF, ts, '2026-11-17')).toMatchObject({ played: 1, won: 0, lost: 1 });
  });

  it('a win batting second counts for the chasing side', () => {
    const ts = tournamentState([play(2, 3, 6)]);
    expect(teamRecord(QFF, ts, '2026-11-17')).toMatchObject({ won: 1, lost: 0 });
    expect(teamRecord(MCD, ts, '2026-11-17')).toMatchObject({ won: 0, lost: 1 });
  });

  it('a tie counts as tied / no result for both sides', () => {
    const ts = tournamentState([play(2, 3, 3)]);
    for (const id of [MCD, QFF]) {
      expect(teamRecord(id, ts, '2026-11-17')).toMatchObject({ played: 1, tiedNr: 1, won: 0 });
    }
  });

  it('adds up over several matches and moves the next match on', () => {
    // Match 2: MCD beat QFF. Match 8: Power (Printing & Washing) bat first and beat MCD.
    const ts = tournamentState([play(2, 6, 3), play(8, 6, 3)]);
    const r = teamRecord(MCD, ts, '2026-11-22');
    expect(r).toMatchObject({ played: 2, won: 1, lost: 1, tiedNr: 0 });
    expect(r.next?.no).toBe(16);
  });

  it('a live match is not counted and stays the next match', () => {
    const live = makeMatch(11, { overs: 1 });
    live.fixtureId = 'f2';
    const ts = tournamentState([live]);
    const r = teamRecord(MCD, ts, '2026-11-17');
    expect(r.played).toBe(0);
    expect(r.next?.no).toBe(2);
  });

  it('an unplayed match from an earlier day is not shown as next', () => {
    const r = teamRecord(MCD, tournamentState([]), '2026-11-22');
    expect(r.next?.no).toBe(16);
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

describe('team page: results, form and standing', () => {
  it('lists results newest first with W / L / T for this team', () => {
    const ts = tournamentState([play(2, 6, 3), play(8, 6, 3)]);
    const r = teamResults(MCD, ts);
    expect(r.map((x) => [x.fixture.no, x.outcome])).toEqual([
      [8, 'L'],
      [2, 'W'],
    ]);
    expect(r[1].opponentId).toBe(QFF);
    expect(teamResults(QFF, ts).map((x) => x.outcome)).toEqual(['L']);
  });

  it('a tie is T for both sides', () => {
    const ts = tournamentState([play(2, 3, 3)]);
    expect(teamResults(MCD, ts)[0].outcome).toBe('T');
    expect(teamResults(QFF, ts)[0].outcome).toBe('T');
  });

  it('finds the live fixture and the group position', () => {
    const live = makeMatch(11, { overs: 1 });
    live.fixtureId = 'f2';
    const g = new Game(live).start('a1', 'a2', 'b1').ball(1);
    const ts = tournamentState([g.match, play(8, 6, 3)]);
    expect(teamLiveFixture(MCD, ts)?.no).toBe(2);
    const s = teamStanding(MCD, ts);
    expect(s?.stage).toBe('groupA');
    expect(s?.row.lost).toBe(1);
    expect(s?.position).toBeGreaterThan(1);
  });
});
