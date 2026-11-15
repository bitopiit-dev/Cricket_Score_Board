import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { Game, makeMatch } from '../../engine/__tests__/helpers';
import { makeFormatter } from '../format';
import { matchShareText } from '../share';

// Returns the key, so the test checks structure rather than wording
const t = ((k: string) => k) as unknown as TFunction;
const f = makeFormatter(false);

describe('matchShareText', () => {
  it('says not started before the first ball', () => {
    const m = makeMatch();
    const text = matchShareText(m, new Game(m).state, t, f);
    expect(text.split('\n')[0]).toBe(
      `🏏 BPL-2027: ${m.teams[0].name} common.vs ${m.teams[1].name}`,
    );
    expect(text).toContain('home.notStarted');
  });

  it('lists the innings score and marks a match in progress as live', () => {
    const g = new Game(makeMatch()).start('a1', 'a2', 'b1').ball(4).ball(1);
    const text = matchShareText(g.match, g.state, t, f);
    expect(text).toContain(`${g.match.teams[0].name}: 5/0 (0.2)`);
    expect(text).toContain('homePage.live');
  });
});
