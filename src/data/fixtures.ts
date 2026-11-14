/**
 * BPL-2027 fixture: 48 matches. Generated from docs/fixture-bpl-2027.json
 * (the verified official fixture); a test keeps the two in sync.
 * Seed data for the future Supabase `fixtures` table.
 *
 * Format:
 * - Group A and Group B (6 teams each, 15 matches each); top 3 of each group
 *   go to the Super Six.
 * - Super Six: points start again, 15 matches; top 4 go to the semi-finals.
 * - SF-1: Super Six 1st v 4th, SF-2: 2nd v 3rd; the winners meet in the final.
 */

export type StageId = 'groupA' | 'groupB' | 'superSix' | 'semi1' | 'semi2' | 'final';
export type KnockoutId = 'semi1' | 'semi2' | 'final';

/** A fixture side: a known team, or a place to be filled when an earlier stage ends. */
export type Slot =
  | { kind: 'team'; teamId: string }
  | { kind: 'groupPos'; group: 'A' | 'B'; pos: number }
  | { kind: 'superSixPos'; pos: number }
  | { kind: 'winnerOf'; of: KnockoutId };

export interface Fixture {
  /** Match number 1–48. */
  no: number;
  /** Local date, YYYY-MM-DD (Asia/Dhaka). */
  date: string;
  /** Local start time, HH:MM (24 h). */
  time: string;
  stage: StageId;
  teamA: Slot;
  teamB: Slot;
  /** Ground; not in the official fixture yet. */
  venue?: string;
}

const team = (teamId: string): Slot => ({ kind: 'team', teamId });
const groupPos = (group: 'A' | 'B', pos: number): Slot => ({ kind: 'groupPos', group, pos });
const superSixPos = (pos: number): Slot => ({ kind: 'superSixPos', pos });
const winnerOf = (of: KnockoutId): Slot => ({ kind: 'winnerOf', of });

/** Overs per innings in every fixture (rule 1). */
export const FIXTURE_OVERS = 12;

/** No matches on Fridays or on these dates. */
export const HOLIDAYS: readonly string[] = ['2026-11-30', '2026-12-01', '2026-12-16'];

export const FIXTURES: readonly Fixture[] = [
  {
    no: 1,
    date: '2026-11-16',
    time: '13:00',
    stage: 'groupA',
    teamA: team('finishing-victorians'),
    teamB: team('rainbow-cutting'),
  },
  {
    no: 2,
    date: '2026-11-17',
    time: '12:00',
    stage: 'groupB',
    teamA: team('engineer-warriors'),
    teamB: team('sky-warrior'),
  },
  {
    no: 3,
    date: '2026-11-17',
    time: '13:00',
    stage: 'groupA',
    teamA: team('quality-flying-fighter'),
    teamB: team('power-house-x1'),
  },
  {
    no: 4,
    date: '2026-11-18',
    time: '12:00',
    stage: 'groupB',
    teamA: team('red-bulls-warriors'),
    teamB: team('hr-vikings'),
  },
  {
    no: 5,
    date: '2026-11-18',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('power-printing-washing'),
  },
  {
    no: 6,
    date: '2026-11-19',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('ddc'),
  },
  {
    no: 7,
    date: '2026-11-19',
    time: '13:00',
    stage: 'groupA',
    teamA: team('quality-flying-fighter'),
    teamB: team('finishing-victorians'),
  },
  {
    no: 8,
    date: '2026-11-21',
    time: '12:00',
    stage: 'groupB',
    teamA: team('red-bulls-warriors'),
    teamB: team('engineer-warriors'),
  },
  {
    no: 9,
    date: '2026-11-21',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('power-printing-washing'),
  },
  {
    no: 10,
    date: '2026-11-22',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('ddc'),
  },
  {
    no: 11,
    date: '2026-11-22',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('power-house-x1'),
  },
  {
    no: 12,
    date: '2026-11-23',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('hr-vikings'),
  },
  {
    no: 13,
    date: '2026-11-23',
    time: '13:00',
    stage: 'groupA',
    teamA: team('finishing-victorians'),
    teamB: team('power-printing-washing'),
  },
  {
    no: 14,
    date: '2026-11-24',
    time: '12:00',
    stage: 'groupB',
    teamA: team('engineer-warriors'),
    teamB: team('ddc'),
  },
  {
    no: 15,
    date: '2026-11-24',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('quality-flying-fighter'),
  },
  {
    no: 16,
    date: '2026-11-25',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('red-bulls-warriors'),
  },
  {
    no: 17,
    date: '2026-11-25',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('power-house-x1'),
  },
  {
    no: 18,
    date: '2026-11-26',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('hr-vikings'),
  },
  {
    no: 19,
    date: '2026-11-26',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('finishing-victorians'),
  },
  {
    no: 20,
    date: '2026-11-28',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('engineer-warriors'),
  },
  {
    no: 21,
    date: '2026-11-28',
    time: '13:00',
    stage: 'groupA',
    teamA: team('power-printing-washing'),
    teamB: team('power-house-x1'),
  },
  {
    no: 22,
    date: '2026-11-29',
    time: '12:00',
    stage: 'groupB',
    teamA: team('ddc'),
    teamB: team('hr-vikings'),
  },
  {
    no: 23,
    date: '2026-11-29',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('quality-flying-fighter'),
  },
  {
    no: 24,
    date: '2026-12-02',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('red-bulls-warriors'),
  },
  {
    no: 25,
    date: '2026-12-02',
    time: '13:00',
    stage: 'groupA',
    teamA: team('finishing-victorians'),
    teamB: team('power-house-x1'),
  },
  {
    no: 26,
    date: '2026-12-03',
    time: '12:00',
    stage: 'groupB',
    teamA: team('engineer-warriors'),
    teamB: team('hr-vikings'),
  },
  {
    no: 27,
    date: '2026-12-03',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('mcd-super-stars'),
  },
  {
    no: 28,
    date: '2026-12-05',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('power-player'),
  },
  {
    no: 29,
    date: '2026-12-05',
    time: '13:00',
    stage: 'groupA',
    teamA: team('power-printing-washing'),
    teamB: team('quality-flying-fighter'),
  },
  {
    no: 30,
    date: '2026-12-06',
    time: '12:00',
    stage: 'groupB',
    teamA: team('ddc'),
    teamB: team('red-bulls-warriors'),
  },
  {
    no: 31,
    date: '2026-12-07',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 1),
    teamB: groupPos('B', 3),
  },
  {
    no: 32,
    date: '2026-12-07',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 2),
    teamB: groupPos('A', 2),
  },
  {
    no: 33,
    date: '2026-12-08',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('B', 1),
  },
  {
    no: 34,
    date: '2026-12-08',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 2),
    teamB: groupPos('A', 1),
  },
  {
    no: 35,
    date: '2026-12-09',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('B', 1),
  },
  {
    no: 36,
    date: '2026-12-09',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('A', 2),
  },
  {
    no: 37,
    date: '2026-12-10',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 1),
    teamB: groupPos('B', 1),
  },
  {
    no: 38,
    date: '2026-12-10',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('B', 2),
  },
  {
    no: 39,
    date: '2026-12-12',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('A', 2),
  },
  {
    no: 40,
    date: '2026-12-12',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('A', 1),
  },
  {
    no: 41,
    date: '2026-12-13',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 1),
    teamB: groupPos('A', 2),
  },
  {
    no: 42,
    date: '2026-12-13',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('B', 2),
  },
  {
    no: 43,
    date: '2026-12-14',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 1),
    teamB: groupPos('A', 2),
  },
  {
    no: 44,
    date: '2026-12-14',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('A', 3),
  },
  {
    no: 45,
    date: '2026-12-15',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 1),
    teamB: groupPos('B', 2),
  },
  {
    no: 46,
    date: '2026-12-17',
    time: '12:00',
    stage: 'semi1',
    teamA: superSixPos(1),
    teamB: superSixPos(4),
  },
  {
    no: 47,
    date: '2026-12-17',
    time: '13:00',
    stage: 'semi2',
    teamA: superSixPos(2),
    teamB: superSixPos(3),
  },
  {
    no: 48,
    date: '2026-12-19',
    time: '12:00',
    stage: 'final',
    teamA: winnerOf('semi1'),
    teamB: winnerOf('semi2'),
  },
];

export const STAGE_ORDER: readonly StageId[] = [
  'groupA',
  'groupB',
  'superSix',
  'semi1',
  'semi2',
  'final',
];

export function fixtureByNo(no: number | undefined): Fixture | undefined {
  return no === undefined ? undefined : FIXTURES.find((f) => f.no === no);
}

export function fixturesOn(date: string): Fixture[] {
  return FIXTURES.filter((f) => f.date === date);
}

/** Every calendar date from the first to the last fixture. */
export function tournamentDays(): string[] {
  const days: string[] = [];
  const last = FIXTURES[FIXTURES.length - 1].date;
  for (let d = new Date(`${FIXTURES[0].date}T12:00:00Z`); ; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    days.push(iso);
    if (iso >= last) break;
  }
  return days;
}

/** A planned day off: a Friday or one of the HOLIDAYS. */
export function isRestDay(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 5 || HOLIDAYS.includes(date);
}

/** Today's date in Bangladesh as YYYY-MM-DD, whatever the device's time zone. */
export function todayInDhaka(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
