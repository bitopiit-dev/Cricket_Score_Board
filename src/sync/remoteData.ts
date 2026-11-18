import { FIXTURES, type Fixture } from '../data/fixtures';
import { onlyTimesChanged } from '../tournament/fixtureEdit';
import { TOURNAMENT_TEAMS, type TournamentTeam } from '../data/teams';
import { supabase, withTimeout } from './supabase';

/**
 * Fixtures and teams the super admin edits live in Supabase (table app_data).
 * The copies in the code are the starting point and the fallback: with no
 * network, the last downloaded version (kept on the phone) or the built-in one
 * is used, so the app always opens.
 *
 * The rest of the app reads FIXTURES / TOURNAMENT_TEAMS directly, so a new
 * version is copied into those arrays in place.
 */
export type DocKey = 'fixtures' | 'teams';
interface Doc<T> {
  value: T;
  updatedAt: string;
}

export const BUILT_IN: { fixtures: Fixture[]; teams: TournamentTeam[] } = {
  fixtures: structuredClone([...FIXTURES]),
  teams: structuredClone([...TOURNAMENT_TEAMS]),
};

const CACHE = 'bpl:data:';
const applied: Partial<Record<DocKey, string>> = {};

function replaceAll<T>(target: readonly T[], next: readonly T[]) {
  (target as T[]).splice(0, target.length, ...next);
}

export function isValidDoc(key: DocKey, value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (key === 'fixtures') {
    return value.every(
      (f) =>
        f && typeof f.id === 'string' && /^\d{4}-\d\d-\d\d$/.test(f.date) && f.teamA && f.teamB,
    );
  }
  return value.every(
    (t) => t && typeof t.id === 'string' && typeof t.name === 'string' && Array.isArray(t.players),
  );
}

function apply(key: DocKey, doc: Doc<unknown>) {
  if (!isValidDoc(key, doc.value)) return false;
  if (key === 'fixtures') replaceAll(FIXTURES, doc.value as Fixture[]);
  else replaceAll(TOURNAMENT_TEAMS, doc.value as TournamentTeam[]);
  applied[key] = doc.updatedAt;
  return true;
}

function readCache(key: DocKey): Doc<unknown> | null {
  try {
    const raw = localStorage.getItem(CACHE + key);
    return raw ? (JSON.parse(raw) as Doc<unknown>) : null;
  } catch {
    return null;
  }
}

function writeCache(key: DocKey, doc: Doc<unknown> | null) {
  try {
    if (doc) localStorage.setItem(CACHE + key, JSON.stringify(doc));
    else localStorage.removeItem(CACHE + key);
  } catch {
    /* storage full or blocked: the in-memory copy still works */
  }
}

/** The version in use: from Supabase / this phone's copy, or 'built-in'. */
export function dataSource(key: DocKey): string {
  return applied[key] ?? 'built-in';
}

/**
 * Before the first render: use this phone's last copy at once, then wait up to
 * `ms` for a newer one from Supabase. Never throws.
 */
export async function loadData(ms = 2500): Promise<void> {
  for (const key of ['fixtures', 'teams'] as DocKey[]) {
    const cached = readCache(key);
    if (cached) apply(key, cached);
  }
  if (!supabase) return;
  try {
    const { data, error } = await withTimeout(
      supabase.from('app_data').select('key, value, updated_at').in('key', ['fixtures', 'teams']),
      ms,
    );
    if (error || !data) return;
    const remote = new Map(data.map((r) => [r.key as DocKey, r]));
    for (const key of ['fixtures', 'teams'] as DocKey[]) {
      const row = remote.get(key);
      if (!row) {
        // The admin went back to the built-in version
        if (applied[key]) {
          writeCache(key, null);
          if (key === 'fixtures') replaceAll(FIXTURES, BUILT_IN.fixtures);
          else replaceAll(TOURNAMENT_TEAMS, BUILT_IN.teams);
          delete applied[key];
        }
        continue;
      }
      const doc = { value: row.value, updatedAt: row.updated_at as string };
      if (doc.updatedAt !== applied[key] && apply(key, doc)) writeCache(key, doc);
    }
  } catch {
    /* offline or slow: carry on with what we have */
  }
}

/** Calls `onChange` when the admin publishes a new fixture or team list. */
export function watchData(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel('app-data')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, (p) => {
      const row = (p.new ?? {}) as { key?: DocKey; updated_at?: string };
      if (!row.key || row.updated_at !== applied[row.key]) onChange();
    })
    .subscribe();
  return () => void client.removeChannel(channel);
}

/** Super admin: publish a new version. Throws with a readable message on failure. */
export async function saveData(key: DocKey, value: unknown, email: string): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  if (!isValidDoc(key, value)) throw new Error(`The ${key} list is not valid`);
  const updatedAt = new Date().toISOString();
  const { error } = await supabase
    .from('app_data')
    .upsert({ key, value, updated_at: updatedAt, updated_by: email });
  if (error) throw new Error(error.message);
  const doc = { value, updatedAt };
  apply(key, doc);
  writeCache(key, doc);
}

export type RescheduleError =
  'offline' | 'notPublished' | 'stale' | 'notAllowed' | 'onlyTime' | 'failed';

export class RescheduleFailure extends Error {
  constructor(public readonly code: RescheduleError) {
    super(code);
  }
}

/**
 * Super admin or scorer: save new start times (and the day's new order).
 * The server checks that nothing else changed, so a scorer cannot edit teams
 * this way. When someone else saved in the meantime, the newer list is loaded
 * and 'stale' is thrown so the person can check and try again.
 */
export async function rescheduleFixtures(next: Fixture[]): Promise<void> {
  if (!supabase) throw new RescheduleFailure('offline');
  const base = applied.fixtures;
  if (!base) throw new RescheduleFailure('notPublished');
  if (!onlyTimesChanged(FIXTURES, next)) throw new RescheduleFailure('onlyTime');
  let res: { data: unknown; error: { message: string } | null; status?: number };
  try {
    res = await withTimeout(
      supabase.rpc('reschedule_fixtures', { next, base_updated_at: base }),
      10000,
    );
  } catch {
    throw new RescheduleFailure('offline');
  }
  if (res.error) {
    const m = res.error.message;
    if (/stale_fixtures/.test(m)) {
      await loadData(5000);
      throw new RescheduleFailure('stale');
    }
    if (/no_published_fixtures/.test(m)) throw new RescheduleFailure('notPublished');
    if (/not_allowed/.test(m)) throw new RescheduleFailure('notAllowed');
    if (/only_time|bad_time/.test(m)) throw new RescheduleFailure('onlyTime');
    if (!res.status) throw new RescheduleFailure('offline');
    throw new RescheduleFailure('failed');
  }
  const doc = { value: next, updatedAt: String(res.data) };
  apply('fixtures', doc);
  writeCache('fixtures', doc);
}

/** Super admin: drop the published version so every phone uses the one in the code. */
export async function resetData(key: DocKey): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.from('app_data').delete().eq('key', key);
  if (error) throw new Error(error.message);
  writeCache(key, null);
  if (key === 'fixtures') replaceAll(FIXTURES, BUILT_IN.fixtures);
  else replaceAll(TOURNAMENT_TEAMS, BUILT_IN.teams);
  delete applied[key];
}
