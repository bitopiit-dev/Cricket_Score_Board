import { afterEach, describe, expect, it } from 'vitest';
import { FIXTURES } from '../../data/fixtures';
import { TOURNAMENT_TEAMS } from '../../data/teams';
import { groupOf, teamsOfGroup } from '../groups';
import { tournamentState } from '../standings';

const original = structuredClone([...TOURNAMENT_TEAMS]);
afterEach(() => {
  (TOURNAMENT_TEAMS as typeof original).splice(0, TOURNAMENT_TEAMS.length, ...original);
});

describe('groups come from the fixture list', () => {
  it('matches the official groups', () => {
    expect(teamsOfGroup('A').map((t) => t.id)).toContain('sky-warrior');
    expect(teamsOfGroup('B').map((t) => t.id)).toContain('rainbow-cutting');
    expect(teamsOfGroup('A')).toHaveLength(6);
    expect(teamsOfGroup('B')).toHaveLength(6);
  });

  it('ignores an older team list that still has the old groups', () => {
    // A team list saved to Supabase before the regroup
    const stale = original.map((t) =>
      t.id === 'sky-warrior'
        ? { ...t, group: 'B' as const }
        : t.id === 'rainbow-cutting'
          ? { ...t, group: 'A' as const }
          : t,
    );
    (TOURNAMENT_TEAMS as typeof original).splice(0, TOURNAMENT_TEAMS.length, ...stale);
    expect(groupOf('sky-warrior')).toBe('A');
    expect(groupOf('rainbow-cutting')).toBe('B');
    const ts = tournamentState([], FIXTURES);
    expect(ts.tables.groupA.map((r) => r.teamId)).toContain('sky-warrior');
    expect(ts.tables.groupB.map((r) => r.teamId)).toContain('rainbow-cutting');
  });

  it('falls back to the team list for a team with no group match', () => {
    expect(groupOf('mcd-super-stars', [])).toBe('A');
  });
});
