import { useSyncExternalStore } from 'react';
import { supabase } from './supabase';

export type Role = 'super' | 'scorer';
export interface AuthState {
  email: string | null;
  /** From the app_admins table; null for a signed-in person who has no role yet. */
  role: Role | null;
  ready: boolean;
}

let state: AuthState = { email: null, role: null, ready: !supabase };
const listeners = new Set<() => void>();
const set = (next: AuthState) => {
  state = next;
  listeners.forEach((l) => l());
};

async function refresh(email: string | null) {
  if (!supabase || !email) return set({ email: null, role: null, ready: true });
  const { data } = await supabase.rpc('my_role');
  set({ email, role: data === 'super' || data === 'scorer' ? data : null, ready: true });
}

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => refresh(data.session?.user.email ?? null));
  supabase.auth.onAuthStateChange((_event, session) => {
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
export const canScore = () => state.role === 'super' || state.role === 'scorer';

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Not connected');
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
