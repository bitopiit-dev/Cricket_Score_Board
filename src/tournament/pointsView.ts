import { FIXTURES, isPostponed, type Fixture } from '../data/fixtures';
import { LEAGUE_POINTS, QUALIFIERS } from './format';
import type { LeagueStage, TableRow, TournamentState } from './standings';
import {
  teamFixtures,
  teamLiveFixture,
  teamRecord,
  teamResults,
  type FormLetter,
} from './teamView';

export interface PointsRowView {
  row: TableRow;
  /** Results in this stage, oldest first. */
  form: FormLetter[];
  /** How many matches the team plays in this stage (form boxes to draw). */
  slots: number;
  /** Points now plus a win in every match of this stage still to play. */
  maxPoints: number;
  /** The team's match being played right now. */
  live?: Fixture;
  /** The team's next match when nothing is live. */
  next?: Fixture;
}

/** One league table with each team's form, most points still possible and next match. */
export function pointsRows(
  stage: LeagueStage,
  ts: TournamentState,
  today: string,
  fixtures: readonly Fixture[] = FIXTURES,
): PointsRowView[] {
  return ts.tables[stage].map((row) => {
    const mine = teamFixtures(row.teamId, ts, fixtures).filter((fx) => fx.stage === stage);
    const form = teamResults(row.teamId, ts, fixtures)
      .filter((r) => r.fixture.stage === stage)
      .map((r) => r.outcome)
      .reverse();
    const done = mine.filter((fx) => ts.outcomes.get(fx.id)?.status === 'completed').length;
    const live = teamLiveFixture(row.teamId, ts, fixtures);
    return {
      row,
      form,
      slots: Math.max(mine.length, form.length),
      maxPoints: row.points + LEAGUE_POINTS.win * Math.max(0, mine.length - done),
      live,
      next: live ? undefined : teamRecord(row.teamId, ts, today, fixtures).next,
    };
  });
}

/** Completed matches of a stage out of all its matches. */
export function stageProgress(
  stage: LeagueStage,
  ts: TournamentState,
  fixtures: readonly Fixture[] = FIXTURES,
): { played: number; total: number } {
  const all = fixtures.filter((fx) => fx.stage === stage);
  return {
    played: all.filter((fx) => ts.outcomes.get(fx.id)?.status === 'completed').length,
    total: all.length,
  };
}

/** League matches (groups or Super Six) on `today`, in start order; postponed ones left out. */
export function todaysLeagueFixtures(
  today: string,
  fixtures: readonly Fixture[] = FIXTURES,
): Fixture[] {
  return fixtures
    .filter(
      (fx) =>
        fx.date === today &&
        !isPostponed(fx) &&
        (fx.stage === 'groupA' || fx.stage === 'groupB' || fx.stage === 'superSix'),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
}

/** A team's place in its league table, 1-based, once the table has a played match. */
export function placeIn(stage: LeagueStage, teamId: string, ts: TournamentState) {
  const rows = ts.tables[stage];
  if (!rows.some((r) => r.played > 0)) return undefined;
  const i = rows.findIndex((r) => r.teamId === teamId);
  return i >= 0 ? i + 1 : undefined;
}

export interface SuperSixPick {
  group: 'A' | 'B';
  position: number;
  teamId: string;
}

/**
 * The Super Six if the groups ended now: the top three of each group. Only
 * while the Super Six has not been decided and both groups have started, so
 * nobody looks qualified from the fixture order alone.
 */
export function projectedSuperSix(ts: TournamentState): SuperSixPick[] | null {
  if (ts.tables.superSix.length > 0) return null;
  const { groupA, groupB } = ts.tables;
  if (![groupA, groupB].every((rows) => rows.some((r) => r.played > 0))) return null;
  return (
    [
      ['A', groupA],
      ['B', groupB],
    ] as const
  ).flatMap(([group, rows]) =>
    rows.slice(0, QUALIFIERS.group).map((r, i) => ({ group, position: i + 1, teamId: r.teamId })),
  );
}
