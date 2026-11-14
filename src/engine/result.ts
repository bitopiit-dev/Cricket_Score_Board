import type { InningsState, MatchResult } from './types';

/** Result of one pair of innings (the main match, or one super over). */
function pairResult(first: InningsState, second: InningsState): MatchResult {
  if (second.target !== null && second.runs >= second.target) {
    return {
      kind: 'won',
      winner: second.battingTeam,
      by: 'wickets',
      margin: second.wicketsLimit - second.wickets,
    };
  }
  if (second.runs === first.runs) return { kind: 'tie' };
  return { kind: 'won', winner: first.battingTeam, by: 'runs', margin: first.runs - second.runs };
}

/**
 * Result of a completed match. A tied main match is decided by the last
 * completed super over, if one was played.
 */
export function computeResult(innings: InningsState[]): MatchResult {
  const main = pairResult(innings[0], innings[1]);
  if (main.kind !== 'tie' || innings.length < 4) return main;
  const n = innings.length - (innings.length % 2);
  const so = pairResult(innings[n - 2], innings[n - 1]);
  return so.kind === 'won' ? { kind: 'won', winner: so.winner, by: 'superOver', margin: 0 } : so;
}
