# BPL-2027

**Baridhi Premier League-2027**: a ball-by-ball cricket scoring app (PWA) in Bengali and English.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

To test on a phone, connect it to the same Wi-Fi and open `http://<your-PC-IP>:5173`.

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Development server              |
| `npm run build`     | Type-check and production build |
| `npm run preview`   | Serve the production build      |
| `npm test`          | Unit tests (Vitest)             |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript only                 |

## Tournament rules

Match setup offers a "Tournament rules" preset; each rule can be switched on or off:

- 12 overs per innings
- 11 players per side (10 wickets)
- Short pitch
- Six out: a ball hit over the boundary on the full dismisses the batter (no runs, legal delivery, wicket to the bowler)
- Max 3 overs per bowler

## Teams, players and photos

The 12 teams and their squads live in [`src/data/teams.ts`](src/data/teams.ts).
Team names are shown exactly as written, in both languages. This file will
become the seed data when the teams move to Supabase.

### Adding players

Fill the team's `players` array. List the first XI first, then the substitutes:

```ts
{
  id: 'ddc',
  name: 'DDC',
  color: '#475569',
  players: [
    { id: 'rahim-uddin', name: 'Rahim Uddin', role: 'batter', captain: true,
      photo: 'players/ddc/rahim-uddin.jpg' },
    { id: 'karim-ali', name: 'Karim Ali', role: 'wicketKeeper' },
    { id: 'jamal-hossain', name: 'Jamal Hossain', role: 'bowler', substitute: true },
  ],
},
```

| Field        | Required | Notes                                                                            |
| ------------ | -------- | -------------------------------------------------------------------------------- |
| `id`         | yes      | Lowercase, words joined with `-`, unique within the team. Never change it later. |
| `name`       | yes      | Shown exactly as written                                                         |
| `role`       | no       | `batter`, `bowler`, `allRounder` or `wicketKeeper`                               |
| `captain`    | no       | `true` for the captain (one per team)                                            |
| `substitute` | no       | `true` for players outside the first XI                                          |
| `photo`      | no       | Path to the photo (see below). Without it, the player's initials are shown.      |

### Where photos go

Each team has its own folder under `public/players/`, named after the team's `id`:

| Team                          | Folder                                      |
| ----------------------------- | ------------------------------------------- |
| Power Player                  | `public/players/power-player/`              |
| Sky Warrior                   | `public/players/sky-warrior/`               |
| Finishing Victorians          | `public/players/finishing-victorians/`      |
| Rainbow Cutting               | `public/players/rainbow-cutting/`           |
| Power House X1                | `public/players/power-house-x1/`            |
| HR Vikings                    | `public/players/hr-vikings/`                |
| Engineer Warriors             | `public/players/engineer-warriors/`         |
| Red Bulls Warrior             | `public/players/red-bulls-warrior/`         |
| MCD Super Stars               | `public/players/mcd-super-stars/`           |
| Quality Flying Fighter        | `public/players/quality-flying-fighter/`    |
| Power X1 (Printing & Washing) | `public/players/power-x1-printing-washing/` |
| DDC                           | `public/players/ddc/`                       |

- Name each photo after the player's `id`, for example
  `public/players/ddc/rahim-uddin.jpg`.
- In `teams.ts`, write the path without `public/`:
  `photo: 'players/ddc/rahim-uddin.jpg'`.
- Use a square photo of about 400 × 400 px in `.jpg` or `.webp`, under 200 KB.
  It is shown in a circle.
- File names are case-sensitive on most web hosts, so use lowercase.
- If a photo file is missing, the player's initials are shown instead.

Team logos work the same way. Put the file in `public/icons/teams/`, for example
`public/icons/teams/ddc.png`, and add `logo: 'icons/teams/ddc.png'` to the team.

## Project layout

```
src/
  engine/      Scoring rules, event replay, stats, result (pure TypeScript, unit-tested)
  db/          IndexedDB storage (Dexie) behind a repository interface
  store/       Zustand stores (match, preferences)
  i18n/        Bengali and English translations
  pages/       Home, new match, scoring
  components/  UI pieces
```

The match is event-sourced: every delivery is stored as an event and the
score is derived by replaying them, so undo just removes the last event.
