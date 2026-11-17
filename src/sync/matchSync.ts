import { db } from '../db/database';
import type { MatchRepository } from '../db/repository';
import { isUsableMatch } from '../engine/validate';
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
export { isUsableMatch };

export const MATCHES_CHANGED = 'bpl:matches';
/** Fired with the match id when the server refused this phone's copy (see flushUploads). */
export const MATCH_CONFLICT = 'bpl:match-conflict';
const BACKUP = 'bpl:conflict-backup:';
const QUEUE = 'bpl:upload-queue';
const notify = () => window.dispatchEvent(new Event(MATCHES_CHANGED));

/** Fired when this device's link to the shared scores changes (header status). */
export const SYNC_CHANGED = 'bpl:sync';
/** null until the first download has been tried. */
let connected: boolean | null = null;
function setConnected(v: boolean) {
  if (connected === v) return;
  connected = v;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SYNC_CHANGED));
}

export type AppSync = 'local' | 'connecting' | 'synced' | 'pending' | 'offline';
/**
 * Whether what this device shows is what everyone sees:
 * local = no server set up, connecting = first download not back yet,
 * synced = downloaded and listening, pending = this device has changes
 * still to upload, offline = no connection (showing the last saved copy).
 */
export function syncStatusFrom(s: {
  server: boolean;
  online: boolean;
  queued: number;
  connected: boolean | null;
}): AppSync {
  if (!s.server) return 'local';
  if (!s.online) return 'offline';
  if (s.queued > 0) return 'pending';
  if (s.connected === null) return 'connecting';
  return s.connected ? 'synced' : 'offline';
}
export const appSyncStatus = (): AppSync =>
  syncStatusFrom({
    server: !!supabase,
    online: typeof navigator === 'undefined' || navigator.onLine,
    queued: readQueue().length,
    connected,
  });

export interface Row {
  id: string;
  data: Match;
  deleted: boolean;
  updated_at: number;
  /** Revision (see Match.rev); 0 on rows from before it existed. */
  rev?: number;
}

/** Which copy is newer: the revision first, then (for old copies without one) the time. */
export function compareCopies(
  a: { rev?: number; updatedAt?: number },
  b: { rev?: number; updatedAt?: number },
): number {
  return (a.rev ?? 0) - (b.rev ?? 0) || (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
}

const readQueue = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE) ?? '[]') as string[];
  } catch {
    return [];
  }
};
/** Fired whenever the upload queue changes (scorer's sync indicator). */
export const QUEUE_CHANGED = 'bpl:queue';
const writeQueue = (ids: string[]) => {
  try {
    localStorage.setItem(QUEUE, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_CHANGED));
};

/** True while this phone still has changes to this match that the server hasn't got. */
export const isQueued = (id: string) => readQueue().includes(id);

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
  if (!isUsableMatch(row.data, row.id)) return false;
  const remote = { rev: row.rev ?? row.data.rev, updatedAt: row.updated_at };
  if (local && compareCopies(local, remote) === 0) return false;
  if (local && deps.queued().includes(row.id)) return false;
  // On a scorer's phone, its own newer copy wins
  if (deps.isScorer() && local && compareCopies(local, remote) > 0) return false;
  // Everyone else always shows the uploaded score, even over a stray tap on their phone
  await deps.db.matches.put(row.data);
  return true;
}

/** False once the server says the matches table has no rev column yet (SQL patch 2 not run). */
let revColumn = true;
type UploadError = { message?: string; code?: string } | null;
const isStale = (e: UploadError) => !!e?.message?.includes('stale_match');
const noRevColumn = (e: UploadError) =>
  e?.code === 'PGRST204' || (!!e?.message?.includes("'rev'") && !!e?.message?.includes('column'));

/**
 * The server already has a newer change to this match from another phone.
 * Its copy is kept and shown here too; this phone's copy is saved aside so
 * nothing is lost, and the scorer is told.
 */
async function resolveConflict(id: string, local: Match): Promise<void> {
  if (!supabase) return;
  try {
    localStorage.setItem(BACKUP + id, JSON.stringify(local));
  } catch {
    /* no room: the server copy still wins */
  }
  try {
    const { data } = await withTimeout(
      supabase
        .from('matches')
        .select('id, data, deleted, updated_at, rev')
        .eq('id', id)
        .maybeSingle(),
      8000,
    );
    const row = data as Row | null;
    if (row?.deleted) await db.matches.delete(id);
    else if (row && isUsableMatch(row.data, id)) await db.matches.put(row.data);
  } catch {
    /* offline: the next download brings it */
  }
  notify();
  window.dispatchEvent(new CustomEvent(MATCH_CONFLICT, { detail: id }));
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
      const row: Record<string, unknown> = m
        ? { id, data: m, deleted: false, updated_at: m.updatedAt ?? Date.now(), updated_by: email }
        : { id, data: {}, deleted: true, updated_at: Date.now(), updated_by: email };
      if (revColumn) row.rev = m?.rev ?? 0;
      const send = () =>
        withTimeout(supabase!.from('matches').upsert(row), 8000).catch((e: Error) => ({
          error: e as UploadError,
        }));
      let { error } = (await send()) as { error: UploadError };
      if (error && revColumn && noRevColumn(error)) {
        // The database hasn't had SQL patch 2 yet: upload the old way meanwhile
        revColumn = false;
        delete row.rev;
        ({ error } = (await send()) as { error: UploadError });
      }
      if (!error) done.push(id);
      else if (m && isStale(error)) {
        done.push(id);
        await resolveConflict(id, m);
      }
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
      const { data, error } = await withTimeout(client.from('matches').select('*'), 10000);
      if (error) throw error;
      setConnected(true);
      let changed = false;
      for (const row of (data ?? []) as Row[]) changed = (await mergeRow(row)) || changed;
      if (changed) notify();
    } catch {
      setConnected(false); /* offline: try again later */
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
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setConnected(false);
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
