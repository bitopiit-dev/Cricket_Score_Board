import type { Match } from '../engine/types';
import { withUpload } from '../sync/matchSync';
import { db as defaultDb, type ScoreBoardDB } from './database';

/**
 * Storage boundary for matches. The UI only talks to this interface, so a
 * Supabase-backed (or syncing) implementation can be added later without
 * touching components.
 */
export interface MatchRepository {
  list(): Promise<Match[]>;
  get(id: string): Promise<Match | undefined>;
  save(match: Match): Promise<void>;
  remove(id: string): Promise<void>;
}

export function createLocalRepository(db: ScoreBoardDB = defaultDb): MatchRepository {
  return {
    async list() {
      return db.matches.orderBy('updatedAt').reverse().toArray();
    },
    async get(id) {
      return db.matches.get(id);
    },
    async save(match) {
      await db.matches.put(match);
    },
    async remove(id) {
      await db.matches.delete(id);
    },
  };
}

export const matchRepository = withUpload(createLocalRepository());

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
