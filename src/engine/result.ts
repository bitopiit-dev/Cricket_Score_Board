import { maxWickets } from './rules';
import type { InningsState, Match, MatchResult } from './types';

/** Result of a completed two-innings limited-overs match. */
export function computeResult(
  first: InningsState,
  second: InningsState,
  match: Match,
): MatchResult {
  if (second.target !== null && second.runs >= second.target) {
    const team = match.teams[second.battingTeam];
    return {
      kind: 'won',
      winner: second.battingTeam,
      by: 'wickets',
      margin: maxWickets(team, match.settings) - second.wickets,
    };
  }
  if (second.runs === first.runs) return { kind: 'tie' };
  return { kind: 'won', winner: first.battingTeam, by: 'runs', margin: first.runs - second.runs };
}
