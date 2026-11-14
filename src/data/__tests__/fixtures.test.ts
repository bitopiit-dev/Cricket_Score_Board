import { describe, expect, it } from 'vitest';
import { FIXTURES, HOLIDAYS, todayInDhaka, type Fixture, type Slot } from '../fixtures';
import { TOURNAMENT_TEAMS, findTeam } from '../teams';
import officialFixture from '../../../docs/fixture-bpl-2027.json';

interface RawFixture {
  match: number;
  date: string;
  time: string;
  teamA: string;
  teamB: string;
  stage: string;
}
const raw = officialFixture as RawFixture[];

const STAGE_NAME: Record<Fixture['stage'], string> = {
  groupA: 'Group A',
  groupB: 'Group B',
  superSix: 'Super Six',
  semi1: 'Semi-Final 1',
  semi2: 'Semi-Final 2',
  final: 'Final',
};
const ord = (n: number) => ['1st', '2nd', '3rd', '4th'][n - 1];
function slotText(s: Slot): string {
  switch (s.kind) {
    case 'team':
      return findTeam(s.teamId)!.name;
    case 'groupPos':
      return `Group ${s.group} – ${ord(s.pos)}`;
    case 'superSixPos':
      return `Super Six – ${ord(s.pos)}`;
    case 'winnerOf':
      return `Winner SF-${s.of.slice(-1)}`;
  }
}
const key = (a: string, b: string) => [a, b].sort().join(' | ');
const teamIds = (f: Fixture) =>
  [f.teamA, f.teamB].flatMap((s) => (s.kind === 'team' ? [s.teamId] : []));

describe('fixture data', () => {
  it('matches the official fixture file exactly', () => {
    expect(FIXTURES).toHaveLength(48);
    expect(
      FIXTURES.map((f) => ({
        match: f.no,
        date: f.date,
        time: f.time,
        teamA: slotText(f.teamA),
        teamB: slotText(f.teamB),
        stage: STAGE_NAME[f.stage],
      })),
    ).toEqual(raw);
  });

  it('is numbered 1–48 in date and time order', () => {
    expect(FIXTURES.map((f) => f.no)).toEqual(Array.from({ length: 48 }, (_, i) => i + 1));
    const stamps = FIXTURES.map((f) => `${f.date} ${f.time}`);
    expect([...stamps].sort()).toEqual(stamps);
  });

  it('each group plays a full round robin within the group', () => {
    for (const [stage, group] of [
      ['groupA', 'A'],
      ['groupB', 'B'],
    ] as const) {
      const ms = FIXTURES.filter((f) => f.stage === stage);
      expect(ms).toHaveLength(15);
      for (const m of ms) {
        for (const id of teamIds(m)) expect(findTeam(id)!.group, `match ${m.no}`).toBe(group);
      }
      expect(new Set(ms.map((m) => key(...(teamIds(m) as [string, string])))).size).toBe(15);
      const teams = TOURNAMENT_TEAMS.filter((t) => t.group === group).map((t) => t.id);
      for (const id of teams) expect(ms.filter((m) => teamIds(m).includes(id))).toHaveLength(5);
    }
  });

  it('the Super Six is a round robin of the top three from each group', () => {
    const ms = FIXTURES.filter((f) => f.stage === 'superSix');
    expect(ms).toHaveLength(15);
    const pairs = ms.map((m) => key(slotText(m.teamA), slotText(m.teamB)));
    expect(new Set(pairs).size).toBe(15);
    for (const m of ms) {
      for (const s of [m.teamA, m.teamB]) {
        expect(s.kind).toBe('groupPos');
        if (s.kind === 'groupPos') expect(s.pos).toBeLessThanOrEqual(3);
      }
    }
  });

  it('semi-finals are 1st v 4th and 2nd v 3rd; the final is between their winners', () => {
    const by = (stage: Fixture['stage']) => FIXTURES.find((f) => f.stage === stage)!;
    expect([by('semi1').teamA, by('semi1').teamB]).toEqual([
      { kind: 'superSixPos', pos: 1 },
      { kind: 'superSixPos', pos: 4 },
    ]);
    expect([by('semi2').teamA, by('semi2').teamB]).toEqual([
      { kind: 'superSixPos', pos: 2 },
      { kind: 'superSixPos', pos: 3 },
    ]);
    expect([by('final').teamA, by('final').teamB]).toEqual([
      { kind: 'winnerOf', of: 'semi1' },
      { kind: 'winnerOf', of: 'semi2' },
    ]);
  });

  it('no team plays twice on one day', () => {
    const byDay = new Map<string, string[]>();
    for (const f of FIXTURES) byDay.set(f.date, [...(byDay.get(f.date) ?? []), ...teamIds(f)]);
    for (const [day, ids] of byDay) expect(new Set(ids).size, day).toBe(ids.length);
  });

  it('no matches on Fridays or holidays', () => {
    for (const f of FIXTURES) {
      const weekday = new Date(`${f.date}T12:00:00Z`).getUTCDay();
      expect(weekday, `match ${f.no} on ${f.date}`).not.toBe(5);
      expect(HOLIDAYS).not.toContain(f.date);
    }
  });

  it('starts on Monday 16 November', () => {
    expect(FIXTURES[0].date).toBe('2026-11-16');
    expect(new Date('2026-11-16T12:00:00Z').getUTCDay()).toBe(1);
  });
});

describe('todayInDhaka', () => {
  it('uses Bangladesh time (UTC+6)', () => {
    expect(todayInDhaka(new Date('2026-11-15T18:30:00Z'))).toBe('2026-11-16');
    expect(todayInDhaka(new Date('2026-11-16T17:59:00Z'))).toBe('2026-11-16');
  });
});
