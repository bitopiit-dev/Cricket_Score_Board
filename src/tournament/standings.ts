import { FIXTURES, type Fixture, type Slot, type StageId } from '../data/fixtures';
import { TOURNAMENT_TEAMS } from '../data/teams';
import { BALLS_PER_OVER } from '../engine/rules';
import { deriveMatchState } from '../engine/scoring';
import type { InningsState, Match, MatchResult } from '../engine/types';
import { LEAGUE_POINTS, QUALIFIERS } from './format';

/**
 * Tournament progress worked out from the matches scored in the app:
 * each fixture's status, the points tables (with net run rate) and which
 * team fills each "Group A – 1st" style place.
 */

export type FixtureStatus = 'scheduled' | 'live' | 'completed';

export interface FixtureOutcome {
  status: FixtureStatus;
  /** The app match for this fixture, if one was started. */
  match?: Match;
  result?: MatchResult | null;
  /** Main-innings totals, in batting order. */
  innings?: { teamId: string; runs: number; wickets: number; legalBalls: number }[];
}

export interface TableRow {
  teamId: string;
  played: number;
  won: number;
  lost: number;
  /** Ties and no results. */
  tiedNr: number;
  points: number;
  runsFor: number;
  /** Balls faced for NRR (the full quota when all out). */
  ballsFaced: number;
  runsAgainst: number;
  ballsBowled: number;
  nrr: number;
}

export type LeagueStage = 'groupA' | 'groupB' | 'superSix';

export interface TournamentState {
  /** Keyed by fixture id. */
  outcomes: Map<string, FixtureOutcome>;
  tables: Record<LeagueStage, TableRow[]>;
  /** True when every fixture of the stage is completed. */
  complete: Record<StageId, boolean>;
  /** The team for a fixture side, or null while it is not known yet. */
  resolve: (slot: Slot) => string | null;
}

/** The app match that belongs to each fixture (a completed one wins, then the newest). */
export function matchesByFixture(matches: Match[]): Map<string, Match> {
  const map = new Map<string, Match>();
  for (const m of matches) {
    if (m.fixtureId === undefined) continue;
    const prev = map.get(m.fixtureId);
    if (!prev || rank(m) > rank(prev)) map.set(m.fixtureId, m);
  }
  return map;
}

const rank = (m: Match) => (deriveMatchState(m).phase === 'completed' ? 1e15 : 0) + m.updatedAt;

function outcomeOf(match: Match | undefined): FixtureOutcome {
  if (!match) return { status: 'scheduled' };
  const state = deriveMatchState(match);
  const innings = state.innings
    .filter((inn) => !inn.superOver)
    .map((inn) => ({
      teamId: match.teams[inn.battingTeam].teamId ?? '',
      runs: inn.runs,
      wickets: inn.wickets,
      legalBalls: inn.legalBalls,
    }));
  return {
    status: state.phase === 'completed' ? 'completed' : 'live',
    match,
    result: state.result,
    innings,
  };
}

/** Balls counted for net run rate: an all-out side is charged its full quota. */
export function nrrBalls(inn: Pick<InningsState, 'legalBalls' | 'endReason' | 'oversLimit'>) {
  return inn.endReason === 'allOut' ? inn.oversLimit * BALLS_PER_OVER : inn.legalBalls;
}

function emptyRow(teamId: string): TableRow {
  return {
    teamId,
    played: 0,
    won: 0,
    lost: 0,
    tiedNr: 0,
    points: 0,
    runsFor: 0,
    ballsFaced: 0,
    runsAgainst: 0,
    ballsBowled: 0,
    nrr: 0,
  };
}

/**
 * League table for one stage. Order: points, then net run rate, then wins,
 * then name. `teamIds` are the teams to list even before they have played.
 */
export function leagueTable(
  stage: LeagueStage,
  teamIds: string[],
  byFixture: Map<string, Match>,
  fixtures: readonly Fixture[] = FIXTURES,
): TableRow[] {
  const rows = new Map(teamIds.map((id) => [id, emptyRow(id)]));
  const row = (id: string) => {
    if (!rows.has(id)) rows.set(id, emptyRow(id));
    return rows.get(id)!;
  };

  for (const f of fixtures) {
    if (f.stage !== stage) continue;
    const m = byFixture.get(f.id);
    if (!m) continue;
    const state = deriveMatchState(m);
    if (state.phase !== 'completed' || !state.result) continue;
    const ids = m.teams.map((t) => t.teamId);
    if (!ids[0] || !ids[1]) continue;
    const [a, b] = [row(ids[0]), row(ids[1])];
    a.played += 1;
    b.played += 1;

    const r = state.result;
    if (r.kind === 'tie') {
      a.tiedNr += 1;
      b.tiedNr += 1;
      a.points += LEAGUE_POINTS.tie;
      b.points += LEAGUE_POINTS.tie;
    } else {
      const [w, l] = r.winner === 0 ? [a, b] : [b, a];
      w.won += 1;
      l.lost += 1;
      w.points += LEAGUE_POINTS.win;
      l.points += LEAGUE_POINTS.loss;
    }

    // Net run rate from the main innings only (super overs do not count)
    for (const inn of state.innings) {
      if (inn.superOver) continue;
      const bat = row(ids[inn.battingTeam]!);
      const bowl = row(ids[inn.bowlingTeam]!);
      const balls = nrrBalls(inn);
      bat.runsFor += inn.runs;
      bat.ballsFaced += balls;
      bowl.runsAgainst += inn.runs;
      bowl.ballsBowled += balls;
    }
  }

  const list = [...rows.values()];
  for (const r of list) {
    const forRate = r.ballsFaced ? (r.runsFor * BALLS_PER_OVER) / r.ballsFaced : 0;
    const againstRate = r.ballsBowled ? (r.runsAgainst * BALLS_PER_OVER) / r.ballsBowled : 0;
    r.nrr = forRate - againstRate;
  }
  const name = (id: string) => TOURNAMENT_TEAMS.find((t) => t.id === id)?.name ?? id;
  return list.sort(
    (x, y) =>
      y.points - x.points ||
      y.nrr - x.nrr ||
      y.won - x.won ||
      name(x.teamId).localeCompare(name(y.teamId)),
  );
}

export function tournamentState(
  matches: Match[],
  fixtures: readonly Fixture[] = FIXTURES,
): TournamentState {
  const byFixture = matchesByFixture(matches);
  const outcomes = new Map<string, FixtureOutcome>(
    fixtures.map((f) => [f.id, outcomeOf(byFixture.get(f.id))]),
  );
  const stageDone = (stage: StageId) =>
    fixtures
      .filter((f) => f.stage === stage)
      .every((f) => outcomes.get(f.id)!.status === 'completed');
  const complete = {
    groupA: stageDone('groupA'),
    groupB: stageDone('groupB'),
    superSix: stageDone('superSix'),
    semi1: stageDone('semi1'),
    semi2: stageDone('semi2'),
    final: stageDone('final'),
  };

  const group = (g: 'A' | 'B') => TOURNAMENT_TEAMS.filter((t) => t.group === g).map((t) => t.id);
  const groupA = leagueTable('groupA', group('A'), byFixture, fixtures);
  const groupB = leagueTable('groupB', group('B'), byFixture, fixtures);

  const resolveGroupPos = (g: 'A' | 'B', pos: number) => {
    const done = g === 'A' ? complete.groupA : complete.groupB;
    const table = g === 'A' ? groupA : groupB;
    return done && pos <= QUALIFIERS.group ? (table[pos - 1]?.teamId ?? null) : null;
  };
  const superSixTeams = [1, 2, 3].flatMap((pos) =>
    (['A', 'B'] as const).map((g) => resolveGroupPos(g, pos)),
  );
  const superSix = leagueTable(
    'superSix',
    superSixTeams.filter((x): x is string => x !== null),
    byFixture,
    fixtures,
  );

  const winnerOf = (stage: StageId): string | null => {
    const f = fixtures.find((x) => x.stage === stage);
    const o = f && outcomes.get(f.id);
    if (o?.status !== 'completed' || o.result?.kind !== 'won') return null;
    return o.match!.teams[o.result.winner].teamId ?? null;
  };

  const resolve = (slot: Slot): string | null => {
    switch (slot.kind) {
      case 'team':
        return slot.teamId;
      case 'groupPos':
        return resolveGroupPos(slot.group, slot.pos);
      case 'superSixPos':
        return complete.superSix && slot.pos <= QUALIFIERS.superSix
          ? (superSix[slot.pos - 1]?.teamId ?? null)
          : null;
      case 'winnerOf':
        return winnerOf(slot.of);
    }
  };

  return { outcomes, tables: { groupA, groupB, superSix }, complete, resolve };
}

/** Both sides of a fixture as team ids (null = not decided yet). */
export function fixtureTeams(f: Fixture, ts: TournamentState): [string | null, string | null] {
  return [ts.resolve(f.teamA), ts.resolve(f.teamB)];
}
