import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoreBoardDB } from '../../db/database';
import { makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import { nextRole } from '../auth';
import { compareCopies, isUsableMatch, mergeRow, type MergeDeps, type Row } from '../matchSync';

describe('scorer role with a weak signal', () => {
  const cached = { email: 'scorer@example.com', role: 'scorer' as const };

  it('keeps the remembered role when Supabase cannot be reached', () => {
    expect(nextRole('scorer@example.com', cached, null)).toBe('scorer');
    expect(nextRole('Scorer@Example.com ', cached, null)).toBe('scorer');
  });

  it('a real answer from Supabase always wins, so a removed scorer loses the role', () => {
    expect(nextRole('scorer@example.com', cached, { data: null, error: null })).toBeNull();
    expect(nextRole('scorer@example.com', cached, { data: 'super', error: null })).toBe('super');
  });

  it("does not hand one person's remembered role to another email", () => {
    expect(nextRole('someone@example.com', cached, null)).toBeNull();
    expect(nextRole('someone@example.com', null, null)).toBeNull();
  });

  it('an error answer counts as no answer', () => {
    const failed = { data: null, error: new Error('timeout') };
    expect(nextRole('scorer@example.com', cached, failed)).toBe('scorer');
    expect(nextRole('scorer@example.com', null, failed)).toBeNull();
  });
});

describe('downloading scores onto a phone', () => {
  let n = 0;
  let db: ScoreBoardDB;
  afterEach(() => db.delete());

  const setup = (opts: { queued?: string[]; scorer?: boolean } = {}): MergeDeps => {
    db = new ScoreBoardDB(`sync-${++n}`);
    return { db, queued: () => opts.queued ?? [], isScorer: () => opts.scorer ?? false };
  };
  const match = (updatedAt: number, balls: number): Match => {
    const m = makeMatch();
    m.id = 'm1';
    m.updatedAt = updatedAt;
    m.events = Array.from({ length: balls }, (_, i) => ({
      id: `e${i}`,
      at: i,
      type: 'ball' as const,
      runs: 1,
      extra: null,
      boundary: false,
    }));
    return m;
  };
  const row = (m: Match, deleted = false): Row => ({
    id: m.id,
    data: m,
    deleted,
    updated_at: m.updatedAt,
  });

  it('never replaces balls still waiting to upload, even before the role is known', async () => {
    // Scored 12 balls offline; the server still has the copy from 6 balls.
    const deps = setup({ queued: ['m1'], scorer: false });
    await db.matches.put(match(200, 12));
    expect(await mergeRow(row(match(100, 6)), deps)).toBe(false);
    expect((await db.matches.get('m1'))!.events).toHaveLength(12);
  });

  it("a scorer's own newer copy wins over an older one from the server", async () => {
    const deps = setup({ scorer: true });
    await db.matches.put(match(200, 12));
    expect(await mergeRow(row(match(100, 6)), deps)).toBe(false);
    expect((await db.matches.get('m1'))!.events).toHaveLength(12);
  });

  it("a viewer's phone always shows the uploaded score", async () => {
    const deps = setup();
    await db.matches.put(match(200, 1));
    expect(await mergeRow(row(match(100, 6)), deps)).toBe(true);
    expect((await db.matches.get('m1'))!.events).toHaveLength(6);
  });

  it('a newer score from the server replaces an older copy on a scorer phone', async () => {
    const deps = setup({ scorer: true });
    await db.matches.put(match(100, 6));
    expect(await mergeRow(row(match(200, 12)), deps)).toBe(true);
    expect((await db.matches.get('m1'))!.events).toHaveLength(12);
  });

  it('the same version is left alone', async () => {
    const deps = setup();
    await db.matches.put(match(100, 6));
    expect(await mergeRow(row(match(100, 6)), deps)).toBe(false);
  });

  it("the super admin's delete removes the match everywhere, even from a queue", async () => {
    const deps = setup({ queued: ['m1'], scorer: true });
    await db.matches.put(match(200, 12));
    expect(await mergeRow(row(match(300, 0), true), deps)).toBe(true);
    expect(await db.matches.get('m1')).toBeUndefined();
  });

  it('skips a broken row instead of storing it (it would crash every viewer)', async () => {
    const deps = setup();
    await db.matches.put(match(100, 6));
    const broken = {
      id: 'm1',
      data: { id: 'm1', teams: [] } as unknown as Match,
      deleted: false,
      updated_at: 500,
    };
    expect(await mergeRow(broken, deps)).toBe(false);
    expect((await db.matches.get('m1'))!.events).toHaveLength(6);
  });

  it('a higher revision wins even when its phone clock is behind', async () => {
    const deps = setup({ scorer: true });
    await db.matches.put({ ...match(900, 6), rev: 6 });
    const server = { ...match(100, 8), rev: 8 };
    expect(await mergeRow({ ...row(server), rev: 8 }, deps)).toBe(true);
    expect((await db.matches.get('m1'))!.events).toHaveLength(8);
  });

  it("a scorer's higher revision is kept over the server's lower one", async () => {
    const deps = setup({ scorer: true });
    await db.matches.put({ ...match(100, 9), rev: 9 });
    expect(await mergeRow({ ...row({ ...match(900, 7), rev: 7 }), rev: 7 }, deps)).toBe(false);
    expect((await db.matches.get('m1'))!.events).toHaveLength(9);
  });
});

describe('match copies', () => {
  it('compares revisions first, then time for copies from before revisions', () => {
    expect(compareCopies({ rev: 3, updatedAt: 1 }, { rev: 2, updatedAt: 9 })).toBeGreaterThan(0);
    expect(compareCopies({ updatedAt: 5 }, { rev: 0, updatedAt: 9 })).toBeLessThan(0);
    expect(compareCopies({ rev: 2, updatedAt: 5 }, { rev: 2, updatedAt: 5 })).toBe(0);
  });

  it('recognises a real match and rejects junk', () => {
    const m = makeMatch();
    expect(isUsableMatch(m, m.id)).toBe(true);
    expect(isUsableMatch(m, 'other-id')).toBe(false);
    expect(isUsableMatch({}, m.id)).toBe(false);
    expect(isUsableMatch(null, m.id)).toBe(false);
    expect(isUsableMatch({ ...m, events: 'x' }, m.id)).toBe(false);
  });
});
