import { describe, expect, it } from 'vitest';
import { MAX_SQUAD, MAX_SUBSTITUTES } from '../../engine/rules';
import { TOURNAMENT_TEAMS, findTeam, initials, teamInitial } from '../teams';

describe('tournament teams', () => {
  it('has the 12 teams, names exactly as in the fixture, six per group', () => {
    const names = (g: string) => TOURNAMENT_TEAMS.filter((t) => t.group === g).map((t) => t.name);
    expect(names('A')).toEqual([
      'Finishing Victorians',
      'Power House X1',
      'MCD Super Stars',
      'Power (Printing & Washing)',
      'Quality Flying Fighter',
      'Rainbow Cutting',
    ]);
    expect(names('B')).toEqual([
      'Engineer Warriors',
      'HR Vikings',
      'Power Player',
      'DDC',
      'Red Bulls Warriors',
      'Sky Warrior',
    ]);
    expect(TOURNAMENT_TEAMS).toHaveLength(12);
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

describe('squads', () => {
  it('player ids are unique within each team and photos sit in the team folder', () => {
    for (const team of TOURNAMENT_TEAMS) {
      const ids = team.players.map((p) => p.id);
      expect(new Set(ids).size, team.name).toBe(ids.length);
      for (const p of team.players) {
        expect(p.name.trim(), `${team.name} player ${p.id}`).not.toBe('');
        if (p.photo) expect(p.photo.startsWith(`players/${team.id}/`), p.photo).toBe(true);
      }
      expect(team.players.filter((p) => p.captain).length, team.name).toBeLessThanOrEqual(1);
      // Rule 8: 11 players plus 3 extras
      expect(team.players.length, team.name).toBeLessThanOrEqual(MAX_SQUAD);
      expect(team.players.filter((p) => p.substitute).length, team.name).toBeLessThanOrEqual(
        MAX_SUBSTITUTES,
      );
    }
  });

  it('initials take the first letters of two words', () => {
    expect(initials('Rahim Uddin Khan')).toBe('RU');
    expect(initials('shakib')).toBe('S');
    expect(initials('  ')).toBe('?');
  });
});
