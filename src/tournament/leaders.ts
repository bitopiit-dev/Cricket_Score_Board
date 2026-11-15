import { deriveMatchState } from '../engine/scoring';
import type { Match, TeamIndex } from '../engine/types';
import { isTournamentMatch, playerKey, type PlayerTotals } from './awards';

/**
 * Tournament leaderboards for the Stats page. Rates need a minimum so one
 * lucky ball doesn't top the list.
 */
export const MIN_BALLS_FOR_SR = 20;
export const MIN_BALLS_FOR_ECON = 12;

export type BoardId = 'runs' | 'wickets' | 'sixes' | 'strikeRate' | 'economy' | 'fielding';

export const strikeRateOf = (r: PlayerTotals) => (r.balls === 0 ? 0 : (r.runs * 100) / r.balls);
export const economyOf = (r: PlayerTotals) =>
  r.legalBalls === 0 ? Infinity : (r.runsConceded * 6) / r.legalBalls;
export const fieldingOf = (r: PlayerTotals) => r.catches + r.stumpings + r.runOuts;

const byName = (a: PlayerTotals, b: PlayerTotals) => a.name.localeCompare(b.name);

export function leaderboard(totals: PlayerTotals[], board: BoardId, limit = 5): PlayerTotals[] {
  const list = [...totals];
  switch (board) {
    case 'runs':
      return list
        .filter((r) => r.runs > 0)
        .sort((a, b) => b.runs - a.runs || strikeRateOf(b) - strikeRateOf(a) || byName(a, b))
        .slice(0, limit);
    case 'wickets':
      return list
        .filter((r) => r.wickets > 0)
        .sort((a, b) => b.wickets - a.wickets || economyOf(a) - economyOf(b) || byName(a, b))
        .slice(0, limit);
    case 'sixes':
      return list
        .filter((r) => r.sixes > 0)
        .sort((a, b) => b.sixes - a.sixes || b.runs - a.runs || byName(a, b))
        .slice(0, limit);
    case 'strikeRate':
      return list
        .filter((r) => r.balls >= MIN_BALLS_FOR_SR)
        .sort((a, b) => strikeRateOf(b) - strikeRateOf(a) || b.runs - a.runs || byName(a, b))
        .slice(0, limit);
    case 'economy':
      return list
        .filter((r) => r.legalBalls >= MIN_BALLS_FOR_ECON)
        .sort((a, b) => economyOf(a) - economyOf(b) || b.wickets - a.wickets || byName(a, b))
        .slice(0, limit);
    case 'fielding':
      return list
        .filter((r) => fieldingOf(r) > 0)
        .sort((a, b) => fieldingOf(b) - fieldingOf(a) || b.catches - a.catches || byName(a, b))
        .slice(0, limit);
  }
}

/** One player's part in one match, for the player profile. */
export interface PlayerMatchLine {
  matchId: string;
  fixtureId?: string;
  opponentTeamId: string;
  opponentName: string;
  outcome: 'W' | 'L' | 'T';
  batting: { runs: number; balls: number; out: boolean; fours: number; sixes: number } | null;
  bowling: { legalBalls: number; runs: number; wickets: number } | null;
  fielding: number;
}

/** The player's completed tournament matches, newest first (super overs left out). */
export function playerMatchLines(
  matches: Match[],
  teamId: string,
  name: string,
): PlayerMatchLine[] {
  const key = playerKey(teamId, name);
  const out: PlayerMatchLine[] = [];
  for (const m of matches) {
    if (!isTournamentMatch(m)) continue;
    const ti = m.teams.findIndex((t) => t.teamId === teamId) as TeamIndex | -1;
    if (ti === -1) continue;
    const me = m.teams[ti].players.find((p) => playerKey(teamId, p.name) === key);
    if (!me) continue;
    const state = deriveMatchState(m);
    if (state.phase !== 'completed') continue;
    const opp = m.teams[ti === 0 ? 1 : 0];
    const line: PlayerMatchLine = {
      matchId: m.id,
      fixtureId: m.fixtureId,
      opponentTeamId: opp.teamId!,
      opponentName: opp.name,
      outcome:
        !state.result || state.result.kind === 'tie' ? 'T' : state.result.winner === ti ? 'W' : 'L',
      batting: null,
      bowling: null,
      fielding: 0,
    };
    for (const inn of state.innings) {
      if (inn.superOver) continue;
      const bat = inn.batters.find((b) => b.playerId === me.id);
      if (bat) {
        line.batting = {
          runs: bat.runs,
          balls: bat.balls,
          out: !!bat.dismissal,
          fours: bat.fours,
          sixes: bat.sixes,
        };
      }
      const bowl = inn.bowlers.find((b) => b.playerId === me.id);
      if (bowl) {
        line.bowling = {
          legalBalls: bowl.legalBalls,
          runs: bowl.runsConceded,
          wickets: bowl.wickets,
        };
      }
      for (const b of inn.batters) {
        if (
          b.dismissal?.fielderId === me.id &&
          ['caught', 'stumped', 'runOut'].includes(b.dismissal.kind)
        )
          line.fielding += 1;
      }
    }
    out.push(line);
  }
  return out.sort((a, b) => {
    const ma = matches.find((m) => m.id === a.matchId)!;
    const mb = matches.find((m) => m.id === b.matchId)!;
    return mb.createdAt - ma.createdAt;
  });
}
