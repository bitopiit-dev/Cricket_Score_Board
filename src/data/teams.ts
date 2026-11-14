/**
 * BPL-2027 teams. Names are proper nouns: never translated.
 *
 * This list is the seed data for the future Supabase `teams` table, so each
 * team has a stable `id` that will not change when the name is edited.
 */
export interface TournamentTeam {
  /** Stable slug, used as the key in matches and later as the seed id. */
  id: string;
  name: string;
  /** Badge colour (shown until a logo exists). */
  color: string;
  /** Logo URL or path; when missing, a coloured initial badge is shown. */
  logo?: string;
}

export const TOURNAMENT_TEAMS: readonly TournamentTeam[] = [
  { id: 'power-player', name: 'Power Player', color: '#dc2626' },
  { id: 'sky-warrior', name: 'Sky Warrior', color: '#0284c7' },
  { id: 'finishing-victorians', name: 'Finishing Victorians', color: '#7c3aed' },
  { id: 'rainbow-cutting', name: 'Rainbow Cutting', color: '#db2777' },
  { id: 'power-house-x1', name: 'Power House X1', color: '#ea580c' },
  { id: 'hr-vikings', name: 'HR Vikings', color: '#4f46e5' },
  { id: 'engineer-warriors', name: 'Engineer Warriors', color: '#0d9488' },
  { id: 'red-bulls-warrior', name: 'Red Bulls Warrior', color: '#b91c1c' },
  { id: 'mcd-super-stars', name: 'MCD Super Stars', color: '#ca8a04' },
  { id: 'quality-flying-fighter', name: 'Quality Flying Fighter', color: '#2563eb' },
  { id: 'power-x1-printing-washing', name: 'Power X1 (Printing & Washing)', color: '#16a34a' },
  { id: 'ddc', name: 'DDC', color: '#475569' },
];

export function findTeam(id: string | undefined): TournamentTeam | undefined {
  return id ? TOURNAMENT_TEAMS.find((t) => t.id === id) : undefined;
}

/** First letter of the name, for the placeholder badge. */
export function teamInitial(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}
