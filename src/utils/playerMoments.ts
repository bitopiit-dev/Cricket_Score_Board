import { battingMilestone, isWicketHaul, manOfTheMatchId } from '../engine/milestones';
import type { Match, MatchState, TeamIndex } from '../engine/types';

export type MomentKind = 'mom' | 'hundred' | 'fifty' | 'haul';

export interface PlayerMoment {
  kind: MomentKind;
  playerId: string;
  team: TeamIndex;
  batting: { runs: number; balls: number; fours: number; sixes: number; out: boolean } | null;
  bowling: { wickets: number; runs: number; legalBalls: number; maidens: number } | null;
}

/** A player's figures across the main innings (super overs left out). */
function figures(state: MatchState, playerId: string) {
  let batting = null as PlayerMoment['batting'];
  let bowling = null as PlayerMoment['bowling'];
  for (const inn of state.innings) {
    if (inn.superOver) continue;
    const b = inn.batters.find((x) => x.playerId === playerId);
    if (b) {
      batting = {
        runs: (batting?.runs ?? 0) + b.runs,
        balls: (batting?.balls ?? 0) + b.balls,
        fours: (batting?.fours ?? 0) + b.fours,
        sixes: (batting?.sixes ?? 0) + b.sixes,
        out: (batting?.out ?? false) || !!b.dismissal,
      };
    }
    const w = inn.bowlers.find((x) => x.playerId === playerId);
    if (w && w.legalBalls > 0) {
      bowling = {
        wickets: (bowling?.wickets ?? 0) + w.wickets,
        runs: (bowling?.runs ?? 0) + w.runsConceded,
        legalBalls: (bowling?.legalBalls ?? 0) + w.legalBalls,
        maidens: (bowling?.maidens ?? 0) + w.maidens,
      };
    }
  }
  return { batting, bowling };
}

function teamOf(match: Match, playerId: string): TeamIndex | null {
  const i = match.teams.findIndex((t) => t.players.some((p) => p.id === playerId));
  return i === 0 || i === 1 ? i : null;
}

/**
 * The moments in a match worth a story card for one player: the Man of the
 * Match, then fifties/hundreds and 3+ wicket hauls. One card per player: the
 * Man of the Match card already shows their milestone.
 */
export function playerMoments(match: Match, state: MatchState): PlayerMoment[] {
  const out: PlayerMoment[] = [];
  const seen = new Set<string>();
  const add = (kind: MomentKind, playerId: string) => {
    if (seen.has(playerId)) return;
    const team = teamOf(match, playerId);
    if (team === null) return;
    seen.add(playerId);
    out.push({ kind, playerId, team, ...figures(state, playerId) });
  };
  const mom = manOfTheMatchId(match);
  if (mom) add('mom', mom);
  const ids = new Set(
    state.innings
      .filter((i) => !i.superOver)
      .flatMap((i) => [...i.batters.map((b) => b.playerId), ...i.bowlers.map((b) => b.playerId)]),
  );
  for (const id of ids) {
    const { batting, bowling } = figures(state, id);
    const m = batting ? battingMilestone(batting.runs) : null;
    if (m === 100) add('hundred', id);
    else if (m === 50) add('fifty', id);
    else if (bowling && isWicketHaul(bowling.wickets)) add('haul', id);
  }
  return out;
}

/** Which figure leads the card: wickets for a bowler's day, runs otherwise. */
export function leadsWithBowling(m: PlayerMoment): boolean {
  if (m.kind === 'haul') return true;
  if (m.kind !== 'mom') return false;
  if (!m.bowling) return false;
  if (!m.batting) return true;
  // 20 runs per wicket, the same weight the awards table uses
  return m.bowling.wickets * 20 > m.batting.runs;
}
