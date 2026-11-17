import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import { overRows, reportFileName } from '../matchText';

describe('match report', () => {
  it('lists each over with its runs, wickets and the score after it', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1');
    g.balls(1, 4, 0, 0, 6, 1);
    g.bowler('b2');
    g.ball(2).out('bowled').batter('a3').balls(0, 0, 1, 1);
    expect(overRows(g.inn)).toEqual([
      { number: 1, bowlerId: 'b1', runs: 12, wickets: 0, score: 12, fallen: 0 },
      { number: 2, bowlerId: 'b2', runs: 4, wickets: 1, score: 16, fallen: 1 },
    ]);
  });

  it('suggests a file name with the match number and both teams', () => {
    const m = makeMatch();
    expect(reportFileName(m, 3)).toBe('BPL-2027 Match 03 - Team A vs Team B');
    expect(reportFileName(m)).toBe('BPL-2027 Team A vs Team B');
  });

  it('keeps characters out of the file name that Windows does not allow', () => {
    const m = makeMatch();
    m.teams[0].name = 'Power (Printing/Washing)';
    expect(reportFileName(m, 12)).toBe('BPL-2027 Match 12 - Power (Printing Washing) vs Team B');
  });
});
