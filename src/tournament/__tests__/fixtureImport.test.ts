import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import officialFixture from '../../../docs/fixture-bpl-2027.json';
import { parseFixtureRows, readDate, readSlot, readStage, readTime } from '../fixtureImport';
import type { FixtureOutcome } from '../standings';

/** The committee's sheet: title lines, a header, 48 rows, then notes. */
function committeeSheet(edit?: (r: (string | number)[]) => void) {
  const serial = (iso: string) =>
    (Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - Date.UTC(1899, 11, 30)) /
    86400000;
  const ampm = (t: string) => {
    const h = +t.slice(0, 2);
    return `${String(h % 12 || 12).padStart(2, '0')}:${t.slice(3)} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const rows: (string | number)[][] = [
    ['BPL 2027 – Baridhi Premier League', 'Match Fixture'],
    ['12 overs per side'],
    [],
    [
      'Match No',
      'Date',
      'Day',
      'Time',
      'Team A',
      'vs',
      'Team B',
      'Stage',
      'Winner (select after match)',
    ],
    ...officialFixture.map((m) => [
      m.match,
      serial(m.date),
      'Monday',
      ampm(m.time),
      m.teamA,
      'vs',
      m.teamB,
      m.stage,
      '',
    ]),
    [],
    ['Notes:'],
    ['• Group A: Finishing Victorians, …'],
  ];
  rows.slice(4, 52).forEach((r) => edit?.(r));
  return rows;
}

describe('fixture import', () => {
  it('reads the committee sheet into exactly the fixture the app has', () => {
    const r = parseFixtureRows(committeeSheet(), FIXTURES);
    expect(r.errors).toEqual([]);
    expect(r.fixtures).toEqual(FIXTURES);
    expect(r).toMatchObject({ added: 0, changed: 0, removed: 0 });
  });

  it('keeps match ids, so scores stay linked, and counts what changed', () => {
    const r = parseFixtureRows(
      committeeSheet((row) => {
        if (row[0] === 2) row[3] = '02:30 PM';
      }),
      FIXTURES,
    );
    expect(r.changed).toBe(1);
    expect(r.fixtures[1]).toMatchObject({ id: FIXTURES[1].id, time: '14:30' });
  });

  it('refuses a file with an unknown team and says which row', () => {
    const r = parseFixtureRows(
      committeeSheet((row) => {
        if (row[0] === 3) row[4] = 'Some Other Team';
      }),
      FIXTURES,
    );
    expect(r.fixtures).toEqual([]);
    expect(r.errors[0]).toMatch(/ম্যাচ 3.*Some Other Team/);
  });

  it('will not change the teams of a match that already has a score', () => {
    const scored = new Map<string, FixtureOutcome>([['f1', { status: 'completed', innings: [] }]]);
    const r = parseFixtureRows(
      committeeSheet((row) => {
        if (row[0] === 1) row[6] = 'Rainbow Cutting';
      }),
      FIXTURES,
      scored,
    );
    expect(r.errors.some((e) => /স্কোর/.test(e))).toBe(true);
  });

  it('needs the header row', () => {
    expect(parseFixtureRows([['hello'], [1, 2]], FIXTURES).errors).toHaveLength(1);
  });

  it('understands the usual ways of writing dates, times, stages and places', () => {
    expect(readDate('16/11/2026')).toBe('2026-11-16');
    expect(readDate('16 Nov 2026')).toBe('2026-11-16');
    expect(readDate(46342)).toBe('2026-11-16');
    expect(readTime('1:00 PM')).toBe('13:00');
    expect(readTime('12:00 PM')).toBe('12:00');
    expect(readTime('13:00')).toBe('13:00');
    expect(readTime(0.5)).toBe('12:00');
    expect(readStage('Semi-Final 2')).toBe('semi2');
    expect(readStage('Final')).toBe('final');
    expect(readSlot('Group B – 3rd')).toEqual({ kind: 'groupPos', group: 'B', pos: 3 });
    expect(readSlot('Winner SF-2')).toEqual({ kind: 'winnerOf', of: 'semi2' });
    expect(readSlot('power (printing & washing)')).toEqual({
      kind: 'team',
      teamId: 'power-printing-washing',
    });
  });
});
