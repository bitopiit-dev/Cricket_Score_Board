import { describe, expect, it } from 'vitest';
import { TOURNAMENT_TEAMS, findTeam, teamInitial } from '../teams';

describe('tournament teams', () => {
  it('has the 12 teams in order, names exactly as given', () => {
    expect(TOURNAMENT_TEAMS.map((t) => t.name)).toEqual([
      'Power Player',
      'Sky Warrior',
      'Finishing Victorians',
      'Rainbow Cutting',
      'Power House X1',
      'HR Vikings',
      'Engineer Warriors',
      'Red Bulls Warrior',
      'MCD Super Stars',
      'Quality Flying Fighter',
      'Power X1 (Printing & Washing)',
      'DDC',
    ]);
  });

  it('has unique ids and colours', () => {
    expect(new Set(TOURNAMENT_TEAMS.map((t) => t.id)).size).toBe(12);
    expect(new Set(TOURNAMENT_TEAMS.map((t) => t.color)).size).toBe(12);
  });

  it('finds teams and makes initials', () => {
    expect(findTeam('ddc')?.name).toBe('DDC');
    expect(findTeam('nope')).toBeUndefined();
    expect(findTeam(undefined)).toBeUndefined();
    expect(teamInitial('  sky Warrior')).toBe('S');
    expect(teamInitial('')).toBe('?');
  });
});
