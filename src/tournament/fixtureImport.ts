import type { Fixture, KnockoutId, Slot, StageId } from '../data/fixtures';
import { TOURNAMENT_TEAMS } from '../data/teams';
import { newId } from '../utils/id';
import { hasScore } from './fixtureEdit';
import type { FixtureOutcome } from './standings';

/**
 * Reads a fixture from spreadsheet rows (the committee's Excel, or any sheet
 * with Match / Date / Time / Team A / Team B / Stage columns).
 *
 * - A match keeps its id when its number is unchanged, so scores stay linked.
 * - Nothing is returned if any row is wrong, so a bad file never goes live.
 * - A match that already has a score may not change teams or disappear.
 */
export interface FixtureImport {
  fixtures: Fixture[];
  errors: string[];
  added: number;
  changed: number;
  removed: number;
}

type Cell = string | number | boolean | Date | null | undefined;
const norm = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const COLUMNS: [keyof Omit<Fixture, 'id' | 'venue'>, RegExp][] = [
  ['no', /^(match|match no|no|sl|#)$|match no/],
  ['date', /date/],
  ['time', /time/],
  ['teamA', /team a|home/],
  ['teamB', /team b|away/],
  ['stage', /stage|round|group/],
];

function findHeader(rows: Cell[][]): { at: number; col: Record<string, number> } | null {
  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const cells = rows[r].map(norm);
    const col: Record<string, number> = {};
    for (const [key, re] of COLUMNS) {
      const i = cells.findIndex((c, j) => re.test(c) && !Object.values(col).includes(j));
      if (i >= 0) col[key] = i;
    }
    if (['no', 'date', 'teamA', 'teamB'].every((k) => k in col)) return { at: r, col };
  }
  return null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Excel day number, Date, '2026-11-16', '16/11/2026' or '16 Nov 2026' -> 'YYYY-MM-DD'. */
export function readDate(v: Cell): string | null {
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === 'number' && v > 20000) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  m = s.match(/^(\d{1,2})[\s-]+([a-z]{3})[a-z]*[\s,-]+(\d{4})$/i);
  if (m && MONTHS.includes(m[2].toLowerCase())) {
    return `${m[3]}-${pad(MONTHS.indexOf(m[2].toLowerCase()) + 1)}-${pad(+m[1])}`;
  }
  return null;
}

/** Excel day fraction, Date, '01:00 PM', '1 PM' or '13:00' -> 'HH:MM'. */
export function readTime(v: Cell): string | null {
  if (v instanceof Date) return `${pad(v.getHours())}:${pad(v.getMinutes())}`;
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const mins = Math.round(v * 1440);
    return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
  }
  const m = String(v ?? '')
    .trim()
    .match(/^(\d{1,2})(?:[:.](\d{2}))?\s*([ap])?\.?m?\.?$/i);
  if (!m) return null;
  let h = +m[1];
  const min = +(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return h < 24 && min < 60 ? `${pad(h)}:${pad(min)}` : null;
}

export function readStage(v: Cell): StageId | null {
  const s = norm(v);
  if (/group a\b/.test(s)) return 'groupA';
  if (/group b\b/.test(s)) return 'groupB';
  if (/super/.test(s)) return 'superSix';
  if (/semi.*1|sf 1/.test(s)) return 'semi1';
  if (/semi.*2|sf 2/.test(s)) return 'semi2';
  if (/final/.test(s)) return 'final';
  return null;
}

/** A team name, or a place such as 'Group A – 1st', 'Super Six – 4th', 'Winner SF-1'. */
export function readSlot(v: Cell): Slot | null {
  const s = norm(v);
  if (!s) return null;
  const team = TOURNAMENT_TEAMS.find((t) => norm(t.name) === s || norm(t.short) === s);
  if (team) return { kind: 'team', teamId: team.id };
  let m = s.match(/^group ([ab]) (\d)/);
  if (m) return { kind: 'groupPos', group: m[1].toUpperCase() as 'A' | 'B', pos: +m[2] };
  m = s.match(/^super six (\d)/);
  if (m) return { kind: 'superSixPos', pos: +m[1] };
  m = s.match(/^winner (?:sf|semi final|semi) ?(\d)/);
  if (m) return { kind: 'winnerOf', of: `semi${m[1]}` as KnockoutId };
  return null;
}

const sameSlot = (a: Slot, b: Slot) => JSON.stringify(a) === JSON.stringify(b);

export function parseFixtureRows(
  rows: Cell[][],
  current: readonly Fixture[],
  outcomes?: ReadonlyMap<string, FixtureOutcome>,
): FixtureImport {
  const empty = { fixtures: [], added: 0, changed: 0, removed: 0 };
  const header = findHeader(rows);
  if (!header) {
    return {
      ...empty,
      errors: [
        'শিরোনামের সারি পাওয়া যায়নি। কলামগুলো থাকতে হবে: Match No, Date, Time, Team A, Team B, Stage।',
      ],
    };
  }
  const { at, col } = header;
  const errors: string[] = [];
  const out: Fixture[] = [];
  const byNo = new Map(current.map((f) => [f.no, f]));

  for (let r = at + 1; r < rows.length; r++) {
    const row = rows[r];
    const no = Number(row[col.no]);
    if (!Number.isInteger(no) || no <= 0) continue; // notes, blank rows
    const line = `সারি ${r + 1} (ম্যাচ ${no})`;
    const date = readDate(row[col.date]);
    const time = col.time !== undefined ? readTime(row[col.time]) : '12:00';
    const teamA = readSlot(row[col.teamA]);
    const teamB = readSlot(row[col.teamB]);
    const old = byNo.get(no);
    const stage = col.stage !== undefined ? readStage(row[col.stage]) : (old?.stage ?? null);
    if (!date) errors.push(`${line}: তারিখ বোঝা যাচ্ছে না ("${row[col.date] ?? ''}")`);
    if (!time) errors.push(`${line}: সময় বোঝা যাচ্ছে না ("${row[col.time] ?? ''}")`);
    if (!teamA) errors.push(`${line}: দলের নাম চেনা যাচ্ছে না ("${row[col.teamA] ?? ''}")`);
    if (!teamB) errors.push(`${line}: দলের নাম চেনা যাচ্ছে না ("${row[col.teamB] ?? ''}")`);
    if (!stage) errors.push(`${line}: পর্ব বোঝা যাচ্ছে না ("${row[col.stage] ?? ''}")`);
    if (out.some((f) => f.no === no)) errors.push(`${line}: এই ম্যাচ নম্বর দুবার আছে`);
    if (!date || !time || !teamA || !teamB || !stage) continue;

    const scored = old && hasScore(outcomes?.get(old.id));
    if (scored && (!sameSlot(old.teamA, teamA) || !sameSlot(old.teamB, teamB))) {
      errors.push(`${line}: এই ম্যাচের স্কোর হয়ে গেছে, তাই দল বদলানো যাবে না`);
    }
    out.push({
      id: old?.id ?? `fx-${newId()}`,
      no,
      date,
      time,
      stage,
      teamA,
      teamB,
      ...(old?.venue ? { venue: old.venue } : {}),
    });
  }

  if (out.length === 0 && errors.length === 0) errors.push('ফাইলে কোনো ম্যাচ পাওয়া যায়নি।');
  const kept = new Set(out.map((f) => f.id));
  for (const f of current) {
    if (!kept.has(f.id) && hasScore(outcomes?.get(f.id))) {
      errors.push(
        `ম্যাচ ${f.no}-এর স্কোর হয়ে গেছে, কিন্তু নতুন ফাইলে নেই। স্কোর করা ম্যাচ বাদ দেওয়া যাবে না।`,
      );
    }
  }
  if (errors.length) return { ...empty, errors };

  const before = new Map(current.map((f) => [f.id, JSON.stringify(f)]));
  return {
    fixtures: out,
    errors: [],
    added: out.filter((f) => !before.has(f.id)).length,
    changed: out.filter((f) => before.has(f.id) && before.get(f.id) !== JSON.stringify(f)).length,
    removed: current.filter((f) => !kept.has(f.id)).length,
  };
}
