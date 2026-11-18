import { isRestDay, type Fixture } from '../data/fixtures';
import { newId } from '../utils/id';
import type { FixtureOutcome } from './standings';
import { groupOf } from './groups';

/**
 * Fixture editing for the admin, as pure functions on a fixture list.
 * The list order is the display order; match numbers never change when the
 * order changes. Ids are stable so scored matches stay linked.
 */

export type FixturePatch = Partial<
  Pick<Fixture, 'no' | 'date' | 'time' | 'stage' | 'teamA' | 'teamB' | 'venue'>
>;

export type EditAction = 'schedule' | 'teams' | 'delete';

/**
 * How careful the admin must be:
 * - ok: just save
 * - confirm: a simple "are you sure?"
 * - warn: a yellow warning before saving
 * - strong: a red warning; type the match number to go ahead
 * - blocked: not allowed
 */
export type EditLevel = 'ok' | 'confirm' | 'warn' | 'strong' | 'blocked';

/** True once at least one ball has been recorded, or the match is finished. */
export function hasScore(outcome: FixtureOutcome | undefined): boolean {
  if (!outcome || outcome.status === 'scheduled') return false;
  return outcome.status === 'completed' || (outcome.match?.events.length ?? 0) > 0;
}

export function editLevel(outcome: FixtureOutcome | undefined, action: EditAction): EditLevel {
  const started = !!outcome && outcome.status !== 'scheduled';
  if (!started) return action === 'delete' ? 'confirm' : 'ok';
  if (action === 'schedule') return 'warn';
  if (action === 'delete' && hasScore(outcome)) return 'blocked';
  return 'strong';
}

export class FixtureEditError extends Error {
  constructor(public readonly code: 'notFound' | 'scored' | 'otherDay') {
    super(code);
  }
}

function indexOf(list: readonly Fixture[], id: string): number {
  const i = list.findIndex((f) => f.id === id);
  if (i < 0) throw new FixtureEditError('notFound');
  return i;
}

export function updateFixture(
  list: readonly Fixture[],
  id: string,
  patch: FixturePatch,
): Fixture[] {
  const i = indexOf(list, id);
  const next = [...list];
  next[i] = { ...list[i], ...patch, id: list[i].id };
  return next;
}

/**
 * Adds a match with a new stable id. Without `no` it gets the next free
 * match number. It is placed after `afterId`, or at the end.
 */
export function addFixture(
  list: readonly Fixture[],
  input: Omit<Fixture, 'id' | 'no'> & { no?: number },
  afterId?: string,
): { list: Fixture[]; fixture: Fixture } {
  const no = input.no ?? Math.max(0, ...list.map((f) => f.no)) + 1;
  // A random id: never reuses the id of a deleted fixture
  const fixture: Fixture = { ...input, no, id: `fx-${newId()}` };
  const at = afterId === undefined ? list.length : indexOf(list, afterId) + 1;
  return { list: [...list.slice(0, at), fixture, ...list.slice(at)], fixture };
}

/** Removes a match. A match with a score cannot be deleted. */
export function deleteFixture(
  list: readonly Fixture[],
  id: string,
  outcome: FixtureOutcome | undefined,
): Fixture[] {
  const i = indexOf(list, id);
  if (editLevel(outcome, 'delete') === 'blocked') throw new FixtureEditError('scored');
  return [...list.slice(0, i), ...list.slice(i + 1)];
}

/** Moves a match up (-1) or down (+1) in the list. Match numbers stay the same. */
export function moveFixture(list: readonly Fixture[], id: string, delta: -1 | 1): Fixture[] {
  const i = indexOf(list, id);
  const j = i + delta;
  if (j < 0 || j >= list.length) return [...list];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export type FixtureWarning =
  'badDate' | 'badTime' | 'sameTeam' | 'teamTwiceOnDay' | 'wrongGroup' | 'restDay' | 'duplicateNo';

/**
 * Things worth a second look before saving. They warn, they do not block:
 * the admin has the final say.
 */
export function validateFixture(fx: Fixture, list: readonly Fixture[]): FixtureWarning[] {
  const w: FixtureWarning[] = [];
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(fx.date) && !Number.isNaN(Date.parse(`${fx.date}T12:00:00Z`));
  if (!validDate) w.push('badDate');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(fx.time)) w.push('badTime');

  const teams = [fx.teamA, fx.teamB].flatMap((s) => (s.kind === 'team' ? [s.teamId] : []));
  if (teams.length === 2 && teams[0] === teams[1]) w.push('sameTeam');

  const others = list.filter((f) => f.id !== fx.id);
  const sameDay = others.filter((f) => f.date === fx.date);
  const busy = new Set(
    sameDay
      .flatMap((f) => [f.teamA, f.teamB])
      .flatMap((s) => (s.kind === 'team' ? [s.teamId] : [])),
  );
  if (teams.some((t) => busy.has(t))) w.push('teamTwiceOnDay');

  const group = fx.stage === 'groupA' ? 'A' : fx.stage === 'groupB' ? 'B' : null;
  // A team's group is where it plays its other group matches
  if (group && teams.some((t) => groupOf(t, others) !== group)) w.push('wrongGroup');

  if (validDate && isRestDay(fx.date)) w.push('restDay');
  if (others.some((f) => f.no === fx.no)) w.push('duplicateNo');
  return w;
}

/**
 * Puts one day's matches in time order. Only the places that day's matches
 * already hold are reused, so other days and match numbers stay where they are.
 */
function sortDay(list: readonly Fixture[], date: string): Fixture[] {
  const slots = list.flatMap((f, i) => (f.date === date ? [i] : []));
  // Array.prototype.sort is stable: equal times keep their order
  const ordered = slots.map((i) => list[i]).sort((a, b) => a.time.localeCompare(b.time));
  const next = [...list];
  slots.forEach((at, k) => (next[at] = ordered[k]));
  return next;
}

/** Moves one match to a new start time on the same day. */
export function changeFixtureTime(list: readonly Fixture[], id: string, time: string): Fixture[] {
  const fx = list[indexOf(list, id)];
  return sortDay(updateFixture(list, id, { time }), fx.date);
}

/**
 * Two matches on the same day trade start times (12:00 <-> 13:00).
 * Matches on different days cannot swap here.
 */
export function swapFixtureTimes(list: readonly Fixture[], idA: string, idB: string): Fixture[] {
  const a = list[indexOf(list, idA)];
  const b = list[indexOf(list, idB)];
  if (a.id === b.id) return [...list];
  if (a.date !== b.date) throw new FixtureEditError('otherDay');
  const swapped = updateFixture(updateFixture(list, a.id, { time: b.time }), b.id, {
    time: a.time,
  });
  return sortDay(swapped, a.date);
}

/** True when `next` differs from `prev` only in start times and order. */
export function onlyTimesChanged(prev: readonly Fixture[], next: readonly Fixture[]): boolean {
  if (prev.length !== next.length) return false;
  const byId = new Map(prev.map((f) => [f.id, f]));
  // Key order does not matter (the server compares JSON values the same way)
  const canon = (v: unknown): unknown =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canon((v as Record<string, unknown>)[k])]),
        )
      : v;
  const strip = (f: Fixture) => {
    const rest: Partial<Fixture> = { ...f };
    delete rest.time;
    return JSON.stringify(canon(rest));
  };
  return (
    new Set(next.map((f) => f.id)).size === next.length &&
    next.every((f) => {
      const old = byId.get(f.id);
      return !!old && strip(old) === strip(f);
    })
  );
}
