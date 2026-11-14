/**
 * BPL-2027 teams. Names are proper nouns: never translated.
 *
 * This list is the seed data for the future Supabase `teams` table, so each
 * team has a stable `id` that will not change when the name is edited.
 */
export type PlayerRole = 'batter' | 'bowler' | 'allRounder' | 'wicketKeeper';

export interface TournamentPlayer {
  /** Stable slug, unique within the team (e.g. 'rahim-uddin'). */
  id: string;
  /** Shown exactly as written, never translated. */
  name: string;
  /** Path under public/, e.g. 'players/ddc/rahim-uddin.jpg'. Optional. */
  photo?: string;
  role?: PlayerRole;
  captain?: boolean;
  /** On the squad but not in the first XI. */
  substitute?: boolean;
}

export interface TournamentTeam {
  /** Stable slug, used as the key in matches and later as the seed id. */
  id: string;
  name: string;
  /** Group in the first round. */
  group: 'A' | 'B';
  /** Badge colour (shown until a logo exists). */
  color: string;
  /** Logo URL or path; when missing, a coloured initial badge is shown. */
  logo?: string;
  /** Squad: first XI then up to 3 substitutes, 14 at most (rule 8). Empty until added. */
  players: TournamentPlayer[];
}

/**
 * To add players, fill a team's `players` array, e.g.
 *
 *   players: [
 *     { id: 'rahim-uddin', name: 'Rahim Uddin', role: 'batter', captain: true,
 *       photo: 'players/ddc/rahim-uddin.jpg' },
 *     { id: 'karim-ali', name: 'Karim Ali', role: 'bowler', substitute: true },
 *   ]
 *
 * Photos go in public/players/<team id>/ (see README).
 */
export const TOURNAMENT_TEAMS: readonly TournamentTeam[] = [
  // Group A
  {
    id: 'finishing-victorians',
    name: 'Finishing Victorians',
    group: 'A',
    color: '#7c3aed',
    players: [],
  },
  { id: 'power-house-x1', name: 'Power House X1', group: 'A', color: '#ea580c', players: [] },
  { id: 'mcd-super-stars', name: 'MCD Super Stars', group: 'A', color: '#ca8a04', players: [] },
  {
    id: 'power-printing-washing',
    name: 'Power (Printing & Washing)',
    group: 'A',
    color: '#16a34a',
    players: [],
  },
  {
    id: 'quality-flying-fighter',
    name: 'Quality Flying Fighter',
    group: 'A',
    color: '#2563eb',
    players: [],
  },
  { id: 'rainbow-cutting', name: 'Rainbow Cutting', group: 'A', color: '#db2777', players: [] },
  // Group B
  { id: 'engineer-warriors', name: 'Engineer Warriors', group: 'B', color: '#0d9488', players: [] },
  { id: 'hr-vikings', name: 'HR Vikings', group: 'B', color: '#4f46e5', players: [] },
  { id: 'power-player', name: 'Power Player', group: 'B', color: '#dc2626', players: [] },
  { id: 'ddc', name: 'DDC', group: 'B', color: '#475569', players: [] },
  {
    id: 'red-bulls-warriors',
    name: 'Red Bulls Warriors',
    group: 'B',
    color: '#b91c1c',
    players: [],
  },
  { id: 'sky-warrior', name: 'Sky Warrior', group: 'B', color: '#0284c7', players: [] },
];

export type GroupId = 'A' | 'B';

export function teamsInGroup(group: GroupId): TournamentTeam[] {
  return TOURNAMENT_TEAMS.filter((t) => t.group === group);
}

/** Team by its exact name (as written in the fixture). */
export function teamByName(name: string): TournamentTeam | undefined {
  return TOURNAMENT_TEAMS.find((t) => t.name === name);
}

/** Old team ids that were renamed, mapped to the current id. */
export const RENAMED_TEAM_IDS: Readonly<Record<string, string>> = {
  'ie-warrior': 'engineer-warriors',
  'red-bulls-warrior': 'red-bulls-warriors',
  'power-x1-printing-washing': 'power-printing-washing',
};

/**
 * Moves a saved match's teams from renamed ids to the current id and name.
 * Returns true if anything changed.
 */
export function migrateTeamIds(match: { teams: { teamId?: string; name: string }[] }): boolean {
  let changed = false;
  for (const team of match.teams) {
    const newId = team.teamId && RENAMED_TEAM_IDS[team.teamId];
    if (!newId) continue;
    team.teamId = newId;
    team.name = TOURNAMENT_TEAMS.find((t) => t.id === newId)?.name ?? team.name;
    changed = true;
  }
  return changed;
}

export function findTeam(id: string | undefined): TournamentTeam | undefined {
  return id ? TOURNAMENT_TEAMS.find((t) => t.id === id) : undefined;
}

/** First letters of the first two words, for a player's placeholder badge. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join('')
    .toUpperCase();
}

/** First letter of the name, for the placeholder badge. */
export function teamInitial(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}
