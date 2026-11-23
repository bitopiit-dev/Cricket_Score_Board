import { FIXTURES, type Fixture, type StageId } from '../data/fixtures';
import { fixtureStart } from './home';
import type { TournamentState } from './standings';

export type FixtureFilter = 'all' | 'groupA' | 'groupB' | 'superSix' | 'knockout';
export const FIXTURE_FILTERS: readonly FixtureFilter[] = [
  'all',
  'groupA',
  'groupB',
  'superSix',
  'knockout',
];
const KNOCKOUT: readonly StageId[] = ['semi1', 'semi2', 'final'];

export const matchesFilter = (fx: Fixture, filter: FixtureFilter) =>
  filter === 'all' || (filter === 'knockout' ? KNOCKOUT.includes(fx.stage) : fx.stage === filter);

/** How many of `pool` each stage filter would show, for the counts on the filter buttons. */
export function filterCounts(pool: readonly Fixture[]): Record<FixtureFilter, number> {
  return Object.fromEntries(
    FIXTURE_FILTERS.map((fl) => [fl, pool.filter((fx) => matchesFilter(fx, fl)).length]),
  ) as Record<FixtureFilter, number>;
}

/** Completed fixtures (results and no-results) out of the whole schedule. */
export function playedCount(ts: TournamentState, fixtures: readonly Fixture[] = FIXTURES): number {
  return fixtures.filter((fx) => ts.outcomes.get(fx.id)?.status === 'completed').length;
}

/** The final's date, for "Final on …". */
export function finalDate(fixtures: readonly Fixture[] = FIXTURES): string | undefined {
  return fixtures.find((fx) => fx.stage === 'final')?.date;
}

/** Lead time in which a match card counts down instead of showing the clock time. */
export const COUNTDOWN_MS = 6 * 60 * 60 * 1000;

/** Milliseconds until a scheduled fixture starts, while that is under COUNTDOWN_MS; otherwise null. */
export function msUntilStart(fx: Fixture, now: number): number | null {
  if (fx.postponed) return null;
  const ms = fixtureStart(fx) - now;
  return ms > 0 && ms <= COUNTDOWN_MS ? ms : null;
}

/** Number of matches per date in `list`, for the dots in the date strip. */
export function matchesPerDay(list: readonly Fixture[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const fx of list) out.set(fx.date, (out.get(fx.date) ?? 0) + 1);
  return out;
}
