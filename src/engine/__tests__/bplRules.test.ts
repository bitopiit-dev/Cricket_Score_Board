import { describe, expect, it } from 'vitest';
import { KICK_PENALTY_RUNS, TOURNAMENT_RULES, battingTeamFor } from '../rules';
import { Game, makeMatch } from './helpers';
import type { MatchSettings } from '../types';

const game = (settings: Partial<MatchSettings> = {}, players = 11) =>
  new Game(makeMatch(players, settings));

describe('rule 23: after a catch the new batter takes strike', () => {
  it('on the last ball of an over the new batter still faces the next ball', () => {
    const g = game({ catchNewBatterOnStrike: true }).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0).out('caught');
    g.batter('a3').bowler('b2');
    expect(g.inn.strikerId).toBe('a3');
    expect(g.inn.nonStrikerId).toBe('a2');
  });

  it('without the rule the over-end swap puts the new batter at the other end', () => {
    const g = game({ catchNewBatterOnStrike: false }).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0).out('caught');
    g.batter('a3').bowler('b2');
    expect(g.inn.strikerId).toBe('a2');
    expect(g.inn.nonStrikerId).toBe('a3');
  });

  it('ignores the batters crossing on a catch mid-over', () => {
    const g = game({ catchNewBatterOnStrike: true }).start('a1', 'a2', 'b1');
    g.out('caught', 'a1', 1).batter('a3');
    expect(g.inn.strikerId).toBe('a3');
    expect(g.inn.nonStrikerId).toBe('a2');
  });

  it('does not change other dismissals', () => {
    const g = game({ catchNewBatterOnStrike: true }).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0).out('bowled');
    g.batter('a3').bowler('b2');
    expect(g.inn.strikerId).toBe('a2');
  });

  it('undo brings the dismissed batter back on strike', () => {
    const g = game({ catchNewBatterOnStrike: true }).start('a1', 'a2', 'b1');
    g.balls(0, 0, 0, 0, 0).out('caught').undo();
    expect(g.inn.strikerId).toBe('a1');
    expect(g.state.phase).toBe('inPlay');
  });
});

describe('rule 26: penalty for kicking the ball', () => {
  it('deducts from the team total only', () => {
    const g = game().start('a1', 'a2', 'b1').ball(2);
    g.do({ type: 'penalty', runs: -KICK_PENALTY_RUNS });
    expect(g.inn.runs).toBe(-2);
    expect(g.inn.penaltyRuns).toBe(-4);
    expect(g.inn.batters[0].runs).toBe(2);
    expect(g.inn.bowlers[0].runsConceded).toBe(2);
    expect(g.inn.legalBalls).toBe(1);
    expect(g.state.phase).toBe('inPlay');
  });

  it('lowers the target for the chasing team', () => {
    const g = game({ overs: 1 }).start('a1', 'a2', 'b1').balls(4, 4, 4);
    g.do({ type: 'penalty', runs: -4 });
    g.balls(0, 0, 0);
    expect(g.state.phase).toBe('inningsBreak');
    g.start('b1', 'b2', 'a1');
    expect(g.inn.target).toBe(9);
  });

  it('can be undone and rejects bad values', () => {
    const g = game().start('a1', 'a2', 'b1').ball(1);
    g.do({ type: 'penalty', runs: -4 }).undo();
    expect(g.inn.runs).toBe(1);
    expect(g.tryDo({ type: 'penalty', runs: 0 })).toBe('invalidRuns');
    expect(g.tryDo({ type: 'penalty', runs: 1.5 })).toBe('invalidRuns');
  });

  it('is not allowed before the innings starts', () => {
    expect(game().tryDo({ type: 'penalty', runs: -4 })).toBe('wrongPhase');
  });

  it('is allowed while waiting for the next bowler', () => {
    const g = game().start('a1', 'a2', 'b1').balls(1, 1, 1, 1, 1, 1);
    expect(g.state.phase).toBe('needBowler');
    expect(g.tryDo({ type: 'penalty', runs: -4 })).toBeNull();
    expect(g.inn.runs).toBe(2);
  });
});

describe('rule 27: one review per team', () => {
  it('a failed review is lost, a successful one is kept', () => {
    const g = game({ reviewsPerTeam: 1 }).start('a1', 'a2', 'b1');
    expect(g.state.reviewsLeft).toEqual([1, 1]);
    g.do({ type: 'review', team: 0, successful: true });
    g.do({ type: 'review', team: 0, successful: true });
    expect(g.state.reviewsLeft).toEqual([1, 1]);
    g.do({ type: 'review', team: 1, successful: false });
    expect(g.state.reviewsLeft).toEqual([1, 0]);
    expect(g.tryDo({ type: 'review', team: 1, successful: true })).toBe('noReviewLeft');
    expect(g.state.reviews).toHaveLength(3);
  });

  it('lasts the whole match, not per innings', () => {
    const g = game({ overs: 1, reviewsPerTeam: 1 }).start('a1', 'a2', 'b1');
    g.do({ type: 'review', team: 1, successful: false });
    g.balls(0, 0, 0, 0, 0, 0).start('b1', 'b2', 'a1');
    expect(g.state.reviewsLeft).toEqual([1, 0]);
  });

  it('undo restores the review', () => {
    const g = game({ reviewsPerTeam: 1 }).start('a1', 'a2', 'b1');
    g.do({ type: 'review', team: 0, successful: false }).undo();
    expect(g.state.reviewsLeft).toEqual([1, 1]);
  });

  it('is rejected when reviews are off', () => {
    const g = game({ reviewsPerTeam: 0 }).start('a1', 'a2', 'b1');
    expect(g.state.reviewsLeft).toBeNull();
    expect(g.tryDo({ type: 'review', team: 0, successful: false })).toBe('reviewsOff');
  });
});

describe('rule 4: a tie is decided by a super over', () => {
  /** 1-over match where both sides make 6 off the over. */
  const tiedMatch = (settings: Partial<MatchSettings> = {}) => {
    const g = game({ overs: 1, superOver: true, ...settings });
    g.start('a1', 'a2', 'b1').balls(1, 1, 1, 1, 1, 1);
    g.start('b1', 'b2', 'a1').balls(1, 1, 1, 1, 1, 1);
    return g;
  };

  it('a tie leads to a super over instead of a result', () => {
    const g = tiedMatch();
    expect(g.state.phase).toBe('superOverBreak');
    expect(g.state.result).toBeNull();
  });

  it('without the rule a tie is the result', () => {
    const g = tiedMatch({ superOver: false });
    expect(g.state.phase).toBe('completed');
    expect(g.state.result).toEqual({ kind: 'tie' });
  });

  it('the team that batted second bats first in the super over', () => {
    const g = tiedMatch();
    expect(
      g.tryDo({ type: 'inningsStart', strikerId: 'a1', nonStrikerId: 'a2', bowlerId: 'b1' }),
    ).toBe('notInTeam');
    g.start('b1', 'b2', 'a1');
    expect(g.inn.index).toBe(2);
    expect(g.inn.superOver).toBe(true);
    expect(g.inn.battingTeam).toBe(1);
    expect(g.inn.oversLimit).toBe(1);
    expect(g.inn.wicketsLimit).toBe(2);
    expect(g.inn.target).toBeNull();
  });

  it('two wickets end a super over innings, and the chase decides the match', () => {
    const g = tiedMatch();
    g.start('b1', 'b2', 'a1').ball(4, { boundary: true }).out('bowled').batter('b3').out('bowled');
    expect(g.inn.ended).toBe(true);
    expect(g.inn.endReason).toBe('allOut');
    expect(g.state.phase).toBe('inningsBreak');

    g.start('a1', 'a2', 'b1');
    expect(g.inn.target).toBe(5);
    g.ball(4, { boundary: true }).ball(1);
    expect(g.state.phase).toBe('completed');
    expect(g.state.result).toEqual({ kind: 'won', winner: 0, by: 'superOver', margin: 0 });
    // The main match innings are untouched
    expect(g.state.innings[0].runs).toBe(6);
    expect(g.state.innings[1].runs).toBe(6);
  });

  it('the side batting first wins the super over if the chase falls short', () => {
    const g = tiedMatch();
    g.start('b1', 'b2', 'a1').balls(1, 1, 1, 1, 1, 1);
    g.start('a1', 'a2', 'b1').balls(0, 0, 0, 0, 0, 0);
    expect(g.state.result).toEqual({ kind: 'won', winner: 1, by: 'superOver', margin: 0 });
  });

  it('a tied super over leads to another one, batting order reversed', () => {
    const g = tiedMatch();
    g.start('b1', 'b2', 'a1').balls(1, 1, 1, 1, 1, 1);
    g.start('a1', 'a2', 'b1').balls(1, 1, 1, 1, 1, 1);
    expect(g.state.phase).toBe('superOverBreak');
    g.start('a1', 'a2', 'b1');
    expect(g.inn.index).toBe(4);
    expect(g.inn.battingTeam).toBe(0);
    g.balls(0, 0, 0, 0, 0, 0).start('b1', 'b2', 'a1').ball(1);
    expect(g.state.result).toEqual({ kind: 'won', winner: 1, by: 'superOver', margin: 0 });
  });

  it('last man stands does not apply in a super over', () => {
    const g = tiedMatch({ lastManStands: true });
    g.start('b1', 'b2', 'a1').out('bowled').batter('b3').out('bowled');
    expect(g.inn.ended).toBe(true);
    expect(g.inn.loneBatter).toBe(false);
  });

  it('undo from the super over returns to the break', () => {
    const g = tiedMatch();
    g.start('b1', 'b2', 'a1').undo();
    expect(g.state.phase).toBe('superOverBreak');
    expect(g.state.innings).toHaveLength(2);
  });

  it('battingTeamFor follows the toss and alternates in super overs', () => {
    const toss = { winner: 1 as const, decision: 'bowl' as const };
    expect(battingTeamFor(0, toss)).toBe(0);
    expect(battingTeamFor(1, toss)).toBe(1);
    const prev = [{ battingTeam: 0 as const }, { battingTeam: 1 as const }];
    expect(battingTeamFor(2, toss, prev)).toBe(1);
    expect(battingTeamFor(3, toss, [...prev, { battingTeam: 1 as const }])).toBe(0);
  });
});

describe('tournament preset', () => {
  it('includes the catch, review and super over rules', () => {
    expect(TOURNAMENT_RULES.catchNewBatterOnStrike).toBe(true);
    expect(TOURNAMENT_RULES.reviewsPerTeam).toBe(1);
    expect(TOURNAMENT_RULES.superOver).toBe(true);
  });
});
