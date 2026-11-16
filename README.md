# BPL-2027

**Baridhi Premier League-2027**: a ball-by-ball cricket scoring app (PWA) in Bengali and English.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

To test on a phone, connect it to the same Wi-Fi and open `http://<your-PC-IP>:5173`.

## Deploy (GitHub Pages)

Live site: **https://bitopiit-dev.github.io/Cricket_Score_Board/**

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
lint, tests, build, then publish `dist/` to GitHub Pages. If a test fails, nothing is
deployed and the site keeps the previous version. It can also be run by hand from the
**Actions** tab (_Deploy to GitHub Pages → Run workflow_).

- Production builds use the base path `/Cricket_Score_Board/` (see `vite.config.ts`);
  `npm run dev` stays at `/`. Files from `public/` are referenced through
  `assetUrl()` (`src/utils/asset.ts`), so photos and logos work under the sub-folder.
- Routing uses `#/…` links, so no 404 fallback page is needed.
- To check a production build locally: `npm run build && npm run preview`, then open
  `http://localhost:4173/Cricket_Score_Board/`.

### Supabase keys (from step B)

Add two **variables** (not secrets) under _Settings → Secrets and variables → Actions →
Variables_: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the publishable key).
The workflow passes them to the build. These two values end up in the published site
anyway, so they are not secret; the data is protected by Row Level Security. Never add a
service_role or secret key, here or anywhere else. Locally, put them in `.env.local`
(ignored by git); see [`.env.example`](.env.example).

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Development server              |
| `npm run build`     | Type-check and production build |
| `npm run preview`   | Serve the production build      |
| `npm test`          | Unit tests (Vitest)             |
| `npm run lint`      | ESLint                          |
| `npm run typecheck` | TypeScript only                 |

## Sections

Every section has its own link, so the phone's back button returns to the previous tab:

| Tab      | Link         | Contents                                                                                                                                                            |
| -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home     | `#/home`     | Opens first. Hero: next match countdown, live score while a match is on, then the result; tournament progress; next three matches. Reached from the BPL-2027 title. |
| Live     | `#/live`     | Matches on this device; tap one to open the scorer                                                                                                                  |
| Fixtures | `#/fixtures` | The 48 fixture matches by date, filter by stage, today first, results and live status                                                                               |
| Points   | `#/points`   | Group A, Group B and Super Six tables (points, NRR) from scored matches                                                                                             |
| Stats    | `#/stats`    | Coming soon (link to the current awards ranking)                                                                                                                    |
| Teams    | `#/teams`    | The 12 teams; tap one for its squad                                                                                                                                 |
| More     | `#/more`     | Rules, Committee, Media (coming soon), Awards                                                                                                                       |

On phones the tabs sit at the bottom of the screen; on wider screens they sit in the header.

## Tournament rules

Match setup offers a "Tournament rules" preset; each rule can be switched on or off:

- 12 overs per innings
- 11 players per side (10 wickets)
- Short pitch
- Six out: a ball hit over the boundary on the full dismisses the batter (no runs, legal delivery, wicket to the bowler)
- Max 3 overs per bowler
- No free hit: the ball after a no-ball is a normal delivery
- After a catch, the new batter takes strike (rule 22)
- One review per team: lost if unsuccessful, kept if successful (rule 26)
- A tie is decided by a one-over Super Over (2 wickets end it; repeated while tied) (rule 4)

Always available on the scoring screen (⋮ menu): **Penalty −4** when a batter
deliberately kicks the ball (rule 25), and **Review**.

All 34 tournament rules are in the **Rules** tab, in Bengali and English, with
search. The text lives in [`src/data/rules.ts`](src/data/rules.ts) (source:
[`docs/rules-bpl-2027.md`](docs/rules-bpl-2027.md)).

### Format and awards

- Format (official fixture, 48 matches from Tuesday 17 November to the final on
  Saturday 19 December 2026, two a day at 12:00 PM and 1:00 PM, in
  [`src/data/fixtures.ts`](src/data/fixtures.ts), generated from
  [`docs/fixture-bpl-2027.json`](docs/fixture-bpl-2027.json)). A team's group
  is read from the fixture list (`src/tournament/groups.ts`), so the points
  tables always follow who actually plays whom:
  - Group A and Group B, 6 teams each, 15 matches each. The top 3 of each group
    go to the Super Six.
  - Super Six: points start again, 15 matches. The top 4 go to the semi-finals.
  - SF-1: Super Six 1st v 4th, SF-2: 2nd v 3rd. The winners meet in the final.
  - Points: win 2, tie or no result 1, loss 0. No matches on Fridays,
    30 November, 1 or 16 December.
- The **Awards** tab ranks Man of the Series candidates (1 point per run, 20 per
  wicket, 10 per catch, stumping, run out or maiden) and the Best Wicket-Taker
  (most wickets, then best economy). Only completed matches between two teams
  picked from the list count; super overs are left out. The committee makes the
  final choice.

## Teams, players and photos

The 12 teams and their squads live in [`src/data/teams.ts`](src/data/teams.ts).
Team names are shown exactly as written, in both languages. This file will
become the seed data when the teams move to Supabase.

### Adding players

Fill the team's `players` array. List the first XI first, then the substitutes.
The squad limit (14 players, 3 extras) is in [`src/config/tournament.ts`](src/config/tournament.ts);
a team page shows a warning if a squad breaks it. Example:

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

| Field         | Required | Notes                                                                                                                                                                                                                |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | yes      | Lowercase, words joined with `-`, unique within the team. Never change it later.                                                                                                                                     |
| `name`        | yes      | Shown exactly as written                                                                                                                                                                                             |
| `shortName`   | no       | Nickname for the scoring screen, e.g. `Rashed`; the team page shows the full name                                                                                                                                    |
| `nameTag`     | no       | Tells two players with the same name apart: `'2'` shows as "Monir Hossain (2)" and is added to the id and photo name (`monir-hossain-2.jpg`). Two players who show the same name trigger a warning on the team page. |
| `role`        | no       | `batter`, `bowler`, `allRounder` or `wicketKeeper`                                                                                                                                                                   |
| `captain`     | no       | `true` for the captain (one per team)                                                                                                                                                                                |
| `viceCaptain` | no       | `true` for the vice-captain (one per team); shown as (VC)                                                                                                                                                            |
| `substitute`  | no       | `true` for extras (max 3; squad max 14)                                                                                                                                                                              |
| `photo`       | no       | Path to the photo (see below). Without it, the player's initials are shown.                                                                                                                                          |

### Where photos go

Each team has its own folder under `public/players/`, named after the team's `id`:

| Team                       | Folder                                   |
| -------------------------- | ---------------------------------------- |
| Power Player               | `public/players/power-player/`           |
| Sky Warrior                | `public/players/sky-warrior/`            |
| Finishing Victorians       | `public/players/finishing-victorians/`   |
| Rainbow Cutting            | `public/players/rainbow-cutting/`        |
| Power House X1             | `public/players/power-house-x1/`         |
| HR Vikings                 | `public/players/hr-vikings/`             |
| Engineer Warriors          | `public/players/engineer-warriors/`      |
| Red Bulls Warriors         | `public/players/red-bulls-warriors/`     |
| MCD Super Stars            | `public/players/mcd-super-stars/`        |
| Quality Flying Fighter     | `public/players/quality-flying-fighter/` |
| Power (Printing & Washing) | `public/players/power-printing-washing/` |
| DDC                        | `public/players/ddc/`                    |

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

## Committee members

The **Committee** tab shows the BGL Sports Committee logo
(`public/images/bgl-sports-committee-logo.png`) and its 9 members with photos. The logo also
sits next to the BPL-2027 title on the home page and links to this page.

Members are in [`src/data/committee.ts`](src/data/committee.ts). To add one:

```ts
member('rahim-uddin', 'Mr. Rahim Uddin'),
```

- Everyone is a plain member (সদস্য), so no role badge is shown. A `convener`
  (আহ্বায়ক) or `memberSecretary` (সদস্য সচিব) would get a badge.
- The photo must be `public/committee/<id>.jpg` (for example
  `public/committee/rahim-uddin.jpg`), square, about 400 × 400 px, face centred.
  A test fails if it is missing.

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
