import { FIXTURES, type Fixture } from '../data/fixtures';
import { fixtureTeams, type TournamentState } from './standings';

/**
 * The fixtures a team plays in. Knockout slots ("Group A – 1st") count once the
 * standings decide who fills them, so Super Six and later matches appear only
 * after the team qualifies.
 */
export function teamFixtures(
  teamId: string,
  ts: TournamentState,
  fixtures: readonly Fixture[] = FIXTURES,
): Fixture[] {
  return fixtures.filter((fx) => fixtureTeams(fx, ts).includes(teamId));
}

export interface TeamRecord {
  played: number;
  won: number;
  lost: number;
  /** Ties and completed matches with no result. */
  tiedNr: number;
  /** The first match not completed yet, from `today` on. */
  next: Fixture | undefined;
  /** True while only group matches are known for the team. */
  onlyGroupSoFar: boolean;
}

/** Played, won, lost, tied or no result over the team's completed fixtures, and the next match. */
export function teamRecord(
  teamId: string,
  ts: TournamentState,
  today: string,
  fixtures: readonly Fixture[] = FIXTURES,
): TeamRecord {
  const mine = teamFixtures(teamId, ts, fixtures);
  let won = 0;
  let lost = 0;
  let tiedNr = 0;
  for (const fx of mine) {
    const o = ts.outcomes.get(fx.id);
    if (o?.status !== 'completed') continue;
    const r = o.result;
    if (!r || r.kind === 'tie' || !o.match) tiedNr++;
    else if (o.match.teams[r.winner]?.teamId === teamId) won++;
    else lost++;
  }
  return {
    played: won + lost + tiedNr,
    won,
    lost,
    tiedNr,
    next: mine.find((fx) => fx.date >= today && ts.outcomes.get(fx.id)?.status !== 'completed'),
    onlyGroupSoFar: mine.every((fx) => fx.stage === 'groupA' || fx.stage === 'groupB'),
  };
}
