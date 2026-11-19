import { describe, expect, it } from 'vitest';
import { CURRENT_SEASON, groupByMatch, seasonsOf } from '../gallery';

const item = (id: string, fixture_id: string | null, created_at: string) => ({
  id,
  fixture_id,
  created_at,
});

describe('seasonsOf', () => {
  it('always offers the current season, newest first, without repeats', () => {
    expect(seasonsOf([])).toEqual([CURRENT_SEASON]);
    expect(seasonsOf([{ season: 2025 }, { season: 2026 }, { season: 2025 }])).toEqual([
      CURRENT_SEASON,
      2026,
      2025,
    ]);
  });
});

describe('groupByMatch', () => {
  const no: Record<string, number> = { f1: 1, f2: 2, f9: 9 };
  it('puts the latest match first, loose photos last, photos in the order added', () => {
    const groups = groupByMatch(
      [
        item('c', 'f2', '2026-11-18T10:00:00Z'),
        item('a', null, '2026-11-17T10:00:00Z'),
        item('b', 'f2', '2026-11-18T09:00:00Z'),
        item('d', 'f9', '2026-11-25T09:00:00Z'),
        item('e', 'f1', '2026-11-17T12:00:00Z'),
      ],
      (id) => no[id],
    );
    expect(groups.map((g) => g.fixtureId)).toEqual(['f9', 'f2', 'f1', null]);
    expect(groups[1].items.map((i) => i.id)).toEqual(['b', 'c']);
  });
});
