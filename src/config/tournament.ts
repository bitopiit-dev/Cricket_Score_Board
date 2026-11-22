/**
 * Tournament settings that are not match rules. Will move to Supabase so the
 * admin can change them.
 */
export const SQUAD_LIMITS = {
  /** Players per squad, 11 plus extras (rule 9). */
  maxPlayers: 14,
  /** Players outside the first XI. */
  maxSubstitutes: 3,
} as const;
