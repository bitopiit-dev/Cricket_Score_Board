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
  /**
   * Stable id ('f1'…). Scored matches link to the fixture by this id, so it
   * never changes, even when the match number, date or order is edited.
   */
  id: string;
  /** Match number shown to people (1–48). Stays the same when the list order changes. */
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
    id: 'f1',
    no: 1,
    date: '2026-11-18',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('quality-flying-fighter'),
  },
  {
    id: 'f2',
    no: 2,
    date: '2026-11-19',
    time: '12:00',
    stage: 'groupB',
    teamA: team('engineer-warriors'),
    teamB: team('sky-warrior'),
  },
  {
    id: 'f3',
    no: 3,
    date: '2026-11-19',
    time: '13:00',
    stage: 'groupA',
    teamA: team('quality-flying-fighter'),
    teamB: team('power-house-x1'),
  },
  {
    id: 'f4',
    no: 4,
    date: '2026-11-21',
    time: '12:00',
    stage: 'groupB',
    teamA: team('red-bulls-warriors'),
    teamB: team('hr-vikings'),
  },
  {
    id: 'f5',
    no: 5,
    date: '2026-11-21',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('power-printing-washing'),
  },
  {
    id: 'f6',
    no: 6,
    date: '2026-11-22',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('ddc'),
  },
  {
    id: 'f7',
    no: 7,
    date: '2026-11-22',
    time: '13:00',
    stage: 'groupA',
    teamA: team('quality-flying-fighter'),
    teamB: team('finishing-victorians'),
  },
  {
    id: 'f8',
    no: 8,
    date: '2026-11-23',
    time: '12:00',
    stage: 'groupB',
    teamA: team('red-bulls-warriors'),
    teamB: team('engineer-warriors'),
  },
  {
    id: 'f9',
    no: 9,
    date: '2026-11-23',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('power-printing-washing'),
  },
  {
    id: 'f10',
    no: 10,
    date: '2026-11-24',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('ddc'),
  },
  {
    id: 'f11',
    no: 11,
    date: '2026-11-24',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('power-house-x1'),
  },
  {
    id: 'f12',
    no: 12,
    date: '2026-11-25',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('hr-vikings'),
  },
  {
    id: 'f13',
    no: 13,
    date: '2026-11-25',
    time: '13:00',
    stage: 'groupA',
    teamA: team('finishing-victorians'),
    teamB: team('power-printing-washing'),
  },
  {
    id: 'f14',
    no: 14,
    date: '2026-11-26',
    time: '12:00',
    stage: 'groupB',
    teamA: team('engineer-warriors'),
    teamB: team('ddc'),
  },
  {
    id: 'f15',
    no: 15,
    date: '2026-11-26',
    time: '13:00',
    stage: 'groupA',
    teamA: team('finishing-victorians'),
    teamB: team('rainbow-cutting'),
  },
  {
    id: 'f16',
    no: 16,
    date: '2026-11-28',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('red-bulls-warriors'),
  },
  {
    id: 'f17',
    no: 17,
    date: '2026-11-28',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('power-house-x1'),
  },
  {
    id: 'f18',
    no: 18,
    date: '2026-11-29',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('hr-vikings'),
  },
  {
    id: 'f19',
    no: 19,
    date: '2026-11-29',
    time: '13:00',
    stage: 'groupA',
    teamA: team('mcd-super-stars'),
    teamB: team('finishing-victorians'),
  },
  {
    id: 'f20',
    no: 20,
    date: '2026-12-02',
    time: '12:00',
    stage: 'groupB',
    teamA: team('power-player'),
    teamB: team('engineer-warriors'),
  },
  {
    id: 'f21',
    no: 21,
    date: '2026-12-02',
    time: '13:00',
    stage: 'groupA',
    teamA: team('power-printing-washing'),
    teamB: team('power-house-x1'),
  },
  {
    id: 'f22',
    no: 22,
    date: '2026-12-03',
    time: '12:00',
    stage: 'groupB',
    teamA: team('ddc'),
    teamB: team('hr-vikings'),
  },
  {
    id: 'f23',
    no: 23,
    date: '2026-12-03',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('quality-flying-fighter'),
  },
  {
    id: 'f24',
    no: 24,
    date: '2026-12-05',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('red-bulls-warriors'),
  },
  {
    id: 'f25',
    no: 25,
    date: '2026-12-05',
    time: '13:00',
    stage: 'groupA',
    teamA: team('finishing-victorians'),
    teamB: team('power-house-x1'),
  },
  {
    id: 'f26',
    no: 26,
    date: '2026-12-06',
    time: '12:00',
    stage: 'groupB',
    teamA: team('engineer-warriors'),
    teamB: team('hr-vikings'),
  },
  {
    id: 'f27',
    no: 27,
    date: '2026-12-06',
    time: '13:00',
    stage: 'groupA',
    teamA: team('rainbow-cutting'),
    teamB: team('mcd-super-stars'),
  },
  {
    id: 'f28',
    no: 28,
    date: '2026-12-07',
    time: '12:00',
    stage: 'groupB',
    teamA: team('sky-warrior'),
    teamB: team('power-player'),
  },
  {
    id: 'f29',
    no: 29,
    date: '2026-12-07',
    time: '13:00',
    stage: 'groupA',
    teamA: team('power-printing-washing'),
    teamB: team('quality-flying-fighter'),
  },
  {
    id: 'f30',
    no: 30,
    date: '2026-12-08',
    time: '12:00',
    stage: 'groupB',
    teamA: team('ddc'),
    teamB: team('red-bulls-warriors'),
  },
  {
    id: 'f31',
    no: 31,
    date: '2026-12-09',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 1),
    teamB: groupPos('B', 3),
  },
  {
    id: 'f32',
    no: 32,
    date: '2026-12-09',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 2),
    teamB: groupPos('A', 2),
  },
  {
    id: 'f33',
    no: 33,
    date: '2026-12-10',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('B', 1),
  },
  {
    id: 'f34',
    no: 34,
    date: '2026-12-10',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 2),
    teamB: groupPos('A', 1),
  },
  {
    id: 'f35',
    no: 35,
    date: '2026-12-12',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('B', 1),
  },
  {
    id: 'f36',
    no: 36,
    date: '2026-12-12',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('A', 2),
  },
  {
    id: 'f37',
    no: 37,
    date: '2026-12-13',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 1),
    teamB: groupPos('B', 1),
  },
  {
    id: 'f38',
    no: 38,
    date: '2026-12-13',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('B', 2),
  },
  {
    id: 'f39',
    no: 39,
    date: '2026-12-14',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('A', 2),
  },
  {
    id: 'f40',
    no: 40,
    date: '2026-12-14',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('A', 3),
    teamB: groupPos('A', 1),
  },
  {
    id: 'f41',
    no: 41,
    date: '2026-12-15',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 1),
    teamB: groupPos('A', 2),
  },
  {
    id: 'f42',
    no: 42,
    date: '2026-12-15',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('B', 2),
  },
  {
    id: 'f43',
    no: 43,
    date: '2026-12-17',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('A', 1),
    teamB: groupPos('A', 2),
  },
  {
    id: 'f44',
    no: 44,
    date: '2026-12-17',
    time: '13:00',
    stage: 'superSix',
    teamA: groupPos('B', 3),
    teamB: groupPos('A', 3),
  },
  {
    id: 'f45',
    no: 45,
    date: '2026-12-19',
    time: '12:00',
    stage: 'superSix',
    teamA: groupPos('B', 1),
    teamB: groupPos('B', 2),
  },
  {
    id: 'f46',
    no: 46,
    date: '2026-12-20',
    time: '12:00',
    stage: 'semi1',
    teamA: superSixPos(1),
    teamB: superSixPos(4),
  },
  {
    id: 'f47',
    no: 47,
    date: '2026-12-20',
    time: '13:00',
    stage: 'semi2',
    teamA: superSixPos(2),
    teamB: superSixPos(3),
  },
  {
    id: 'f48',
    no: 48,
    date: '2026-12-21',
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

export function fixtureById(
  id: string | undefined,
  fixtures: readonly Fixture[] = FIXTURES,
): Fixture | undefined {
  return id === undefined ? undefined : fixtures.find((f) => f.id === id);
}

/**
 * Saved matches from before fixture ids linked by match number; the original
 * fixture N has id 'fN'. Returns true if the match was changed.
 */
export function migrateFixtureLink(match: { fixtureId?: string; fixtureNo?: number }): boolean {
  if (match.fixtureNo === undefined) return false;
  if (match.fixtureId === undefined) match.fixtureId = `f${match.fixtureNo}`;
  delete match.fixtureNo;
  return true;
}

export function fixturesOn(date: string, fixtures: readonly Fixture[] = FIXTURES): Fixture[] {
  return fixtures.filter((f) => f.date === date);
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
