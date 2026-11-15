import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

export type Role = 'super' | 'scorer';
export interface AuthState {
  email: string | null;
  /** From the app_admins table; null for a signed-in person who has no role yet. */
  role: Role | null;
  ready: boolean;
}

/**
 * The last role Supabase confirmed is kept on the phone. A scorer at the ground
 * with no signal (or in the first second after opening the app) is still a
 * scorer, so their balls queue for upload and are never replaced by an older
 * copy from the server.
 */
const ROLE_CACHE = 'bpl:role';
interface CachedRole {
  email: string;
  role: Role;
}

function readCachedRole(): CachedRole | null {
  try {
    const raw = localStorage.getItem(ROLE_CACHE);
    const c = raw ? (JSON.parse(raw) as CachedRole) : null;
    return c && (c.role === 'super' || c.role === 'scorer') ? c : null;
  } catch {
    return null;
  }
}

function writeCachedRole(c: CachedRole | null) {
  try {
    if (c) localStorage.setItem(ROLE_CACHE, JSON.stringify(c));
    else localStorage.removeItem(ROLE_CACHE);
  } catch {
    /* storage blocked: the role then lasts only while the app is open */
  }
}

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The role to use after asking Supabase. `answer` is null when the question never
 * got an answer (offline, timeout): then the role this phone last saw for the
 * same email stays. A real answer always wins, so removing a scorer still works.
 */
export function nextRole(
  email: string,
  cached: CachedRole | null,
  answer: { data: unknown; error: unknown } | null,
): Role | null {
  if (answer && !answer.error) {
    return answer.data === 'super' || answer.data === 'scorer' ? answer.data : null;
  }
  return cached && sameEmail(cached.email, email) ? cached.role : null;
}

const startCache = supabase ? readCachedRole() : null;
let state: AuthState = {
  email: startCache?.email ?? null,
  role: startCache?.role ?? null,
  ready: !supabase,
};
const listeners = new Set<() => void>();
const set = (next: AuthState) => {
  state = next;
  listeners.forEach((l) => l());
};

async function refresh(email: string | null) {
  if (!supabase || !email) {
    writeCachedRole(null);
    return set({ email: null, role: null, ready: true });
  }
  // Use the remembered role straight away, then check with Supabase.
  const cached = readCachedRole();
  const known = nextRole(email, cached, null);
  set({ email, role: known, ready: true });

  let answer: { data: unknown; error: unknown } | null;
  try {
    const res = await supabase.rpc('my_role');
    // A network failure comes back as an error without a status: treat as no answer.
    answer = res.error && !res.status ? null : res;
  } catch {
    answer = null;
  }
  const role = nextRole(email, cached, answer);
  if (answer) writeCachedRole(role ? { email, role } : null);
  set({ email, role, ready: true });
}

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => refresh(data.session?.user.email ?? null));
  supabase.auth.onAuthStateChange((event, session) => {
    // A failed token refresh while offline is not a sign-out: keep the role.
    if (!session && event !== 'SIGNED_OUT') return;
    void refresh(session?.user.email ?? null);
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const authState = () => state;
export const roleCanScore = (role: Role | null) => role === 'super' || role === 'scorer';
export const canScore = () => roleCanScore(state.role);

/**
 * Whether this person may start and score matches: a super admin or a scorer.
 * Without Supabase (tests, offline-only builds) there are no logins, so everyone may.
 */
export function useCanScore(): boolean {
  const { role } = useAuth();
  return !supabase || roleCanScore(role);
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  writeCachedRole(null);
  await supabase?.auth.signOut();
}
