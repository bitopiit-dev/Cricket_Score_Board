import type { Match, MatchState, TeamIndex } from '../engine/types';
import { MOS_POINTS } from './awards';

/**
 * Suggests the Man of the Match from how players did in this match.
 *
 * Only the winning team's players are ranked; after a tie (or no result) both
 * teams are. Points are the same as the Awards tab (MOS_POINTS): 1 per run,
 * 20 per wicket, 10 per catch, stumping, run out or maiden. Super overs are
 * left out, as in the official records. The scorer still makes the final
 * choice: this only puts the likeliest players first.
 */

export interface MomCandidate {
  playerId: string;
  name: string;
  team: TeamIndex;
  points: number;
  runs: number;
  balls: number;
  /** Batted and was not out. */
  notOut: boolean;
  batted: boolean;
  wickets: number;
  runsConceded: number;
  legalBalls: number;
  maidens: number;
  /** Catches, stumpings and run outs. */
  fielding: number;
}

export function suggestManOfTheMatch(match: Match, state: MatchState, limit = 3): MomCandidate[] {
  const result = state.result;
  if (state.phase !== 'completed') return [];
  const teams: TeamIndex[] = result?.kind === 'won' ? [result.winner] : [0, 1];

  const rows = new Map<string, MomCandidate>();
  for (const ti of teams) {
    for (const p of match.teams[ti].players) {
      rows.set(p.id, {
        playerId: p.id,
        name: p.name,
        team: ti,
        points: 0,
        runs: 0,
        balls: 0,
        notOut: false,
        batted: false,
        wickets: 0,
        runsConceded: 0,
        legalBalls: 0,
        maidens: 0,
        fielding: 0,
      });
    }
  }

  for (const inn of state.innings) {
    if (inn.superOver) continue;
    for (const b of inn.batters) {
      const row = rows.get(b.playerId);
      if (row) {
        row.batted = true;
        row.runs += b.runs;
        row.balls += b.balls;
        row.notOut = !b.dismissal;
      }
      const d = b.dismissal;
      const fielder = d?.fielderId ? rows.get(d.fielderId) : undefined;
      if (fielder && d && (d.kind === 'caught' || d.kind === 'stumped' || d.kind === 'runOut')) {
        fielder.fielding += 1;
      }
    }
    for (const bw of inn.bowlers) {
      const row = rows.get(bw.playerId);
      if (!row) continue;
      row.wickets += bw.wickets;
      row.runsConceded += bw.runsConceded;
      row.legalBalls += bw.legalBalls;
      row.maidens += bw.maidens;
    }
  }

  const list = [...rows.values()];
  for (const r of list) {
    r.points =
      r.runs * MOS_POINTS.run +
      r.wickets * MOS_POINTS.wicket +
      r.fielding * MOS_POINTS.fielding +
      r.maidens * MOS_POINTS.maiden;
  }

  return list
    .filter((r) => r.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        // Level on points: more wickets, then more runs, then faster scoring,
        // then cheaper bowling
        b.wickets - a.wickets ||
        b.runs - a.runs ||
        a.balls - b.balls ||
        a.runsConceded - b.runsConceded,
    )
    .slice(0, limit);
}
