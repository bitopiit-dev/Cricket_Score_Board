import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { ScoreBoardDB } from '../../db/database';
import { makeMatch } from '../../engine/__tests__/helpers';
import type { Match } from '../../engine/types';
import { nextRole } from '../auth';
import { mergeRow, type MergeDeps, type Row } from '../matchSync';

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
});
