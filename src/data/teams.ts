/**
 * BPL-2027 teams. Names are proper nouns: never translated.
 *
 * This list is the seed data for the future Supabase `teams` table, so each
 * team has a stable `id` that will not change when the name is edited.
 */
export type PlayerRole = 'batter' | 'bowler' | 'allRounder' | 'wicketKeeper';

export interface TournamentPlayer {
  /** Stable slug, unique within the team (e.g. 'rahim-uddin'). */
  id: string;
  /** Shown exactly as written, never translated. */
  name: string;
  /** Short name / nickname for tight spaces such as the scoring screen. */
  shortName?: string;
  /**
   * Tells two players with the same name apart: "2" shows as "Monir Hossain (2)"
   * and becomes part of the id and photo file name.
   */
  nameTag?: string;
  /** Path under public/, e.g. 'players/ddc/rahim-uddin.jpg'. Optional. */
  photo?: string;
  role?: PlayerRole;
  captain?: boolean;
  viceCaptain?: boolean;
  /** On the squad but not in the first XI. */
  substitute?: boolean;
}

export interface TournamentTeam {
  /** Stable slug, used as the key in matches and later as the seed id. */
  id: string;
  name: string;
  /** Two or three letter code for big headings, e.g. 'FV'. */
  short: string;
  /** Group in the first round. */
  group: 'A' | 'B';
  /** Badge colour (shown until a logo exists). */
  color: string;
  /** Logo URL or path; when missing, a coloured initial badge is shown. */
  logo?: string;
  /** Squad: first XI then up to 3 substitutes, 14 at most (rule 8). Empty until added. */
  players: TournamentPlayer[];
}

/**
 * To add players, fill a team's `players` array, e.g.
 *
 *   players: [
 *     { id: 'rahim-uddin', name: 'Rahim Uddin', role: 'batter', captain: true,
 *       photo: 'players/ddc/rahim-uddin.jpg' },
 *     { id: 'karim-ali', name: 'Karim Ali', role: 'bowler', substitute: true },
 *   ]
 *
 * Photos go in public/players/<team id>/ (see README).
 */
/**
 * A squad player whose id and photo file follow the name:
 * "Jakir" in hr-vikings -> id 'jakir', photo 'players/hr-vikings/jakir.jpg'.
 */
function squad(
  teamId: string,
  name: string,
  extra: Partial<Omit<TournamentPlayer, 'id' | 'name'>> = {},
): TournamentPlayer {
  const id = `${name} ${extra.nameTag ?? ''}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return { id, name, photo: `players/${teamId}/${id}.jpg`, ...extra };
}

export const TOURNAMENT_TEAMS: readonly TournamentTeam[] = [
  // Group A
  {
    id: 'finishing-victorians',
    name: 'Finishing Victorians',
    short: 'FV',
    group: 'A',
    color: '#7c3aed',
    logo: 'icons/teams/finishing-victorians.png',
    players: [
      {
        id: 'abdullah',
        name: 'Tamim',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/abdullah-1794827102678.jpg',
      },
      {
        id: 'alif',
        name: 'Alif',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/alif-1794748704687.jpg',
      },
      {
        id: 'atik',
        name: 'Atik',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/atik-1794748715314.jpg',
      },
      {
        id: 'fahad',
        name: 'Fahad',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/fahad-1794748728707.jpg',
      },
      {
        id: 'ismail',
        name: 'Ismail',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/ismail-1794748740890.jpg',
      },
      {
        id: 'jobayer',
        name: 'Jobayer',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/jobayer-1794748753721.jpg',
      },
      {
        id: 'kabir',
        name: 'Kabir',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/kabir-1794748764760.jpg',
      },
      {
        id: 'monjur',
        name: 'Monjur',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/monjur-1794748782228.jpg',
      },
      {
        id: 'rasidul',
        name: 'Rasidul',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/rasidul-1794748795197.jpg',
      },
      {
        id: 'siful',
        name: 'Safiul',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/siful-1794748824924.jpg',
        viceCaptain: true,
      },
      {
        id: 'saiful-2',
        name: 'Saiful 2',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/saiful-2-1794748841684.jpg',
      },
      {
        id: 'saiful-3',
        name: 'Saiful 3',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/saiful-3-1794748884722.jpg',
      },
      {
        id: 'sohel',
        name: 'Sohel',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/sohel-1794748895207.jpg',
      },
      {
        id: 'player',
        name: 'Shihab',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/finishing-victorians/player-1794749115070.jpg',
        captain: true,
      },
    ],
  },
  {
    id: 'power-house-x1',
    name: 'Power House X1',
    short: 'PHX',
    group: 'A',
    color: '#ea580c',
    logo: 'icons/teams/power-house-x1.jpg',
    // A 15th player (Rohim) was left out to keep the squad at 14.
    players: [
      squad('power-house-x1', 'Gilbird', { captain: true }),
      squad('power-house-x1', 'Arif', { viceCaptain: true }),
      squad('power-house-x1', 'Foysal'),
      squad('power-house-x1', 'Jahirul'),
      squad('power-house-x1', 'Joynal'),
      squad('power-house-x1', 'Sami'),
      squad('power-house-x1', 'Tantu'),
      squad('power-house-x1', 'Habib Ulla'),
      squad('power-house-x1', 'Khairul'),
      squad('power-house-x1', 'Supian'),
      squad('power-house-x1', 'Dhirendra'),
      squad('power-house-x1', 'Helal', { substitute: true }),
      squad('power-house-x1', 'Sourov', { substitute: true }),
      squad('power-house-x1', 'Alauddin', { substitute: true }),
    ],
  },
  {
    id: 'mcd-super-stars',
    name: 'MCD Super Stars',
    short: 'MCD',
    group: 'A',
    color: '#ca8a04',
    logo: 'icons/teams/mcd-super-stars.png',
    players: [
      squad('mcd-super-stars', 'Monir Hossain', { role: 'bowler', captain: true }),
      squad('mcd-super-stars', 'Shahanur', { viceCaptain: true }),
      squad('mcd-super-stars', 'Nazmul Hassan'),
      squad('mcd-super-stars', 'Robel Mia', { role: 'bowler' }),
      squad('mcd-super-stars', 'Monir Hossain', { nameTag: '2' }),
      squad('mcd-super-stars', 'Kamrul Hasan'),
      squad('mcd-super-stars', 'Shahin Alom', { role: 'bowler' }),
      squad('mcd-super-stars', 'Asif Babu', { role: 'bowler' }),
      squad('mcd-super-stars', 'Sahaj Uddin', { role: 'bowler' }),
      squad('mcd-super-stars', 'Easin Mia Antor'),
      squad('mcd-super-stars', 'Rabiul'),
      squad('mcd-super-stars', 'Jamal Uddin Khan', { substitute: true }),
      squad('mcd-super-stars', 'Nayeem Uddin', { substitute: true }),
      squad('mcd-super-stars', 'Chahed Hosen Hridoy', { substitute: true }),
    ],
  },
  {
    id: 'power-printing-washing',
    name: 'Power (Printing & Washing)',
    short: 'PPW',
    group: 'A',
    color: '#16a34a',
    logo: 'icons/teams/power-printing-washing.jpg',
    // Captain not named yet: the team page shows a warning until one is set.
    players: [
      { id: 'shubroto', name: 'Subroto', photo: 'players/power-printing-washing/shubroto.jpg' },
      squad('power-printing-washing', 'Salah Uddin', { viceCaptain: true }),
      squad('power-printing-washing', 'Johurul', { captain: true }),
      squad('power-printing-washing', 'Kawsar'),
      squad('power-printing-washing', 'Alal'),
      squad('power-printing-washing', 'Jahidul'),
      squad('power-printing-washing', 'Hridoy'),
      squad('power-printing-washing', 'Jamal'),
      squad('power-printing-washing', 'Shawon'),
      squad('power-printing-washing', 'Mojir'),
      squad('power-printing-washing', 'Shafiqul'),
      {
        id: 'easin',
        name: 'Robin',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/power-printing-washing/easin-1794827459609.jpg',
        substitute: true,
      },
      squad('power-printing-washing', 'Shuvo', { substitute: true }),
      squad('power-printing-washing', 'Nazmul', { substitute: true }),
    ],
  },
  {
    id: 'quality-flying-fighter',
    name: 'Quality Flying Fighter',
    short: 'QFF',
    group: 'A',
    color: '#2563eb',
    logo: 'icons/teams/quality-flying-fighter.jpg',
    players: [
      {
        id: 'ajmir-hossen',
        name: 'Asad',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/ajmir-hossen-1794804763286.jpg',
        shortName: 'Rashed',
      },
      {
        id: 'asad-ahmed',
        name: 'Rashed',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/asad-ahmed-1794804768215.jpg',
        captain: true,
      },
      {
        id: 'billal-hossain',
        name: 'Billal',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/billal-hossain-1794804775668.jpg',
      },
      {
        id: 'ibrahim',
        name: 'Ibrahim',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/ibrahim-1794804780384.jpg',
      },
      {
        id: 'morshed',
        name: 'Morshed',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/morshed-1794804784698.jpg',
      },
      {
        id: 'mamun',
        name: 'Mamun',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/mamun-1794804789926.jpg',
      },
      {
        id: 'rakib',
        name: 'Rakib',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/rakib-1794804800232.jpg',
      },
      {
        id: 'parvez',
        name: 'Parvez',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/parvez-1794804804231.jpg',
      },
      {
        id: 'hridoy',
        name: 'Hridoy',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/hridoy-1794804816880.jpg',
      },
      {
        id: 'abdur-rahman',
        name: 'Rony',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/abdur-rahman-1794834786233.jpg',
      },
      {
        id: 'sohel',
        name: 'Sohel',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/sohel-1794804844815.jpg',
      },
      {
        id: 'tariqul',
        name: 'Tariqul',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/tariqul-1794804855533.jpg',
        substitute: true,
      },
      {
        id: 'saiful',
        name: 'Saiful',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/saiful-1794804860377.jpg',
        substitute: true,
      },
      {
        id: 'imran',
        name: 'UZZAL',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/quality-flying-fighter/imran-1794804866324.jpg',
        substitute: true,
      },
    ],
  },
  {
    id: 'sky-warrior',
    name: 'Sky Warrior',
    short: 'SW',
    group: 'A',
    color: '#0284c7',
    logo: 'icons/teams/sky-warrior.png',
    players: [
      squad('sky-warrior', 'Md. Mominul Islam', { captain: true }),
      squad('sky-warrior', 'Md. Ashraful Hoque'),
      squad('sky-warrior', 'Md. Younus'),
      squad('sky-warrior', 'Md. Bashar'),
      squad('sky-warrior', 'Haripad'),
      squad('sky-warrior', 'Md. Miraz'),
      squad('sky-warrior', 'Md. Mehdi'),
      squad('sky-warrior', 'Md. Showib'),
      squad('sky-warrior', 'Md. Saju'),
      squad('sky-warrior', 'Antar'),
      squad('sky-warrior', 'Md. Mosharaf'),
      squad('sky-warrior', 'Md. Tanvir', { substitute: true }),
      squad('sky-warrior', 'Md. Ashraful', { nameTag: 'Jr.', substitute: true }),
      squad('sky-warrior', 'Md. Hossain Saiful', { substitute: true }),
    ],
  },
  // Group B
  {
    id: 'engineer-warriors',
    name: 'Engineer Warrior',
    short: 'EW',
    group: 'B',
    color: '#0d9488',
    logo: 'icons/teams/engineer-warriors.png',
    players: [
      {
        id: 'forhad',
        name: 'Forhad',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/forhad-1794833715718.jpg',
        captain: true,
      },
      {
        id: 'akhter',
        name: 'Akhter',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/akhter-1794833719704.jpg',
      },
      {
        id: 'antor',
        name: 'Antor',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/antor-1794833737920.jpg',
        viceCaptain: true,
      },
      {
        id: 'avijit',
        name: 'Avijit',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/avijit-1794833746636.jpg',
      },
      {
        id: 'azad',
        name: 'Azad',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/azad-1794833755882.jpg',
      },
      {
        id: 'hasan',
        name: 'Hasan',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/hasan-1794833765919.jpg',
      },
      {
        id: 'imran',
        name: 'Imran',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/imran-1794833780007.jpg',
      },
      {
        id: 'mohiuddin',
        name: 'Mohiuddin',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/mohiuddin-1794833792230.jpg',
      },
      {
        id: 'shakil',
        name: 'Shakil',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/shakil-1794833801997.jpg',
      },
      {
        id: 'tawhid',
        name: 'Tawhid',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/tawhid-1794833810993.jpg',
      },
      {
        id: 'yousuf',
        name: 'Yousuf',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/yousuf-1794833822170.jpg',
      },
      {
        id: 'masud',
        name: 'Masud',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/masud-1794834863935.jpg',
      },
      {
        id: 'shimanto',
        name: 'Shimanto',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/shimanto-1794834873507.jpg',
      },
      {
        id: 'akbar',
        name: 'Akbar',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/engineer-warriors/akbar-1794834888661.jpg',
      },
    ],
  },
  {
    id: 'hr-vikings',
    name: 'HR Vikings',
    short: 'HRV',
    group: 'B',
    color: '#4f46e5',
    logo: 'icons/teams/hr-vikings.png',
    players: [
      squad('hr-vikings', 'Jakir', { captain: true }),
      squad('hr-vikings', 'Atique', { viceCaptain: true }),
      squad('hr-vikings', 'Arman'),
      squad('hr-vikings', 'Ashique'),
      squad('hr-vikings', 'Habib'),
      squad('hr-vikings', 'Hasib'),
      squad('hr-vikings', 'Hasnat'),
      squad('hr-vikings', 'Kader'),
      squad('hr-vikings', 'Kamrul', { substitute: true }),
      squad('hr-vikings', 'Rakib'),
      squad('hr-vikings', 'Salauddin'),
      squad('hr-vikings', 'Shakil', { substitute: true }),
      squad('hr-vikings', 'Nayeem'),
      squad('hr-vikings', 'Saimon'),
    ],
  },
  {
    id: 'power-player',
    name: 'Power Player',
    short: 'PP',
    group: 'B',
    color: '#dc2626',
    logo: 'icons/teams/power-player.jpg',
    players: [
      squad('power-player', 'Nazmul', { captain: true }),
      squad('power-player', 'Sharif'),
      squad('power-player', 'Hridoy'),
      squad('power-player', 'Arafat'),
      squad('power-player', 'Saiful'),
      squad('power-player', 'Saddam'),
      squad('power-player', 'Al-Amin'),
      squad('power-player', 'Ali Ashraf'),
      squad('power-player', 'Ismail'),
      squad('power-player', 'T.S Tanvir'),
      squad('power-player', 'Sabuj'),
      squad('power-player', 'Kalam', { substitute: true }),
      squad('power-player', 'Rashed', { substitute: true }),
      squad('power-player', 'Al-Amin', { nameTag: '2', substitute: true }),
    ],
  },
  {
    id: 'ddc',
    name: 'DDC',
    short: 'DDC',
    group: 'B',
    color: '#475569',
    logo: 'icons/teams/ddc.png',
    players: [
      squad('ddc', 'A. Karim', { captain: true }),
      squad('ddc', 'Ratul'),
      squad('ddc', 'Sajib'),
      squad('ddc', 'Shoikat'),
      squad('ddc', 'K. Rana'),
      {
        id: 'siam',
        name: 'Siam',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/ddc/siam-1794835251065.jpg',
      },
      squad('ddc', 'Imran'),
      {
        id: 'topayel',
        name: 'Topayel',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/ddc/topayel-1794835255417.jpg',
      },
      squad('ddc', 'Sabbir'),
      squad('ddc', 'Khayer'),
      squad('ddc', 'Sanaullah'),
      {
        id: 'z-i-limon',
        name: 'Z.I. Limon',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/ddc/z-i-limon-1794835259841.jpg',
        substitute: true,
      },
      squad('ddc', 'Sazzad', { substitute: true }),
      {
        id: 'mamun',
        name: 'Mamun',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/ddc/mamun-1794835264932.jpg',
        substitute: true,
      },
    ],
  },
  {
    id: 'red-bulls-warriors',
    name: 'Red Bulls Warriors',
    short: 'RBW',
    group: 'B',
    color: '#b91c1c',
    logo: 'icons/teams/red-bulls-warriors.png',
    // 15 players: one over the squad limit; the team page shows a warning.
    players: [
      squad('red-bulls-warriors', 'Rashed', { captain: true }),
      squad('red-bulls-warriors', 'Kamrul'),
      squad('red-bulls-warriors', 'Robiul', { shortName: 'Pollob' }),
      squad('red-bulls-warriors', 'Imon', { viceCaptain: true }),
      squad('red-bulls-warriors', 'Sayfur'),
      squad('red-bulls-warriors', 'Raihan'),
      squad('red-bulls-warriors', 'Ashraful'),
      squad('red-bulls-warriors', 'Nazir'),
      squad('red-bulls-warriors', 'Shorif'),
      squad('red-bulls-warriors', 'Rigan'),
      squad('red-bulls-warriors', 'Rikon'),
      squad('red-bulls-warriors', 'Shanto', { substitute: true }),
      squad('red-bulls-warriors', 'Sohel', { substitute: true }),
      squad('red-bulls-warriors', 'Al-Amin', { substitute: true }),
      squad('red-bulls-warriors', 'Jahirul', { substitute: true }),
    ],
  },
  {
    id: 'rainbow-cutting',
    name: 'Rainbow Cutting',
    short: 'RC',
    group: 'B',
    color: '#db2777',
    logo: 'icons/teams/rainbow-cutting.png',
    // Captain not decided yet: the team page shows a warning until one is set.
    players: [
      {
        id: 'kazi-pholash',
        name: 'Polash',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/kazi-pholash-1794834581639.jpg',
        captain: true,
      },
      {
        id: 'sagor',
        name: 'Sagor',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/sagor-1794834597638.jpg',
      },
      {
        id: 'md-faysal',
        name: 'Faysal',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/md-faysal-1794834592300.jpg',
      },
      {
        id: 'iqbal',
        name: 'Iqbal',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/iqbal-1794827832585.jpg',
      },
      {
        id: 'probash',
        name: 'Probash',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/probash-1794827853340.jpg',
      },
      {
        id: 'nasir',
        name: 'Nasir',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/nasir-1794834609336.jpg',
      },
      {
        id: 'sumon',
        name: 'Sumon',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/sumon-1794834618063.jpg',
      },
      {
        id: 'abu-saeed',
        name: 'Abu Saeed',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/abu-saeed-1794834624567.jpg',
        viceCaptain: true,
      },
      {
        id: 'md-naieem-khan',
        name: 'Nayeem',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/md-naieem-khan-1794834636819.jpg',
      },
      {
        id: 'arif',
        name: 'Arif',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/arif-1794834675731.jpg',
      },
      {
        id: 'monir',
        name: 'Monir',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/monir-1794834681179.jpg',
      },
      {
        id: 'rifat',
        name: 'Rifat',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/rifat-1794827918737.jpg',
        substitute: true,
      },
      {
        id: 'biplob',
        name: 'Biplob',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/biplob-1794827911653.jpg',
        substitute: true,
      },
      {
        id: 'kawser',
        name: 'Kawser',
        photo:
          'https://dkdomfmhqdtlthpchrij.supabase.co/storage/v1/object/public/media/players/rainbow-cutting/kawser-1794827908078.jpg',
        substitute: true,
      },
    ],
  },
];

export type GroupId = 'A' | 'B';

/** Team by its exact name (as written in the fixture). */
export function teamByName(name: string): TournamentTeam | undefined {
  return TOURNAMENT_TEAMS.find((t) => t.name === name);
}

/** Old team ids that were renamed, mapped to the current id. */
export const RENAMED_TEAM_IDS: Readonly<Record<string, string>> = {
  'ie-warrior': 'engineer-warriors',
  'red-bulls-warrior': 'red-bulls-warriors',
  'power-x1-printing-washing': 'power-printing-washing',
};

/**
 * Moves a saved match's teams from renamed ids to the current id and name.
 * Returns true if anything changed.
 */
export function migrateTeamIds(match: { teams: { teamId?: string; name: string }[] }): boolean {
  let changed = false;
  for (const team of match.teams) {
    const newId = team.teamId && RENAMED_TEAM_IDS[team.teamId];
    if (!newId) continue;
    team.teamId = newId;
    team.name = TOURNAMENT_TEAMS.find((t) => t.id === newId)?.name ?? team.name;
    changed = true;
  }
  return changed;
}

export function findTeam(id: string | undefined): TournamentTeam | undefined {
  return id ? TOURNAMENT_TEAMS.find((t) => t.id === id) : undefined;
}

/** First letters of the first two words, for a player's placeholder badge. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  return words
    .slice(0, 2)
    .map((w) => Array.from(w)[0])
    .join('')
    .toUpperCase();
}

/** First letter of the name, for the placeholder badge. */
export function teamInitial(name: string): string {
  return (Array.from(name.trim())[0] ?? '?').toUpperCase();
}

/** The name as shown to people: "Monir Hossain (2)" when it has a tag. */
export function playerDisplayName(p: Pick<TournamentPlayer, 'name' | 'nameTag'>): string {
  return p.nameTag ? `${p.name} (${p.nameTag})` : p.name;
}

/** Names shown more than once in a squad, so the scorer could not tell those players apart. */
export function duplicateNames(team: Pick<TournamentTeam, 'players'>): string[] {
  const byKey = new Map<string, string[]>();
  for (const p of team.players) {
    const shown = playerDisplayName(p).trim().replace(/\s+/g, ' ');
    const key = shown.toLowerCase();
    byKey.set(key, [...(byKey.get(key) ?? []), shown]);
  }
  return [...byKey.values()].filter((names) => names.length > 1).map((names) => names[0]);
}

export type SquadWarning =
  'tooMany' | 'tooManySubs' | 'twoCaptains' | 'twoViceCaptains' | 'duplicateName' | 'noCaptain';

/** Problems with a squad that the admin should fix (empty when fine). */
export function squadWarnings(
  team: Pick<TournamentTeam, 'players'>,
  limits: { maxPlayers: number; maxSubstitutes: number },
): SquadWarning[] {
  const w: SquadWarning[] = [];
  const count = (f: (p: TournamentPlayer) => boolean | undefined) => team.players.filter(f).length;
  if (team.players.length > limits.maxPlayers) w.push('tooMany');
  if (
    team.players.length <= limits.maxPlayers &&
    count((p) => p.substitute) > limits.maxSubstitutes
  ) {
    w.push('tooManySubs');
  }
  if (count((p) => p.captain) > 1) w.push('twoCaptains');
  if (count((p) => p.viceCaptain) > 1) w.push('twoViceCaptains');
  if (duplicateNames(team).length > 0) w.push('duplicateName');
  // Only once players are in: a team without a squad yet has nothing to fix.
  if (team.players.length > 0 && count((p) => p.captain) === 0) w.push('noCaptain');
  return w;
}
