import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The project URL and publishable key are public by design (they ship in every
 * browser); the database's row-level security decides who may write. Builds can
 * override them with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * Never put a service_role or secret key here.
 */
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://dkdomfmhqdtlthpchrij.supabase.co';
const KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ABmiVD3gBVBlN8clGbEYDg_N2MP0AcJ';

/** Null in tests, without a browser, or where storage is blocked, so the app still runs (offline mode). */
export const supabase: SupabaseClient | null = (() => {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return null;
  try {
    return createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  } catch {
    return null;
  }
})();

/** Rejects after `ms`, so a slow network never holds up the app. */
export function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}
