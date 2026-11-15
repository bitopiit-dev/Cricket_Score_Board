import { db } from '../db/database';
import type { MatchRepository } from '../db/repository';
import type { Match } from '../engine/types';
import { authState, canScore } from './auth';
import { supabase, withTimeout } from './supabase';

/**
 * Scores on Supabase (table matches), so every phone sees the same live match.
 *
 * - Scoring is still saved on the phone first, so a weak signal at the ground
 *   never stops it; uploads queue up and go when the network is back.
 * - Only signed-in scorers and the super admin upload. Anyone else can still
 *   score on their own phone, but it stays there.
 * - Other phones download the scores and are told when anything changes.
 */
export const MATCHES_CHANGED = 'bpl:matches';
const QUEUE = 'bpl:upload-queue';
const notify = () => window.dispatchEvent(new Event(MATCHES_CHANGED));

export interface Row {
  id: string;
  data: Match;
  deleted: boolean;
  updated_at: number;
}

const readQueue = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as string[];
  } catch {
    return [];
  }
};
const writeQueue = (ids: string[]) => {
  try {
    localStorage.setItem(QUEUE, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
};

export interface MergeDeps {
  db: Pick<typeof db, 'matches'>;
  /** Matches on this phone still waiting to upload. */
  queued: () => string[];
  isScorer: () => boolean;
}
const defaultDeps: MergeDeps = { db, queued: () => readQueue(), isScorer: () => canScore() };

/**
 * Copies a downloaded row onto this phone if it should win. True when something changed.
 *
 * A match still waiting to upload from this phone is never replaced: those are
 * balls the server has not seen yet (scored with no signal, or just before the
 * app was closed). Only the super admin's delete still removes it.
 */
export async function mergeRow(row: Row, deps: MergeDeps = defaultDeps): Promise<boolean> {
  const local = await deps.db.matches.get(row.id);
  if (row.deleted) {
    if (!local) return false;
    await deps.db.matches.delete(row.id);
    return true;
  }
  if (local && (local.updatedAt ?? 0) === row.updated_at) return false;
  if (local && deps.queued().includes(row.id)) return false;
  // On a scorer's phone, its own newer copy wins
  if (deps.isScorer() && local && (local.updatedAt ?? 0) > row.updated_at) return false;
  // Everyone else always shows the uploaded score, even over a stray tap on their phone
  await deps.db.matches.put(row.data);
  return true;
}

let flushing = false;
/** Uploads queued matches. Safe to call often. */
export async function flushUploads(): Promise<void> {
  if (!supabase || flushing || !canScore()) return;
  const ids = readQueue();
  if (ids.length === 0) return;
  flushing = true;
  try {
    const email = authState().email;
    const done: string[] = [];
    for (const id of ids) {
      const m = await db.matches.get(id);
      const row = m
        ? { id, data: m, deleted: false, updated_at: m.updatedAt ?? Date.now(), updated_by: email }
        : { id, data: {}, deleted: true, updated_at: Date.now(), updated_by: email };
      const { error } = await withTimeout(supabase.from('matches').upsert(row), 8000).catch(
        (e: Error) => ({ error: e }),
      );
      if (!error) done.push(id);
    }
    writeQueue(readQueue().filter((id) => !done.includes(id)));
  } finally {
    flushing = false;
  }
}

function queue(id: string) {
  // Anyone signed in queues, even before Supabase has confirmed the role (or with
  // no signal); the upload itself waits for the role, and the server checks it too.
  if (!canScore() && !authState().email) return;
  writeQueue([...readQueue(), id]);
  void flushUploads();
}

/** Matches waiting to upload from this phone. */
export const pendingUploads = () => readQueue().length;

/** Super admin / scorer: upload every match on this phone (e.g. ones scored before signing in). */
export async function uploadAllFromThisPhone(): Promise<number> {
  const all = await db.matches.toArray();
  writeQueue([...readQueue(), ...all.map((m) => m.id)]);
  await flushUploads();
  return all.length;
}

/** Downloads every match and keeps listening for changes. Never throws. */
export function startMatchSync(): void {
  if (!supabase) return;
  const client = supabase;
  const pull = async () => {
    try {
      const { data } = await withTimeout(
        client.from('matches').select('id, data, deleted, updated_at'),
        10000,
      );
      let changed = false;
      for (const row of (data ?? []) as Row[]) changed = (await mergeRow(row)) || changed;
      if (changed) notify();
    } catch {
      /* offline: try again later */
    }
  };
  void pull();
  client
    .channel('matches')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, (p) => {
      const row = p.new as Row | undefined;
      if (row?.id) void mergeRow(row).then((changed) => changed && notify());
    })
    .subscribe((status) => {
      // After a dropped connection, catch up on anything missed
      if (status === 'SUBSCRIBED') void pull();
    });
  window.addEventListener('online', () => {
    void flushUploads();
    void pull();
  });
  setInterval(() => void flushUploads(), 15000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void pull();
  });
}

/** The phone's own store, plus uploading for signed-in scorers. */
export function withUpload(local: MatchRepository): MatchRepository {
  return {
    list: () => local.list(),
    get: (id) => local.get(id),
    async save(match) {
      await local.save(match);
      queue(match.id);
    },
    async remove(id) {
      await local.remove(id);
      queue(id);
    },
  };
}
