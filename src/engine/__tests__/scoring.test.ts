import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from './helpers';
import { availableBatters, bowlerEligibility, formatOvers } from '../rules';
import { requiredRunRate, runsNeeded } from '../stats';

const bat = (g: Game, id: string) => g.inn.batters.find((b) => b.playerId === id)!;
const bowl = (g: Game, id: string) => g.inn.bowlers.find((b) => b.playerId === id)!;

describe('setup', () => {
  it('needs openers before anything else', () => {
    const g = new Game(makeMatch());
    expect(g.state.phase).toBe('needOpeners');
    expect(g.tryDo({ type: 'ball', runs: 1, extra: null })).toBe('wrongPhase');
  });

  it('team that wins the toss and bats goes first', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    expect(g.inn.battingTeam).toBe(0);
    expect(g.state.phase).toBe('inPlay');
  });

  it('team that wins the toss and bowls fields first', () => {
    const m = makeMatch();
    m.toss = { winner: 0, decision: 'bowl' };
    const g = new Game(m);
    expect(
      g.tryDo({ type: 'inningsStart', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' }),
    ).toBe('notInTeam');
    g.start('b1', 'b2', 'a1');
    expect(g.inn.battingTeam).toBe(1);
  });

  it('rejects the same opener twice', () => {
    const g = new Game(makeMatch());
    expect(
      g.tryDo({ type: 'inningsStart', strikerId: 'a1', nonStrikerId: 'a1', bowlerId: 'b1' }),
    ).toBe('samePlayer');
  });
});

describe('runs and strike', () => {
  it('credits runs to batter, team and bowler', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').balls(4, 0, 2);
    expect(g.inn.runs).toBe(6);
    expect(g.inn.legalBalls).toBe(3);
    expect(bat(g, 'a1')).toMatchObject({ runs: 6, balls: 3, fours: 1 });
    expect(bowl(g, 'b1')).toMatchObject({ runsConceded: 6, legalBalls: 3, dots: 1 });
  });

  it('rotates strike on odd runs', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(1);
    expect(g.inn.strikerId).toBe('a2');
    g.ball(3);
    expect(g.inn.strikerId).toBe('a1');
    g.ball(2);
    expect(g.inn.strikerId).toBe('a1');
  });

  it('counts a four only when marked as a boundary', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(4).ball(6, { boundary: true });
    expect(bat(g, 'a1')).toMatchObject({ runs: 10, fours: 0, sixes: 1 });
  });

  it('rejects a boundary flag on non-boundary runs', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    expect(g.tryDo({ type: 'ball', runs: 3, extra: null, boundary: true })).toBe('invalidBoundary');
  });
});

describe('extras', () => {
  it('wide: penalty run, not a legal ball, not faced by batter', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').wide();
    expect(g.inn.runs).toBe(1);
    expect(g.inn.legalBalls).toBe(0);
    expect(g.inn.extras.wides).toBe(1);
    expect(bat(g, 'a1').balls).toBe(0);
    expect(bowl(g, 'b1')).toMatchObject({ runsConceded: 1, wides: 1, legalBalls: 0 });
  });

  it('wide with runs run: all wides, strike rotates on odd runs', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').wide(1);
    expect(g.inn.runs).toBe(2);
    expect(g.inn.extras.wides).toBe(2);
    expect(g.inn.strikerId).toBe('a2');
  });

  it('no-ball: penalty plus bat runs, ball faced, not legal', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').noBall(4);
    expect(g.inn.runs).toBe(5);
    expect(g.inn.legalBalls).toBe(0);
    expect(g.inn.extras.noBalls).toBe(1);
    expect(bat(g, 'a1')).toMatchObject({ runs: 4, balls: 1 });
    expect(bowl(g, 'b1')).toMatchObject({ runsConceded: 5, noBalls: 1 });
  });

  it('custom wide / no-ball penalty runs from settings', () => {
    const g = new Game(makeMatch(11, { wideRuns: 2, noBallRuns: 2 })).start('a1', 'a2', 'b1');
    g.wide().noBall();
    expect(g.inn.runs).toBe(4);
  });

  it('byes and leg-byes: team runs, not batter or bowler, legal ball', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.ball(2, { extra: 'bye' }).ball(1, { extra: 'legBye' });
    expect(g.inn.runs).toBe(3);
    expect(g.inn.legalBalls).toBe(2);
    expect(g.inn.extras).toMatchObject({ byes: 2, legByes: 1 });
    expect(bat(g, 'a1')).toMatchObject({ runs: 0, balls: 2 });
    expect(bowl(g, 'b1')).toMatchObject({ runsConceded: 0, dots: 2 });
    expect(g.inn.strikerId).toBe('a2');
  });
});

describe('free hit', () => {
  it('follows a no-ball, survives a wide, clears after a legal ball', () => {
    const g = new Game(makeMatch(11, { freeHit: true })).start('a1', 'a2', 'b1').noBall();
    expect(g.inn.freeHitNext).toBe(true);
    g.wide();
    expect(g.inn.freeHitNext).toBe(true);
    g.ball(0);
    expect(g.inn.freeHitNext).toBe(false);
  });

  it('only run out is allowed on a free hit', () => {
    const g = new Game(makeMatch(11, { freeHit: true })).start('a1', 'a2', 'b1').noBall();
    expect(
      g.tryDo({ type: 'ball', runs: 0, extra: null, wicket: { kind: 'bowled', batterId: 'a1' } }),
    ).toBe('dismissalNotAllowed');
    expect(
      g.tryDo({ type: 'ball', runs: 0, extra: null, wicket: { kind: 'runOut', batterId: 'a2' } }),
    ).toBeNull();
  });

  it('can be turned off', () => {
    const g = new Game(makeMatch(11, { freeHit: false })).start('a1', 'a2', 'b1').noBall();
    expect(g.inn.freeHitNext).toBe(false);
  });
});

describe('overs and bowlers', () => {
  it('ends the over after 6 legal balls, swaps ends, needs a new bowler', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').balls(0, 0, 0).wide().balls(0, 0, 0);
    expect(g.inn.legalBalls).toBe(6);
    expect(formatOvers(g.inn.legalBalls)).toBe('1.0');
    expect(g.state.phase).toBe('needBowler');
    expect(g.inn.strikerId).toBe('a2');
    expect(g.inn.overs[0].balls).toHaveLength(7);
  });

  it('records a maiden only when the bowler concedes nothing', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0).ball(1, { extra: 'legBye' });
    expect(bowl(g, 'b1').maidens).toBe(1);
    g.bowler('b2').balls(0, 0, 0, 0, 0).wide().ball(0);
    expect(bowl(g, 'b2').maidens).toBe(0);
  });

  it('the same bowler cannot bowl consecutive overs', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').balls(0, 0, 0, 0, 0, 0);
    expect(g.tryDo({ type: 'newBowler', bowlerId: 'b1' })).toBe('bowlerNotEligible');
    g.bowler('b2');
    expect(g.inn.overs).toHaveLength(2);
    expect(g.inn.overs[1].bowlerId).toBe('b2');
  });

  it('enforces the bowling quota', () => {
    const g = new Game(makeMatch(11, { overs: 5, maxOversPerBowler: 1 })).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0, 0).bowler('b2').balls(0, 0, 0, 0, 0, 0);
    const elig = bowlerEligibility(g.inn, g.match.teams[1], g.match.settings);
    expect(elig.find((e) => e.playerId === 'b1')!.blocked).toBe('quotaUsed');
    expect(elig.find((e) => e.playerId === 'b2')!.blocked).toBe('previousOver');
    expect(g.tryDo({ type: 'newBowler', bowlerId: 'b1' })).toBe('bowlerNotEligible');
  });

  it('allows a mid-over bowler change', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').balls(0, 0);
    g.bowler('b2').balls(0, 0, 0, 0);
    expect(bowl(g, 'b1').legalBalls).toBe(2);
    expect(bowl(g, 'b2').legalBalls).toBe(4);
    expect(bowl(g, 'b2').maidens).toBe(0);
    expect(g.inn.overs).toHaveLength(1);
  });

  it('lifts the quota when it would leave nobody able to bowl', () => {
    // 2 players per side, quota 1 over: after b1 and b2 bowl one each, b1 must still be allowed.
    const g = new Game(makeMatch(2, { overs: 5, maxOversPerBowler: 1 })).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0, 0).bowler('b2').balls(0, 0, 0, 0, 0, 0);
    expect(g.tryDo({ type: 'newBowler', bowlerId: 'b1' })).toBeNull();
  });
});

describe('wickets', () => {
  it('bowled: wicket to bowler, new batter takes strike', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(2).out('bowled');
    expect(g.inn.wickets).toBe(1);
    expect(bowl(g, 'b1').wickets).toBe(1);
    expect(bat(g, 'a1').dismissal).toMatchObject({ kind: 'bowled', bowlerId: 'b1' });
    expect(g.inn.fallOfWickets[0]).toMatchObject({ wicketNumber: 1, score: 2, legalBalls: 2 });
    expect(g.state.phase).toBe('needBatter');
    g.batter('a3');
    expect(g.inn.strikerId).toBe('a3');
    expect(g.inn.nonStrikerId).toBe('a2');
  });

  it('caught records the fielder', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.ball(0, { wicket: { kind: 'caught', batterId: 'a1', fielderId: 'b5' } });
    expect(bat(g, 'a1').dismissal).toMatchObject({
      kind: 'caught',
      bowlerId: 'b1',
      fielderId: 'b5',
    });
  });

  it('run out is not credited to the bowler', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').out('runOut', 'a2');
    expect(bowl(g, 'b1').wickets).toBe(0);
    expect(bat(g, 'a2').dismissal?.bowlerId).toBeUndefined();
  });

  it('run out of the non-striker after completing a run', () => {
    // a1 on strike, they run 1 (cross), then a1 is run out at the far end going for the 2nd.
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').out('runOut', 'a1', 1);
    expect(g.inn.runs).toBe(1);
    expect(bat(g, 'a1').runs).toBe(1);
    // after the run a2 is on strike; a1's slot (non-striker) is vacant
    expect(g.inn.strikerId).toBe('a2');
    expect(g.inn.nonStrikerId).toBeNull();
    g.batter('a3');
    expect(g.inn.nonStrikerId).toBe('a3');
  });

  it('wicket on the last ball of the over: new batter at the non-striker end', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').balls(0, 0, 0, 0, 0).out('bowled');
    expect(g.state.phase).toBe('needBatter');
    g.batter('a3');
    expect(g.state.phase).toBe('needBowler');
    expect(g.inn.strikerId).toBe('a2');
    expect(g.inn.nonStrikerId).toBe('a3');
  });

  it('only run out / stumped on a wide, only run out on a no-ball', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    expect(
      g.tryDo({
        type: 'ball',
        runs: 0,
        extra: 'noBall',
        wicket: { kind: 'caught', batterId: 'a1' },
      }),
    ).toBe('dismissalNotAllowed');
    g.ball(0, { extra: 'wide', wicket: { kind: 'stumped', batterId: 'a1' } });
    expect(g.inn.runs).toBe(1);
    expect(g.inn.wickets).toBe(1);
    expect(bowl(g, 'b1').wickets).toBe(1);
  });

  it('non-striker cannot be bowled', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    expect(
      g.tryDo({ type: 'ball', runs: 0, extra: null, wicket: { kind: 'bowled', batterId: 'a2' } }),
    ).toBe('batterNotAtCrease');
  });

  it('new batter must be someone who has not batted', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').out('bowled');
    expect(g.tryDo({ type: 'newBatter', batterId: 'a1' })).toBe('batterNotAvailable');
    expect(g.tryDo({ type: 'newBatter', batterId: 'a2' })).toBe('batterNotAvailable');
  });

  it('tracks partnerships', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').balls(1, 2).wide().out('bowled');
    g.batter('a3').ball(3);
    expect(g.inn.partnerships).toHaveLength(2);
    expect(g.inn.partnerships[0]).toMatchObject({ runs: 4, legalBalls: 3, ended: true });
    expect(g.inn.partnerships[1]).toMatchObject({ batterIds: ['a3', 'a1'], runs: 3, ended: false });
  });
});

describe('retirements', () => {
  it('retired hurt is not a wicket and the batter can return', () => {
    const g = new Game(makeMatch(3)).start('a1', 'a2', 'b1').ball(2);
    g.do({ type: 'retire', batterId: 'a1', kind: 'retiredHurt' });
    expect(g.inn.wickets).toBe(0);
    expect(g.state.phase).toBe('needBatter');
    g.batter('a3').out('bowled');
    expect(availableBatters(g.inn, g.match.teams[0])).toEqual(['a1']);
    g.batter('a1');
    expect(bat(g, 'a1')).toMatchObject({ runs: 2, retiredHurt: false });
  });

  it('retired out counts as a wicket', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.do({ type: 'retire', batterId: 'a2', kind: 'retiredOut' });
    expect(g.inn.wickets).toBe(1);
    expect(bowl(g, 'b1').wickets).toBe(0);
  });
});

describe('innings end', () => {
  it('all out at n-1 wickets', () => {
    const g = new Game(makeMatch(3))
      .start('a1', 'a2', 'b1')
      .out('bowled')
      .batter('a3')
      .out('bowled');
    expect(g.inn.ended).toBe(true);
    expect(g.inn.endReason).toBe('allOut');
    expect(g.state.phase).toBe('inningsBreak');
  });

  it('last man stands: survivor bats alone and keeps strike', () => {
    const g = new Game(makeMatch(3, { lastManStands: true })).start('a1', 'a2', 'b1');
    g.out('bowled').batter('a3').out('bowled');
    expect(g.inn.ended).toBe(false);
    expect(g.inn.loneBatter).toBe(true);
    expect(g.inn.strikerId).toBe('a2');
    expect(g.state.phase).toBe('inPlay');
    g.ball(1);
    expect(g.inn.strikerId).toBe('a2');
    g.balls(0, 0, 0); // over ends (6 legal balls) — still on strike
    expect(g.inn.strikerId).toBe('a2');
    g.bowler('b2').out('bowled');
    expect(g.inn.endReason).toBe('allOut');
  });

  it('overs complete', () => {
    const g = new Game(makeMatch(11, { overs: 1 })).start('a1', 'a2', 'b1').balls(1, 1, 1, 1, 1, 1);
    expect(g.inn.endReason).toBe('oversComplete');
    expect(g.state.phase).toBe('inningsBreak');
    expect(g.tryDo({ type: 'ball', runs: 1, extra: null })).toBe('wrongPhase');
  });

  it('manual end', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(1).do({ type: 'endInnings' });
    expect(g.inn.endReason).toBe('manual');
  });
});

describe('second innings and result', () => {
  const firstInnings = (overs = 1) =>
    new Game(makeMatch(11, { overs })).start('a1', 'a2', 'b1').balls(4, 4, 0, 0, 1, 1); // 10 runs

  it('sets the target and chasing info', () => {
    const g = firstInnings().start('b1', 'b2', 'a1');
    expect(g.inn.index).toBe(1);
    expect(g.inn.battingTeam).toBe(1);
    expect(g.inn.target).toBe(11);
    g.ball(2);
    expect(runsNeeded(g.inn)).toBe(9);
    expect(requiredRunRate(g.inn)).toBeCloseTo(10.8);
  });

  it('chasing team wins by wickets when target is reached', () => {
    const g = firstInnings().start('b1', 'b2', 'a1').out('bowled').batter('b3').balls(6, 4, 1);
    expect(g.inn.endReason).toBe('targetReached');
    expect(g.state.phase).toBe('completed');
    expect(g.state.result).toEqual({ kind: 'won', winner: 1, by: 'wickets', margin: 9 });
  });

  it('defending team wins by runs', () => {
    const g = firstInnings().start('b1', 'b2', 'a1').balls(1, 1, 1, 1, 1, 0);
    expect(g.state.result).toEqual({ kind: 'won', winner: 0, by: 'runs', margin: 5 });
  });

  it('tie', () => {
    const g = firstInnings().start('b1', 'b2', 'a1').balls(4, 4, 1, 1, 0, 0);
    expect(g.state.result).toEqual({ kind: 'tie' });
  });
});

describe('undo', () => {
  it('removes the last event and restores the previous state', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(1).ball(4, { boundary: true });
    g.undo();
    expect(g.inn.runs).toBe(1);
    expect(g.inn.strikerId).toBe('a2');
    g.undo();
    expect(g.inn.runs).toBe(0);
    expect(g.inn.strikerId).toBe('a1');
  });

  it('undoing a new batter returns to batter selection; undoing again removes the wicket', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').out('bowled').batter('a3');
    g.undo();
    expect(g.state.phase).toBe('needBatter');
    g.undo();
    expect(g.state.phase).toBe('inPlay');
    expect(g.inn.wickets).toBe(0);
  });

  it('undo reopens a finished innings', () => {
    const g = new Game(makeMatch(11, { overs: 1 })).start('a1', 'a2', 'b1').balls(0, 0, 0, 0, 0, 0);
    expect(g.state.phase).toBe('inningsBreak');
    g.undo();
    expect(g.state.phase).toBe('inPlay');
    expect(g.inn.legalBalls).toBe(5);
  });
});
