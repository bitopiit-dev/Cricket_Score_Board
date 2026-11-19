import { describe, expect, it } from 'vitest';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import { momentsBetween, momentsToSend, teamIdsOf } from '../moments';

const oneOver = () => new Game(makeMatch(11, { overs: 1, superOver: false }));

describe('momentsBetween', () => {
  it('announces the start with the toss', () => {
    const g = oneOver();
    const before = g.match;
    g.start('a1', 'a2', 'b1');
    const m = momentsBetween(before, g.match);
    expect(m.map((x) => x.key)).toEqual(['start']);
    expect(m[0].text.en.body).toBe('Match started. Team A won the toss and chose to bat.');
    expect(m[0].text.bn.body).toContain('টস জিতে ব্যাটিং');
  });

  it('names the batter and the score on a wicket, in Bengali digits', () => {
    const g = oneOver().start('a1', 'a2', 'b1').balls(4, 1);
    const before = g.match;
    g.out('bowled');
    const [w] = momentsBetween(before, g.match);
    expect(w.key).toBe('w:0:1');
    expect(w.text.en.title).toBe('Wicket! A2 is out');
    expect(w.text.en.body).toBe('Team A 5/1 (0.3 ov)');
    expect(w.text.bn.body).toBe('Team A ৫/১ (০.৩ ওভার)');
  });

  it('keeps the same key when a wicket is undone and entered again', () => {
    const g = oneOver().start('a1', 'a2', 'b1');
    const base = g.match;
    g.out('bowled');
    const first = momentsBetween(base, g.match)[0].key;
    const afterFirst = g.match;
    g.undo().out('caught');
    const again = momentsBetween(afterFirst, g.match);
    expect(again.map((x) => x.key)).toEqual([first]);
  });

  it('gives the target at the innings break and the result at the end', () => {
    const g = oneOver().start('a1', 'a2', 'b1').balls(1, 1, 1, 1, 1, 1);
    const brk = momentsBetween(null, g.match).find((x) => x.kind === 'inningsBreak')!;
    expect(brk.text.en.body).toBe('Team A 6/0 (1 ov). Team B need 7 to win.');

    const before = g.match;
    g.start('b1', 'b2', 'a1').balls(4, 4);
    const res = momentsBetween(before, g.match).find((x) => x.kind === 'result')!;
    expect(res.level).toBe('result');
    expect(res.text.en.title).toBe('Team B won by 10 wickets!');
    expect(res.text.bn.title).toBe('Team B ১০ উইকেটে জিতেছে!');
  });

  it('reports nothing for an upload with no new events', () => {
    const g = oneOver().start('a1', 'a2', 'b1').balls(1);
    expect(momentsBetween(g.match, g.match)).toEqual([]);
  });
});

describe('momentsToSend', () => {
  it('keeps only the newest fresh key moment, and always the result', () => {
    const g = oneOver().start('a1', 'a2', 'b1').out('bowled').batter('a3').out('bowled');
    const all = momentsBetween(null, g.match);
    expect(all.map((x) => x.key)).toEqual(['start', 'w:0:1', 'w:0:2']);
    const now = all[2].at;
    expect(momentsToSend(all, now).map((x) => x.key)).toEqual(['w:0:2']);
    // An upload from a phone that was offline for an hour: nothing stale is sent
    expect(momentsToSend(all, now + 60 * 60_000)).toEqual([]);
  });
});

describe('teamIdsOf', () => {
  it('lists only tournament teams', () => {
    const m = makeMatch();
    m.teams[0].teamId = 'ddc';
    expect(teamIdsOf(m)).toEqual(['ddc']);
  });
});
