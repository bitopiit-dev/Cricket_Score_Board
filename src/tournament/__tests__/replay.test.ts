import { describe, expect, it } from 'vitest';
import { FIXTURES, isCalledOff, isVoidMatch, type Fixture } from '../../data/fixtures';
import { findTeam } from '../../data/teams';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import { deriveMatchState } from '../../engine/scoring';
import type { Match } from '../../engine/types';
import { isTournamentMatch, playerTotals } from '../awards';
import { replayAbandoned, setAbandoned } from '../fixtureEdit';
import { pickHero, postponedFixtures } from '../home';
import { tournamentState } from '../standings';

// Match 2: MCD Super Stars v Quality Flying Fighter (Group A)
const F2 = FIXTURES.find((f) => f.no === 2)!;
const SIDES = [F2.teamA, F2.teamB].map((s) => (s.kind === 'team' ? s.teamId : '')) as [
  string,
  string,
];

/** A 1-over match for fixture 2. `chase` = false stops at the innings break (rain). */
function play(id: string, first: number, chase: number | false, updatedAt: number): Match {
  const m = makeMatch(11, { overs: 1 });
  m.id = id;
  m.updatedAt = updatedAt;
  m.fixtureId = F2.id;
  SIDES.forEach((t, i) => {
    m.teams[i].teamId = t;
    m.teams[i].name = findTeam(t)!.name;
  });
  const g = new Game(m);
  g.start('a1', 'a2', 'b1');
  for (let i = 0; i < 6; i++) g.ball(i < first ? 1 : 0);
  if (chase !== false) {
    g.start('b1', 'b2', 'a1');
    for (let i = 0; i < 6 && g.state.phase !== 'completed'; i++) g.ball(i < chase ? 1 : 0);
  }
  return { ...g.match, updatedAt };
}

const row = (ts: ReturnType<typeof tournamentState>, team: string) =>
  ts.tables.groupA.find((r) => r.teamId === team)!;

/** Runs `fn` with FIXTURES (the live list the app reads) swapped for `list`. */
function withFixtures<T>(list: Fixture[], fn: () => T): T {
  const saved = [...FIXTURES];
  const live = FIXTURES as Fixture[];
  live.splice(0, live.length, ...list);
  try {
    return fn();
  } finally {
    live.splice(0, live.length, ...saved);
  }
}

describe('replaying an abandoned match', () => {
  // Rain after the first innings: 6 runs, the chase never started
  const rained = play('rain', 6, false, 1);
  const abandoned = setAbandoned(FIXTURES, F2.id, true);
  const replay = replayAbandoned(abandoned, F2.id, [rained.id]);

  it('before: both teams have a no result, 1 point each', () => {
    expect(deriveMatchState(rained).phase).not.toBe('completed');
    const ts = tournamentState([rained], abandoned);
    for (const team of SIDES) expect(row(ts, team)).toMatchObject({ played: 1, points: 1 });
  });

  it('takes the points back and waits for a new date', () => {
    const fx = replay.find((f) => f.id === F2.id)!;
    expect(fx).toMatchObject({ postponed: true, voidMatchIds: ['rain'] });
    expect(fx.abandoned).toBeUndefined();

    const ts = tournamentState([rained], replay);
    for (const team of SIDES) {
      expect(row(ts, team)).toMatchObject({ played: 0, tiedNr: 0, points: 0, runsFor: 0 });
    }
    // Not live with the old first innings: a fresh match still to be played
    expect(ts.outcomes.get(F2.id)).toEqual({ status: 'scheduled' });
    expect(postponedFixtures(ts, replay).map((f) => f.id)).toEqual([F2.id]);
  });

  it('the old part-match is no longer live anywhere', () => {
    const ts = tournamentState([rained], replay);
    const hero = pickHero([rained], ts, Date.parse('2026-11-17T14:00:00+06:00'), replay);
    expect(hero.kind).not.toBe('live');
    withFixtures(replay, () => {
      expect(isVoidMatch(rained)).toBe(true);
      expect(isCalledOff(rained)).toBe(true);
      expect(isTournamentMatch(rained)).toBe(false);
    });
  });

  it('the replay counts like any match once it is played', () => {
    // Replayed: side A 4, side B chases 5 off the over and wins
    const again = play('again', 4, 5, 2);
    const ts = tournamentState([rained, again], replay);
    expect(ts.outcomes.get(F2.id)).toMatchObject({ status: 'completed', match: { id: 'again' } });
    expect(row(ts, SIDES[1])).toMatchObject({ played: 1, won: 1, points: 2 });
    expect(row(ts, SIDES[0])).toMatchObject({ played: 1, lost: 1, points: 0 });
    // Player stats come from the replay only
    withFixtures(replay, () => {
      const totals = playerTotals([rained, again]);
      const runs = totals.reduce((s, r) => s + r.runs, 0);
      expect(runs).toBe(4 + 5);
    });
  });

  it('a second rain-off and replay keeps both old matches set aside', () => {
    const twice = replayAbandoned(setAbandoned(replay, F2.id, true), F2.id, ['rain', 'again']);
    expect(twice.find((f) => f.id === F2.id)?.voidMatchIds).toEqual(['rain', 'again']);
  });

  it('a match with no score just loses the no result', () => {
    const fx = replayAbandoned(abandoned, F2.id, []).find((f) => f.id === F2.id)!;
    expect(fx.voidMatchIds).toBeUndefined();
    expect(fx).toMatchObject({ postponed: true });
  });
});
