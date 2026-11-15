import { describe, expect, it } from 'vitest';
import { SQUAD_LIMITS } from '../../config/tournament';
import {
  TOURNAMENT_TEAMS,
  duplicateNames,
  findTeam,
  initials,
  playerDisplayName,
  squadWarnings,
  teamInitial,
} from '../teams';

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
      // One captain and one vice-captain at most. A squad over the size limit is
      // allowed in the data (the team page warns the admin), so 'tooMany' is not checked here.
      // A missing captain is also allowed in the data (shown as a warning).
      expect(
        squadWarnings(team, SQUAD_LIMITS).filter((w) => w !== 'tooMany' && w !== 'noCaptain'),
        team.name,
      ).toEqual([]);
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

describe('Red Bulls Warriors squad', () => {
  const rbw = findTeam('red-bulls-warriors')!;

  it('has all 15 players in the given order', () => {
    expect(rbw.players.map((p) => p.name)).toEqual([
      'Rashed',
      'Kamrul',
      'Robiul',
      'Imon',
      'Sayfur',
      'Raihan',
      'Ashraful',
      'Nazir',
      'Shorif',
      'Rigan',
      'Rikon',
      'Shanto',
      'Sohel',
      'Al-Amin',
      'Jahirul',
    ]);
  });

  it('Rashed is captain, Imon vice-captain, Robiul is known as Pollob', () => {
    expect(rbw.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['Rashed']);
    expect(rbw.players.filter((p) => p.viceCaptain).map((p) => p.name)).toEqual(['Imon']);
    expect(rbw.players[2]).toMatchObject({ id: 'robiul', shortName: 'Pollob' });
    expect(rbw.players[13]).toMatchObject({
      id: 'al-amin',
      photo: 'players/red-bulls-warriors/al-amin.jpg',
    });
  });

  it('is one over the squad limit, which the team page reports', () => {
    expect(squadWarnings(rbw, SQUAD_LIMITS)).toEqual(['tooMany']);
  });
});

describe('MCD Super Stars squad', () => {
  const mcd = findTeam('mcd-super-stars')!;

  it('has the 14 players in the given order', () => {
    expect(mcd.players.map(playerDisplayName)).toEqual([
      'Monir Hossain',
      'Shahanur',
      'Nazmul Hassan',
      'Robel Mia',
      'Monir Hossain (2)',
      'Kamrul Hasan',
      'Shahin Alom',
      'Asif Babu',
      'Sahaj Uddin',
      'Easin Mia Antor',
      'Rabiul',
      'Jamal Uddin Khan',
      'Nayeem Uddin',
      'Chahed Hosen Hridoy',
    ]);
  });

  it('keeps the two Monir Hossains apart: the captain and (2)', () => {
    const [monir, , , , monir2] = mcd.players;
    expect(monir).toMatchObject({
      id: 'monir-hossain',
      captain: true,
      role: 'bowler',
      photo: 'players/mcd-super-stars/monir-hossain.jpg',
    });
    expect(monir2).toMatchObject({
      id: 'monir-hossain-2',
      photo: 'players/mcd-super-stars/monir-hossain-2.jpg',
    });
    expect(monir2.captain).toBeUndefined();
    expect(duplicateNames(mcd)).toEqual([]);
  });

  it('has the bowlers and the three extras', () => {
    expect(mcd.players.filter((p) => p.role === 'bowler').map(playerDisplayName)).toEqual([
      'Monir Hossain',
      'Robel Mia',
      'Shahin Alom',
      'Asif Babu',
      'Sahaj Uddin',
    ]);
    expect(mcd.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Jamal Uddin Khan',
      'Nayeem Uddin',
      'Chahed Hosen Hridoy',
    ]);
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

describe('Power (Printing & Washing) squad', () => {
  const ppw = findTeam('power-printing-washing')!;

  it('has the 14 players in the given order, the last three as extras', () => {
    expect(ppw.players.map((p) => p.name)).toEqual([
      'Shubroto',
      'Salah Uddin',
      'Johurul',
      'Kawsar',
      'Alal',
      'Jahidul',
      'Hridoy',
      'Jamal',
      'Shawon',
      'Mojir',
      'Shafiqul',
      'Easin',
      'Shuvo',
      'Nazmul',
    ]);
    expect(ppw.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Easin',
      'Shuvo',
      'Nazmul',
    ]);
    expect(ppw.players[1]).toMatchObject({
      id: 'salah-uddin',
      photo: 'players/power-printing-washing/salah-uddin.jpg',
    });
  });

  it('has no captain yet, which the team page reports', () => {
    expect(ppw.players.some((p) => p.captain)).toBe(false);
    expect(squadWarnings(ppw, SQUAD_LIMITS)).toEqual(['noCaptain']);
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

describe('Power Player squad', () => {
  const pp = findTeam('power-player')!;

  it('has the 14 players in the given order', () => {
    expect(pp.players.map(playerDisplayName)).toEqual([
      'Nazmul',
      'Sharif',
      'Hridoy',
      'Arafat',
      'Saiful',
      'Saddam',
      'Al-Amin',
      'Ali Ashraf',
      'Ismail',
      'T.S Tanvir',
      'Sabuj',
      'Kalam',
      'Rashed',
      'Al-Amin (2)',
    ]);
  });

  it('Nazmul is captain; the two Al-Amins are kept apart', () => {
    expect(pp.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['Nazmul']);
    expect(pp.players[6]).toMatchObject({
      id: 'al-amin',
      photo: 'players/power-player/al-amin.jpg',
    });
    expect(pp.players[13]).toMatchObject({
      id: 'al-amin-2',
      photo: 'players/power-player/al-amin-2.jpg',
      substitute: true,
    });
    expect(pp.players[9]).toMatchObject({ id: 't-s-tanvir' });
    expect(squadWarnings(pp, SQUAD_LIMITS)).toEqual([]);
  });

  it('keeps only names, captaincy and squad role: no contact or department details', () => {
    const allowed = ['id', 'name', 'photo', 'captain', 'substitute', 'nameTag'];
    for (const p of pp.players) {
      for (const key of Object.keys(p)) expect(allowed, `${p.name}: ${key}`).toContain(key);
    }
  });
});

describe('Power House X1 squad', () => {
  const phx = findTeam('power-house-x1')!;

  it('has the 14 players in the given order', () => {
    expect(phx.players.map((p) => p.name)).toEqual([
      'Gilbird',
      'Arif',
      'Foysal',
      'Jahirul',
      'Joynal',
      'Sami',
      'Tantu',
      'Habib Ulla',
      'Khairul',
      'Supian',
      'Dhirendra',
      'Helal',
      'Sourov',
      'Alauddin',
    ]);
    expect(phx.players.some((p) => p.name === 'Rohim')).toBe(false);
  });

  it('Gilbird is captain, Arif vice-captain; Helal, Sourov and Alauddin are the extras', () => {
    expect(phx.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['Gilbird']);
    expect(phx.players.filter((p) => p.viceCaptain).map((p) => p.name)).toEqual(['Arif']);
    expect(phx.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Helal',
      'Sourov',
      'Alauddin',
    ]);
    expect(phx.players[7]).toMatchObject({
      id: 'habib-ulla',
      photo: 'players/power-house-x1/habib-ulla.jpg',
    });
    expect(squadWarnings(phx, SQUAD_LIMITS)).toEqual([]);
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

describe('Rainbow Cutting squad', () => {
  const rc = findTeam('rainbow-cutting')!;

  it('has the 14 players in the given order', () => {
    expect(rc.players.map((p) => p.name)).toEqual([
      'Kazi Pholash',
      'Sagor',
      'Md. Faysal',
      'Iqbal',
      'Probash',
      'Nasir',
      'Sumon',
      'Abu Saeed',
      'Md. Naieem Khan',
      'Arif',
      'Monir',
      'Rifat',
      'Biplob',
      'Kawser',
    ]);
  });

  it('has no captain yet and Rifat, Biplob and Kawser as the extras', () => {
    expect(rc.players.some((p) => p.captain || p.viceCaptain)).toBe(false);
    expect(squadWarnings(rc, SQUAD_LIMITS)).toEqual(['noCaptain']);
    expect(rc.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Rifat',
      'Biplob',
      'Kawser',
    ]);
  });

  it('ids and photo paths follow the names', () => {
    expect(rc.players[2]).toMatchObject({
      id: 'md-faysal',
      photo: 'players/rainbow-cutting/md-faysal.jpg',
    });
    expect(rc.players[8]).toMatchObject({ id: 'md-naieem-khan' });
  });

  it('has its team logo', () => {
    expect(rc.logo).toBe('icons/teams/rainbow-cutting.png');
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

describe('DDC squad', () => {
  const ddc = findTeam('ddc')!;

  it('has the 14 players in the given order', () => {
    expect(ddc.players.map((p) => p.name)).toEqual([
      'A. Karim',
      'Ratul',
      'Sajib',
      'Shoikat',
      'K. Rana',
      'Siam',
      'Imran',
      'Topayel',
      'Sabbir',
      'Khayer',
      'Sanaullah',
      'Z.I. Limon',
      'Sazzad',
      'Mamun',
    ]);
  });

  it('A. Karim is captain; Z.I. Limon, Sazzad and Mamun are the extras', () => {
    expect(ddc.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['A. Karim']);
    expect(ddc.players.filter((p) => p.substitute).map((p) => p.name)).toEqual([
      'Z.I. Limon',
      'Sazzad',
      'Mamun',
    ]);
    expect(squadWarnings(ddc, SQUAD_LIMITS)).toEqual([]);
  });

  it('initials in names become simple ids and photo names', () => {
    expect(ddc.players[0]).toMatchObject({ id: 'a-karim', photo: 'players/ddc/a-karim.jpg' });
    expect(ddc.players[4]).toMatchObject({ id: 'k-rana' });
    expect(ddc.players[11]).toMatchObject({ id: 'z-i-limon', photo: 'players/ddc/z-i-limon.jpg' });
  });
});

describe('Sky Warrior squad', () => {
  const sw = findTeam('sky-warrior')!;

  it('has the 14 players in the given order', () => {
    expect(sw.players.map(playerDisplayName)).toEqual([
      'Md. Mominul Islam',
      'Md. Ashraful Hoque',
      'Md. Younus',
      'Md. Bashar',
      'Haripad',
      'Md. Miraz',
      'Md. Mehdi',
      'Md. Showib',
      'Md. Saju',
      'Antar',
      'Md. Mosharaf',
      'Md. Tanvir',
      'Md. Ashraful (Jr.)',
      'Md. Hossain Saiful',
    ]);
  });

  it('Md. Mominul Islam is captain; Md. Tanvir, Md. Ashraful (Jr.) and Md. Hossain Saiful are the extras', () => {
    expect(sw.players.filter((p) => p.captain).map((p) => p.name)).toEqual(['Md. Mominul Islam']);
    expect(sw.players.filter((p) => p.substitute).map(playerDisplayName)).toEqual([
      'Md. Tanvir',
      'Md. Ashraful (Jr.)',
      'Md. Hossain Saiful',
    ]);
    expect(squadWarnings(sw, SQUAD_LIMITS)).toEqual([]);
  });

  it('the two Ashrafuls get different ids and photo files', () => {
    expect(sw.players[1]).toMatchObject({
      id: 'md-ashraful-hoque',
      photo: 'players/sky-warrior/md-ashraful-hoque.jpg',
    });
    expect(sw.players[12]).toMatchObject({
      id: 'md-ashraful-jr',
      photo: 'players/sky-warrior/md-ashraful-jr.jpg',
    });
  });

  it('names carry no "Mr." prefix', () => {
    expect(sw.players.some((p) => p.name.startsWith('Mr.'))).toBe(false);
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
