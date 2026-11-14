/**
 * Tournament format (rule 3): every team plays every other team once
 * (12 teams = 66 matches), then BPL-style play-offs for the top four.
 */

/** League points. Editable later by the admin. */
export const LEAGUE_POINTS = { win: 2, tie: 1, noResult: 1, loss: 0 } as const;

export type Pairing = [string, string];

/**
 * Single round robin by the circle method. Returns rounds in which every
 * team plays at most once; every pair meets exactly once. With an odd number
 * of teams one team rests each round.
 */
export function roundRobinRounds(teamIds: readonly string[]): Pairing[][] {
  if (new Set(teamIds).size !== teamIds.length) throw new Error('duplicate team id');
  const BYE = '\u0000bye';
  const ids = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, BYE];
  const n = ids.length;
  const rounds: Pairing[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Pairing[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      // Alternate home/away so the fixed team is not always listed first.
      round.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(round);
    // Keep the first team fixed and rotate the rest one step.
    ids.splice(1, 0, ids.pop()!);
  }
  return rounds;
}

export function roundRobinMatchCount(teams: number): number {
  return (teams * (teams - 1)) / 2;
}

/* --------------------------------- Play-offs -------------------------------- */

export type PlayoffId = 'qualifier1' | 'eliminator' | 'qualifier2' | 'final';

export type Slot =
  | { kind: 'rank'; rank: number }
  | { kind: 'winner'; of: PlayoffId }
  | { kind: 'loser'; of: PlayoffId };

export interface PlayoffMatch {
  id: PlayoffId;
  home: Slot;
  away: Slot;
}

/**
 * BPL / IPL style play-offs for the top four of the league table:
 * - Qualifier 1: 1st v 2nd, the winner goes to the final
 * - Eliminator: 3rd v 4th, the loser is out
 * - Qualifier 2: loser of Q1 v winner of the Eliminator
 * - Final: winner of Q1 v winner of Q2
 */
export const BPL_PLAYOFFS: readonly PlayoffMatch[] = [
  { id: 'qualifier1', home: { kind: 'rank', rank: 1 }, away: { kind: 'rank', rank: 2 } },
  { id: 'eliminator', home: { kind: 'rank', rank: 3 }, away: { kind: 'rank', rank: 4 } },
  {
    id: 'qualifier2',
    home: { kind: 'loser', of: 'qualifier1' },
    away: { kind: 'winner', of: 'eliminator' },
  },
  {
    id: 'final',
    home: { kind: 'winner', of: 'qualifier1' },
    away: { kind: 'winner', of: 'qualifier2' },
  },
];

export interface ResolvedPlayoff {
  id: PlayoffId;
  home: string | null;
  away: string | null;
}

/**
 * Fills in the play-off teams that are known so far.
 * @param standings team ids in league-table order (needs at least 4 once the league is over)
 * @param winners   winner team id of each play-off already played
 */
export function resolvePlayoffs(
  standings: readonly string[],
  winners: Partial<Record<PlayoffId, string>>,
): ResolvedPlayoff[] {
  const resolved = new Map<PlayoffId, ResolvedPlayoff>();
  const teamFor = (slot: Slot): string | null => {
    if (slot.kind === 'rank') return standings[slot.rank - 1] ?? null;
    const m = resolved.get(slot.of);
    const w = winners[slot.of];
    if (!m || !w || !m.home || !m.away) return null;
    if (w !== m.home && w !== m.away) return null; // inconsistent input
    return slot.kind === 'winner' ? w : w === m.home ? m.away : m.home;
  };
  for (const p of BPL_PLAYOFFS) {
    resolved.set(p.id, { id: p.id, home: teamFor(p.home), away: teamFor(p.away) });
  }
  return [...resolved.values()];
}
