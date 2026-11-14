import { describe, expect, it } from 'vitest';
import { SQUAD_LIMITS } from '../../config/tournament';
import { TOURNAMENT_TEAMS, findTeam, initials, squadWarnings, teamInitial } from '../teams';

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
      // Rule 8: at most 14 (11 plus 3 extras), one captain, one vice-captain
      expect(squadWarnings(team, SQUAD_LIMITS), team.name).toEqual([]);
    }
  });

  it('initials take the first letters of two words', () => {
    expect(initials('Rahim Uddin Khan')).toBe('RU');
    expect(initials('shakib')).toBe('S');
    expect(initials('  ')).toBe('?');
  });
});

describe('HR Vikings squad', () => {
  const hr = findTeam('hr-vikings')!;

  it('has the 14 players in the given order', () => {
    expect(hr.players.map((p) => p.name)).toEqual([
      'Jakir',
      'Atiq',
      'Hasnat',
      'Ashik',
      'Hasib',
      'Arman',
      'Habib',
      'Kader',
      'Salauddin',
      'Rakib',
      'Sulove',
      'Nayeem',
      'Salmon',
      'Mamun',
    ]);
  });

  it('Jakir is captain, Atiq vice-captain; the last three are the extras', () => {
    expect(hr.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['Jakir']);
    expect(hr.players.filter((p) => p.viceCaptain).map((p) => p.name)).toEqual(['Atiq']);
    expect(hr.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Nayeem',
      'Salmon',
      'Mamun',
    ]);
  });

  it('photo files are named after the player', () => {
    expect(hr.players[0]).toMatchObject({ id: 'jakir', photo: 'players/hr-vikings/jakir.jpg' });
    expect(hr.players[8]).toMatchObject({
      id: 'salauddin',
      photo: 'players/hr-vikings/salauddin.jpg',
    });
  });
});

describe('squad warnings', () => {
  const p = (i: number, extra = {}) => ({ id: `p${i}`, name: `P${i}`, ...extra });

  it('flags more than 14 players, more than 3 extras and a second captain', () => {
    const players = Array.from({ length: 15 }, (_, i) =>
      p(i, { substitute: i >= 11, captain: i < 2 }),
    );
    expect(squadWarnings({ players }, SQUAD_LIMITS)).toEqual([
      'tooMany',
      'tooManySubs',
      'twoCaptains',
    ]);
  });

  it('accepts 14 players with 3 extras and one captain', () => {
    const players = Array.from({ length: 14 }, (_, i) =>
      p(i, { substitute: i >= 11, captain: i === 0 }),
    );
    expect(squadWarnings({ players }, SQUAD_LIMITS)).toEqual([]);
  });
});

describe('Quality Flying Fighter squad', () => {
  const qff = findTeam('quality-flying-fighter')!;

  it('has the 14 players in the given order, without titles', () => {
    expect(qff.players.map((p) => p.name)).toEqual([
      'Ajmir Hossen',
      'Asad Ahmed',
      'Billal Hossain',
      'Ibrahim',
      'Morshed',
      'Mamun',
      'Rakib',
      'Parvez',
      'Hridoy',
      'Abdur Rahman',
      'Sohel',
      'Tariqul',
      'Saiful',
      'Imran',
    ]);
    expect(qff.players.every((p) => !/^mr\.?\s/i.test(p.name))).toBe(true);
  });

  it('Ajmir Hossen (Rashed) is captain; the last three are the extras', () => {
    expect(qff.players[0]).toMatchObject({
      id: 'ajmir-hossen',
      shortName: 'Rashed',
      captain: true,
      photo: 'players/quality-flying-fighter/ajmir-hossen.jpg',
    });
    expect(qff.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Tariqul',
      'Saiful',
      'Imran',
    ]);
  });
});

describe('Engineer Warriors squad', () => {
  const ew = findTeam('engineer-warriors')!;

  it('has the 14 players in the given order with their roles', () => {
    expect(ew.players.map((p) => [p.name, p.role ?? null])).toEqual([
      ['Farhad', null],
      ['Akhtar', 'bowler'],
      ['Avijit', 'bowler'],
      ['Harun', 'wicketKeeper'],
      ['Shakil', 'batter'],
      ['Akbar', 'batter'],
      ['Mohiuddin', 'batter'],
      ['Aktar', 'bowler'],
      ['Imran', 'bowler'],
      ['Masud', 'batter'],
      ['Shimanto', 'allRounder'],
      ['Tawhid', null],
      ['Samad', null],
      ['Amzad', null],
    ]);
  });

  it('Farhad is captain; Tawhid, Samad and Amzad are the extras; Akhtar and Aktar are different players', () => {
    expect(ew.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['Farhad']);
    expect(ew.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Tawhid',
      'Samad',
      'Amzad',
    ]);
    expect(ew.players.find((p) => p.name === 'Akhtar')!.id).toBe('akhtar');
    expect(ew.players.find((p) => p.name === 'Aktar')!.id).toBe('aktar');
  });
});
