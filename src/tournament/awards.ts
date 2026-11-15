import { deriveMatchState } from '../engine/scoring';
import type { Match, TeamIndex } from '../engine/types';

/**
 * Tournament awards (rule 30): Man of the Series and Best Wicket-Taker.
 *
 * Only completed tournament matches count (both teams picked from the team
 * list), and super overs are left out, as in official records.
 *
 * Until squads have fixed player ids, a player is identified by team + name,
 * so the same name typed in different matches is the same player.
 */

export interface PlayerTotals {
  key: string;
  name: string;
  teamId: string;
  teamName: string;
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOuts: number;
  highScore: number;
  /** The high score was not out. */
  highScoreNotOut: boolean;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maidens: number;
  /** Best figures in one innings (most wickets, then fewest runs). */
  bestBowling: { wickets: number; runs: number } | null;
  catches: number;
  stumpings: number;
  runOuts: number;
  /** Man of the Series points (see MOS_POINTS). */
  points: number;
}

/** Points for the Man of the Series ranking. The committee makes the final choice. */
export const MOS_POINTS = { run: 1, wicket: 20, fielding: 10, maiden: 10 } as const;

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export function playerKey(teamId: string, name: string): string {
  return `${teamId}:${normalize(name)}`;
}

/** Completed matches between two teams from the tournament list. */
export function isTournamentMatch(m: Match): boolean {
  return !!m.teams[0].teamId && !!m.teams[1].teamId;
}

export function playerTotals(matches: Match[]): PlayerTotals[] {
  const map = new Map<string, PlayerTotals>();

  for (const m of matches) {
    if (!isTournamentMatch(m)) continue;
    const state = deriveMatchState(m);
    if (state.phase !== 'completed') continue;

    // id -> totals row for this match's players
    const rows = new Map<string, PlayerTotals>();
    ([0, 1] as TeamIndex[]).forEach((ti) => {
      const team = m.teams[ti];
      for (const p of team.players) {
        const key = playerKey(team.teamId!, p.name);
        let row = map.get(key);
        if (!row) {
          row = {
            key,
            name: p.name.trim(),
            teamId: team.teamId!,
            teamName: team.name,
            matches: 0,
            innings: 0,
            runs: 0,
            balls: 0,
            fours: 0,
            sixes: 0,
            notOuts: 0,
            highScore: 0,
            highScoreNotOut: false,
            legalBalls: 0,
            runsConceded: 0,
            wickets: 0,
            maidens: 0,
            bestBowling: null,
            catches: 0,
            stumpings: 0,
            runOuts: 0,
            points: 0,
          };
          map.set(key, row);
        }
        row.matches += 1;
        rows.set(p.id, row);
      }
    });

    for (const inn of state.innings) {
      if (inn.superOver) continue;
      for (const b of inn.batters) {
        const row = rows.get(b.playerId);
        if (!row) continue;
        row.innings += 1;
        row.runs += b.runs;
        row.balls += b.balls;
        row.fours += b.fours;
        row.sixes += b.sixes;
        if (b.runs > row.highScore || (b.runs === row.highScore && !b.dismissal)) {
          row.highScore = b.runs;
          row.highScoreNotOut = !b.dismissal;
        }
        if (!b.dismissal) row.notOuts += 1;
        const d = b.dismissal;
        const fielder = d?.fielderId ? rows.get(d.fielderId) : undefined;
        if (fielder && d) {
          if (d.kind === 'caught') fielder.catches += 1;
          else if (d.kind === 'stumped') fielder.stumpings += 1;
          else if (d.kind === 'runOut') fielder.runOuts += 1;
        }
      }
      for (const bw of inn.bowlers) {
        const row = rows.get(bw.playerId);
        if (!row) continue;
        row.legalBalls += bw.legalBalls;
        row.runsConceded += bw.runsConceded;
        row.wickets += bw.wickets;
        row.maidens += bw.maidens;
        const best = row.bestBowling;
        if (
          bw.legalBalls > 0 &&
          (!best ||
            bw.wickets > best.wickets ||
            (bw.wickets === best.wickets && bw.runsConceded < best.runs))
        ) {
          row.bestBowling = { wickets: bw.wickets, runs: bw.runsConceded };
        }
      }
    }
  }

  const list = [...map.values()];
  for (const r of list) {
    r.points =
      r.runs * MOS_POINTS.run +
      r.wickets * MOS_POINTS.wicket +
      (r.catches + r.stumpings + r.runOuts) * MOS_POINTS.fielding +
      r.maidens * MOS_POINTS.maiden;
  }
  return list;
}

const economyOf = (r: PlayerTotals) =>
  r.legalBalls === 0 ? Infinity : (r.runsConceded * 6) / r.legalBalls;

/** Most wickets; ties go to the better economy, then fewer runs conceded. */
export function bestWicketTakers(totals: PlayerTotals[], limit = 5): PlayerTotals[] {
  return totals
    .filter((r) => r.wickets > 0)
    .sort(
      (a, b) =>
        b.wickets - a.wickets ||
        economyOf(a) - economyOf(b) ||
        a.runsConceded - b.runsConceded ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}

/** Highest points; ties go to more runs, then more wickets. */
export function manOfTheSeries(totals: PlayerTotals[], limit = 5): PlayerTotals[] {
  return totals
    .filter((r) => r.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.runs - a.runs ||
        b.wickets - a.wickets ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
}
