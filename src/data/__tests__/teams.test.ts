import { describe, expect, it } from 'vitest';
import { SQUAD_LIMITS } from '../../config/tournament';
import { teamsOfGroup } from '../../tournament/groups';
import {
  TOURNAMENT_TEAMS,
  duplicateNames,
  findTeam,
  initials,
  squadWarnings,
  teamInitial,
} from '../teams';

/*
 * Squads are edited by the super admin and published from the app, then copied
 * back into teams.ts. So these tests check rules that must always hold, not who
 * is in which squad: a test that lists names breaks with every squad change.
 */

describe('tournament teams', () => {
  it('has the 12 teams, names exactly as in the fixture, six per group', () => {
    const names = (g: 'A' | 'B') => teamsOfGroup(g).map((t) => t.name);
    expect(names('A')).toEqual([
      'Finishing Victorians',
      'Power House X1',
      'MCD Super Stars',
      'Power (Printing & Washing)',
      'Quality Flying Fighter',
      'Sky Warrior',
    ]);
    expect(names('B')).toEqual([
      'Engineer Warrior',
      'HR Vikings',
      'Power Player',
      'DDC',
      'Red Bulls Warriors',
      'Rainbow Cutting',
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

/** A photo uploaded from the admin page: the project's public media bucket, in the team's folder. */
const uploaded = (teamId: string) =>
  new RegExp(
    `^https://[a-z0-9]+\\.supabase\\.co/storage/v1/object/public/media/players/${teamId}/[a-z0-9-]+\\.(jpe?g|png|webp)$`,
  );

describe('squads', () => {
  it('player ids are unique within each team; photos are the team folder or an upload', () => {
    for (const team of TOURNAMENT_TEAMS) {
      const ids = team.players.map((p) => p.id);
      expect(new Set(ids).size, team.name).toBe(ids.length);
      for (const p of team.players) {
        expect(p.name.trim(), `${team.name} player ${p.id}`).not.toBe('');
        expect(p.id, `${team.name}: ${p.name}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        if (p.photo) {
          const ok = p.photo.startsWith(`players/${team.id}/`) || uploaded(team.id).test(p.photo);
          expect(ok, p.photo).toBe(true);
        }
      }
      // One captain and one vice-captain at most, no two players showing the same
      // name, no more than 3 extras. Over-size and no-captain squads are allowed in
      // the data (the team page warns the admin).
      expect(
        squadWarnings(team, SQUAD_LIMITS).filter((w) => w !== 'tooMany' && w !== 'noCaptain'),
        team.name,
      ).toEqual([]);
    }
  });

  it('keeps only names, captaincy and squad role: no contact or department details', () => {
    const allowed = [
      'id',
      'name',
      'shortName',
      'nameTag',
      'photo',
      'role',
      'captain',
      'viceCaptain',
      'substitute',
    ];
    for (const t of TOURNAMENT_TEAMS)
      for (const p of t.players)
        for (const key of Object.keys(p))
          expect(allowed, `${t.name} ${p.name}: ${key}`).toContain(key);
  });

  it('initials take the first letters of two words', () => {
    expect(initials('Rahim Uddin Khan')).toBe('RU');
    expect(initials('shakib')).toBe('S');
    expect(initials('  ')).toBe('?');
  });
});

describe('squad warnings', () => {
  const p = (i: number, extra = {}) => ({ id: `p${i}`, name: `P${i}`, ...extra });

  it('flags more than 14 players and a second captain', () => {
    const players = Array.from({ length: 15 }, (_, i) =>
      p(i, { substitute: i >= 11, captain: i < 2 }),
    );
    // Over the limit: the extras count is not reported separately
    expect(squadWarnings({ players }, SQUAD_LIMITS)).toEqual(['tooMany', 'twoCaptains']);
  });

  it('flags more than 3 extras in a squad within the limit', () => {
    const players = Array.from({ length: 14 }, (_, i) =>
      p(i, { substitute: i >= 10, captain: i === 0 }),
    );
    expect(squadWarnings({ players }, SQUAD_LIMITS)).toEqual(['tooManySubs']);
  });

  it('accepts 14 players with 3 extras and one captain', () => {
    const players = Array.from({ length: 14 }, (_, i) =>
      p(i, { substitute: i >= 11, captain: i === 0 }),
    );
    expect(squadWarnings({ players }, SQUAD_LIMITS)).toEqual([]);
  });
});

describe('duplicate names', () => {
  it('warns when two players show the same name (case and spaces ignored)', () => {
    const team = {
      players: [
        { id: 'a', name: 'Rakib' },
        { id: 'b', name: ' rakib ' },
        { id: 'c', name: 'Sohel' },
      ],
    };
    expect(duplicateNames(team)).toEqual(['Rakib']);
    expect(squadWarnings(team, SQUAD_LIMITS)).toContain('duplicateName');
  });

  it('a name tag tells them apart', () => {
    const team = {
      players: [
        { id: 'a', name: 'Rakib' },
        { id: 'b', name: 'Rakib', nameTag: '2' },
      ],
    };
    expect(duplicateNames(team)).toEqual([]);
  });
});

describe('no captain warning', () => {
  it('applies to any team with players but no captain, not to an empty squad', () => {
    expect(squadWarnings({ players: [{ id: 'a', name: 'A' }] }, SQUAD_LIMITS)).toEqual([
      'noCaptain',
    ]);
    expect(squadWarnings({ players: [] }, SQUAD_LIMITS)).toEqual([]);
    expect(
      squadWarnings({ players: [{ id: 'a', name: 'A', captain: true }] }, SQUAD_LIMITS),
    ).toEqual([]);
  });
});

describe('short team codes', () => {
  it('every team has a unique short code of 2-3 capitals', () => {
    const codes = TOURNAMENT_TEAMS.map((t) => t.short);
    expect(new Set(codes).size).toBe(12);
    for (const c of codes) expect(c).toMatch(/^[A-Z]{2,3}$/);
    expect(findTeam('finishing-victorians')!.short).toBe('FV');
    expect(findTeam('rainbow-cutting')!.short).toBe('RC');
  });
});

describe('team logos', () => {
  it('logo paths sit in icons/teams/ and are named after the team id', () => {
    for (const t of TOURNAMENT_TEAMS) {
      if (t.logo)
        expect(t.logo, t.name).toMatch(new RegExp(`^icons/teams/${t.id}\\.(png|jpe?g|webp|svg)$`));
    }
  });
});

describe('player photo files', () => {
  it('every photo in public/players/ belongs to a squad player', () => {
    const files = Object.keys(import.meta.glob('/public/players/**/*.{jpg,jpeg,png,webp}'));
    const known = new Set(TOURNAMENT_TEAMS.flatMap((t) => t.players.map((p) => p.photo)));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const rel = f.replace('/public/', '');
      expect(known.has(rel), rel).toBe(true);
    }
  });
});

describe('team logo files', () => {
  it('every logo path in teams.ts points to a file in public/', () => {
    const files = new Set(
      Object.keys(import.meta.glob('/public/icons/teams/*.{png,jpg,jpeg,webp,svg}')).map((f) =>
        f.replace('/public/', ''),
      ),
    );
    for (const t of TOURNAMENT_TEAMS) {
      if (t.logo) expect(files.has(t.logo), `${t.name}: ${t.logo}`).toBe(true);
    }
  });
});
