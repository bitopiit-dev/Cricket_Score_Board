import { create } from 'zustand';
import { matchRepository } from '../db/repository';
import { addEvent, deriveMatchState, undoLastEvent, type ValidationError } from '../engine/scoring';
import type { Match, MatchEventInput, MatchState } from '../engine/types';
import { newId } from '../utils/id';

interface MatchStore {
  match: Match | null;
  state: MatchState | null;
  loading: boolean;
  notFound: boolean;
  lastError: ValidationError | null;
  load: (id: string) => Promise<void>;
  /** Applies an event; returns false (and sets lastError) if rejected. */
  dispatch: (input: MatchEventInput) => boolean;
  undo: () => void;
  clearError: () => void;
}

/** Saves run one after another so an older write never lands last. */
let saveQueue: Promise<void> = Promise.resolve();
function persist(match: Match) {
  saveQueue = saveQueue
    .then(() => matchRepository.save(match))
    .catch((e) => console.error('Failed to save match', e));
}

export const useMatchStore = create<MatchStore>((set, get) => ({
  match: null,
  state: null,
  loading: false,
  notFound: false,
  lastError: null,

  async load(id) {
    if (get().match?.id === id) return;
    set({ loading: true, notFound: false, match: null, state: null });
    const match = await matchRepository.get(id);
    if (!match) {
      set({ loading: false, notFound: true });
      return;
    }
    set({ match, state: deriveMatchState(match), loading: false });
  },

  dispatch(input) {
    const { match } = get();
    if (!match) return false;
    const res = addEvent(match, input, { id: newId(), at: Date.now() });
    if ('error' in res) {
      set({ lastError: res.error });
      return false;
    }
    set({ match: res.match, state: deriveMatchState(res.match), lastError: null });
    persist(res.match);
    return true;
  },

  undo() {
    const { match } = get();
    if (!match || match.events.length === 0) return;
    const next = undoLastEvent(match, Date.now());
    set({ match: next, state: deriveMatchState(next), lastError: null });
    persist(next);
  },

  clearError: () => set({ lastError: null }),
}));

/** Creates and stores a new match, returning its id. */
export async function createMatch(data: Omit<Match, 'id' | 'createdAt' | 'updatedAt' | 'events'>) {
  const now = Date.now();
  const match: Match = { ...data, id: newId(), createdAt: now, updatedAt: now, events: [] };
  await matchRepository.save(match);
  return match.id;
}
