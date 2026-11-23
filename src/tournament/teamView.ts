import { FIXTURES, type Fixture } from '../data/fixtures';
import type { GroupId, TournamentTeam } from '../data/teams';
import { teamsOfGroup } from './groups';
import {
  fixtureTeams,
  type FixtureOutcome,
  type LeagueStage,
  type TableRow,
  type TournamentState,
} from './standings';

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
    next: mine.find(
      (fx) => fx.date >= today && !fx.postponed && ts.outcomes.get(fx.id)?.status !== 'completed',
    ),
    onlyGroupSoFar: mine.every((fx) => fx.stage === 'groupA' || fx.stage === 'groupB'),
  };
}

export type FormLetter = 'W' | 'L' | 'T';

export interface TeamResult {
  fixture: Fixture;
  opponentId: string | null;
  outcome: FormLetter;
  outcomeDetail: FixtureOutcome;
}

/** The team's completed fixtures, newest first, each with W / L / T for this team. */
export function teamResults(
  teamId: string,
  ts: TournamentState,
  fixtures: readonly Fixture[] = FIXTURES,
): TeamResult[] {
  const out: TeamResult[] = [];
  for (const fx of teamFixtures(teamId, ts, fixtures)) {
    const o = ts.outcomes.get(fx.id);
    if (o?.status !== 'completed') continue;
    const [a, b] = fixtureTeams(fx, ts);
    const r = o.result;
    const outcome: FormLetter =
      !r || r.kind === 'tie' || !o.match
        ? 'T'
        : o.match.teams[r.winner]?.teamId === teamId
          ? 'W'
          : 'L';
    out.push({ fixture: fx, opponentId: a === teamId ? b : a, outcome, outcomeDetail: o });
  }
  return out.sort((x, y) => fixtureKey(y.fixture).localeCompare(fixtureKey(x.fixture)));
}

const fixtureKey = (f: Fixture) => `${f.date} ${f.time}`;

/** The team's fixture being played right now, if any. */
export function teamLiveFixture(
  teamId: string,
  ts: TournamentState,
  fixtures: readonly Fixture[] = FIXTURES,
): Fixture | undefined {
  return teamFixtures(teamId, ts, fixtures).find((fx) => ts.outcomes.get(fx.id)?.status === 'live');
}

/** Where the team stands: its league table (Super Six once it's there) and its place. */
export function teamStanding(
  teamId: string,
  ts: TournamentState,
): { stage: LeagueStage; position: number; row: TableRow } | null {
  for (const stage of ['superSix', 'groupA', 'groupB'] as const) {
    const i = ts.tables[stage].findIndex((r) => r.teamId === teamId);
    if (i >= 0) return { stage, position: i + 1, row: ts.tables[stage][i] };
  }
  return null;
}

export interface GroupCard {
  team: TournamentTeam;
  /** The team's row in the group table, once the group has started. */
  row?: TableRow;
  /** 1-based place in the group, once the group has started. */
  position?: number;
}

/**
 * The teams of a group for the Teams tab. Once a group match has been played
 * the teams follow the points table (1st first) and carry their row and place;
 * before that they keep the team-list order with no place, so nobody looks
 * ranked by accident.
 */
export function groupCards(
  group: GroupId,
  rows: readonly TableRow[] | undefined,
  fixtures: readonly Fixture[] = FIXTURES,
): GroupCard[] {
  const teams = teamsOfGroup(group, fixtures);
  if (!rows?.some((r) => r.played > 0)) return teams.map((team) => ({ team }));
  const ranked: GroupCard[] = [];
  rows.forEach((row) => {
    const team = teams.find((t) => t.id === row.teamId);
    if (team) ranked.push({ team, row, position: ranked.length + 1 });
  });
  // A team missing from the table (e.g. a half-edited list) still gets a card
  for (const team of teams) {
    if (!ranked.some((c) => c.team.id === team.id)) ranked.push({ team });
  }
  return ranked;
}
