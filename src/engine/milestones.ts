import type { Match, MatchState, TeamIndex } from './types';

/** Gold-badge moments on a scorecard. */

/** 100 for a hundred, 50 for a fifty, otherwise null. */
export function battingMilestone(runs: number): 100 | 50 | null {
  return runs >= 100 ? 100 : runs >= 50 ? 50 : null;
}

/** Three or more wickets in an innings. */
export function isWicketHaul(wickets: number): boolean {
  return wickets >= 3;
}

/** The Man of the Match's player id, if one is set and really plays in the match. */
export function manOfTheMatchId(match: Match): string | null {
  const id = match.manOfTheMatch;
  if (typeof id !== 'string') return null;
  return match.teams.some((t) => t.players.some((p) => p.id === id)) ? id : null;
}

/** Which side a player is on, or null. */
export function teamOfPlayer(match: Match, playerId: string): TeamIndex | null {
  const i = match.teams.findIndex((t) => t.players.some((p) => p.id === playerId));
  return i === 0 || i === 1 ? i : null;
}

export interface MatchFigures {
  batting: { runs: number; balls: number; out: boolean } | null;
  bowling: { wickets: number; runs: number; legalBalls: number } | null;
}

/** A player's batting and bowling across the main innings (super overs left out). */
export function playerFigures(state: MatchState, playerId: string): MatchFigures {
  let batting = null as MatchFigures['batting'];
  let bowling = null as MatchFigures['bowling'];
  for (const inn of state.innings) {
    if (inn.superOver) continue;
    const b = inn.batters.find((x) => x.playerId === playerId);
    if (b) {
      batting = {
        runs: (batting?.runs ?? 0) + b.runs,
        balls: (batting?.balls ?? 0) + b.balls,
        out: (batting?.out ?? false) || !!b.dismissal,
      };
    }
    const w = inn.bowlers.find((x) => x.playerId === playerId);
    if (w) {
      bowling = {
        wickets: (bowling?.wickets ?? 0) + w.wickets,
        runs: (bowling?.runs ?? 0) + w.runsConceded,
        legalBalls: (bowling?.legalBalls ?? 0) + w.legalBalls,
      };
    }
  }
  return { batting, bowling };
}
