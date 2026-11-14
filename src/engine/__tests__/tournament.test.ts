import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from './helpers';
import { DEFAULT_SETTINGS, TOURNAMENT_RULES, allowedDismissals, maxWickets } from '../rules';

const tournament = () =>
  makeMatch(TOURNAMENT_RULES.playersPerSide, {
    overs: TOURNAMENT_RULES.overs,
    sixOut: TOURNAMENT_RULES.sixOut,
    shortPitch: TOURNAMENT_RULES.shortPitch,
    maxOversPerBowler: TOURNAMENT_RULES.maxOversPerBowler,
    freeHit: !TOURNAMENT_RULES.noFreeHit,
  });

const sixOut = (g: Game) => g.ball(0, { wicket: { kind: 'sixOut', batterId: g.inn.strikerId! } });

describe('defaults', () => {
  it('new matches default to 12 overs and a 3-over bowling quota', () => {
    expect(DEFAULT_SETTINGS.overs).toBe(12);
    expect(DEFAULT_SETTINGS.maxOversPerBowler).toBe(3);
    expect(DEFAULT_SETTINGS.sixOut).toBe(false);
  });

  it('there is no free hit: the ball after a no-ball is a normal delivery', () => {
    expect(DEFAULT_SETTINGS.freeHit).toBe(false);
    expect(TOURNAMENT_RULES.noFreeHit).toBe(true);
    const g = new Game(tournament()).start('a1', 'a2', 'b1').noBall();
    expect(g.inn.freeHitNext).toBe(false);
    g.out('bowled');
    expect(g.inn.wickets).toBe(1);
  });

  it('11 players means 10 wickets end the innings', () => {
    const m = tournament();
    expect(maxWickets(m.teams[0], m.settings)).toBe(10);
  });
});

describe('six out', () => {
  it('dismisses the striker: no runs, legal ball, wicket to the bowler', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1').ball(1); // a2 on strike
    sixOut(g);
    const inn = g.inn;
    expect(inn.runs).toBe(1);
    expect(inn.wickets).toBe(1);
    expect(inn.legalBalls).toBe(2);
    const a2 = inn.batters.find((b) => b.playerId === 'a2')!;
    expect(a2).toMatchObject({ runs: 0, balls: 1, sixes: 0 });
    expect(a2.dismissal).toEqual({ kind: 'sixOut', bowlerId: 'b1', fielderId: undefined });
    const b1 = inn.bowlers.find((b) => b.playerId === 'b1')!;
    expect(b1).toMatchObject({ wickets: 1, runsConceded: 1, legalBalls: 2 });
    expect(inn.fallOfWickets[0]).toMatchObject({ wicketNumber: 1, score: 1, batterId: 'a2' });
    expect(g.state.phase).toBe('needBatter');
    g.batter('a3');
    expect(g.inn.strikerId).toBe('a3'); // new batter faces
  });

  it('counts towards the over (6th ball ends it) and a maiden', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1').balls(0, 0, 0, 0, 0);
    sixOut(g).batter('a3');
    expect(g.inn.legalBalls).toBe(6);
    expect(g.state.phase).toBe('needBowler');
    expect(g.inn.bowlers[0].maidens).toBe(1);
  });

  it('applies on a free hit too, when a match uses free hits', () => {
    const m = tournament();
    m.settings.freeHit = true;
    const g = new Game(m).start('a1', 'a2', 'b1').noBall();
    expect(g.inn.freeHitNext).toBe(true);
    sixOut(g);
    expect(g.inn.wickets).toBe(1);
  });

  it('is not possible on a wide, no-ball, bye or leg-bye', () => {
    for (const extra of ['wide', 'noBall', 'bye', 'legBye'] as const) {
      expect(allowedDismissals(extra, false, true)).not.toContain('sixOut');
    }
  });

  it('is rejected when the rule is off', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    expect(
      g.tryDo({ type: 'ball', runs: 0, extra: null, wicket: { kind: 'sixOut', batterId: 'a1' } }),
    ).toBe('dismissalNotAllowed');
  });

  it('adds no runs: runs on a six-out ball are rejected', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1');
    expect(
      g.tryDo({ type: 'ball', runs: 6, extra: null, wicket: { kind: 'sixOut', batterId: 'a1' } }),
    ).toBe('invalidRuns');
  });

  it('a six cannot be scored while the rule is on (a four still can)', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1');
    expect(g.tryDo({ type: 'ball', runs: 6, extra: null, boundary: true })).toBe('invalidBoundary');
    expect(g.tryDo({ type: 'ball', runs: 6, extra: 'noBall', boundary: true })).toBe(
      'invalidBoundary',
    );
    expect(g.tryDo({ type: 'ball', runs: 4, extra: null, boundary: true })).toBeNull();
  });

  it('only the striker can be six out', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1');
    expect(
      g.tryDo({ type: 'ball', runs: 0, extra: null, wicket: { kind: 'sixOut', batterId: 'a2' } }),
    ).toBe('batterNotAtCrease');
  });

  it('undo restores the batter', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1');
    sixOut(g).undo();
    expect(g.inn.wickets).toBe(0);
    expect(g.inn.strikerId).toBe('a1');
    expect(g.inn.batters[0].dismissal).toBeNull();
  });

  it('10 six-outs end the innings', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1');
    const nextBowler = () => {
      if (g.state.phase === 'needBowler')
        g.bowler(g.inn.previousOverBowlerId === 'b1' ? 'b2' : 'b1');
    };
    for (let i = 3; i <= 11; i++) {
      sixOut(g).batter(`a${i}`);
      nextBowler();
    }
    expect(g.inn.wickets).toBe(9);
    sixOut(g);
    expect(g.inn.endReason).toBe('allOut');
    expect(g.inn.wickets).toBe(10);
  });
});

describe('tournament bowling quota', () => {
  it('a bowler cannot bowl a 4th over', () => {
    const g = new Game(tournament()).start('a1', 'a2', 'b1');
    const over = () => g.balls(0, 0, 0, 0, 0, 0);
    over().bowler('b2');
    over().bowler('b1');
    over().bowler('b2');
    over().bowler('b1');
    over().bowler('b2');
    over(); // b1 and b2 have bowled 3 overs each
    expect(g.tryDo({ type: 'newBowler', bowlerId: 'b1' })).toBe('bowlerNotEligible');
    expect(g.tryDo({ type: 'newBowler', bowlerId: 'b3' })).toBeNull();
  });
});
