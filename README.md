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

| Tab      | Link         | Contents                                                                                                                                                                                                                                                       |
| -------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home     | `#/home`     | Opens first. Hero: next match countdown, live score while a match is on, then the result; tournament progress; next three matches. Reached from the BPL-2027 title.                                                                                            |
| Live     | `#/live`     | The match being played as a live scoreboard (score, chase, batters, bowler, win chance, this over), or the countdown to the next match with both teams' places; then the results, newest first, by stage                                                       |
| Fixtures | `#/fixtures` | Matches played so far; today's matches with both teams' places and a countdown (then the live score or result); a date strip to jump to any day; stage and team filters; the 48 matches by date, two to a row on wide screens, with places, scores and results |
| Points   | `#/points`   | Today's matches with each side's place; Group A, Group B and Super Six tables (points, NRR, form, most points still possible, next match, the qualifying line); before the Super Six, who would go through if the groups ended today                           |
| Stats    | `#/stats`    | Coming soon (link to the current awards ranking)                                                                                                                                                                                                               |
| Teams    | `#/teams`    | The 12 teams by group, in points-table order once a group starts (place, points, won, lost); tap one for its squad                                                                                                                                             |
| More     | `#/more`     | Cards for Share the app, Stats, Rules, Committee, Awards and Media; Sunlight mode; the tournament at a glance; shortcuts (QR code, fixture PDF, QR poster, Match alerts); the latest gallery photos                                                            |

On phones the tabs sit at the bottom of the screen; on wider screens they sit in the header.

### TV mode

Open `#/tv` (live: `…/Cricket_Score_Board/#/tv`) on a smart TV's browser, or on a
laptop or phone connected to the TV. It shows a full-screen board with no tab bar:
the match on the left (countdown, live score, then the result) and, on the right,
the points tables, the next matches and the tournament progress, changing every
12 seconds. A QR code lets people open the app on their phone. Press OK on the
remote (the **Full screen** button) to hide the browser bars. The screen is kept
awake where the browser allows it.

## Tournament rules

Match setup offers a "Tournament rules" preset; each rule can be switched on or off:

- 12 overs per innings
- 11 players per side (10 wickets)
- Short pitch
- Six out: a ball hit over the boundary on the full dismisses the batter (no runs, legal delivery, wicket to the bowler)
- Max 3 overs per bowler
- No free hit: the ball after a no-ball is a normal delivery
- After a catch, the new batter takes strike (rule 23)
- One review per team: lost if unsuccessful, kept if successful (rule 27)
- A tie is decided by a one-over Super Over (2 wickets end it; repeated while tied) (rule 4)

Always available on the scoring screen (⋮ menu): **Penalty −4** when a batter
deliberately kicks the ball (rule 26), and **Review**.

All 35 tournament rules are in the **Rules** tab, in Bengali and English, with
search. The text lives in [`src/data/rules.ts`](src/data/rules.ts) (source:
[`docs/rules-bpl-2027.md`](docs/rules-bpl-2027.md)).

### Demo for fans

[`public/demo.html`](public/demo.html) (live at `…/Cricket_Score_Board/demo.html`)
is a stand-alone page that plays a sample match ball by ball in the Match
Center look, to show fans what the scorecard looks like on a phone. It uses
sample data only and does not touch the app or Supabase.

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

## Postponed matches (rain etc.)

When a match cannot be played, a super admin or a scorer opens **Fixtures**,
taps **Change time / Postpone** on the match and chooses **Postpone this match**
(or **Postpone all matches this day**). Everyone then sees:

- a **Postponed** badge on the match, with "The new date will be announced later";
- a 🌧️ announcement at the top of Home and Live listing every postponed match;
- the countdown and "next matches" skipping it.

A postponed match earns no points and stays on its old date until the super
admin gives it a new date in **Admin → Fixtures**; changing the date removes the
mark on its own. The mark can also be undone from the same sheet if play goes
ahead after all.

Scorers save this through `reschedule_fixtures`, which accepts only start-time
and postponed changes. Run `supabase/patch-5-postpone.sql` once in the SQL
Editor; until then a scorer's postpone is refused (the super admin can still
postpone from Admin → Fixtures).

### Replaying an abandoned match

If the committee decides an abandoned match will be played again from the
start, the super admin opens **Admin → Fixtures** and taps **আবার খেলা হবে**
on that match, then saves. In one step the no result (1 point each) is taken
back, the match shows as postponed until its new date is set, and any score
from before the rain is set aside: it stays in the records (and in Admin →
Matches) but no longer counts for the result, points, NRR, stats or the live
lists, and it can no longer be scored. The replay is scored as a new match on
the new date. Fixture ids in `voidMatchIds` hold the set-aside matches.

## Media gallery

**More → Media** (`#/media`) shows photo albums by season (BPL-2027, and any
earlier season that has photos). Inside a season, photos are grouped by match,
latest match first, with loose photos under "Other photos". Tap a photo to see
it full screen; swipe or use the arrows to move through the album.

The super admin adds photos under **Admin → গ্যালারি**: pick the season and
(optionally) the match and a caption, then choose any number of photos. Each
photo is resized on the phone (1600 px, plus a 480 px thumbnail) before it is
uploaded, so a batch from a match day stays small. Captions can be fixed and
photos removed from the same tab; every phone updates at once.

Photos are rows in `media_items` and files under `gallery/<season>/` in the
public `media` bucket (patch 4).

## Sports committee

**More → Committee** lists the BGL Sports Committee. The super admin manages it
under **Admin → কমিটি**: add or remove members, change a name, add a post or
department line, set the role (convener, member secretary, member), reorder,
and tap a photo to upload a new one (cropped square and shrunk on the phone).
Nothing changes for anyone until **Save**; "back to the built-in list" undoes
everything. The list is saved in `app_data` under `committee` and photos go to
`committee/` in the `media` bucket. Run `supabase/patch-6-committee.sql` once
before the first save.

## Match alerts (push notifications)

**More → Match alerts** (`#/alerts`) lets a fan switch on alerts for chosen
teams (or all) and pick "Wickets and results" or "Results only". Alerts arrive
even when the app is closed. On iPhone they work only from the Home Screen app
(iOS 16.4 or later); the page explains this.

How it works: every saved change to a match between two tournament teams calls
the Edge Function `match-notify` (from a database trigger). The function replays
the match with the app's own scoring engine (`src/push/moments.ts`, bundled into
`supabase/functions/_shared/moments.js`) and sends: match start with the toss,
each wicket, fifties and hundreds, the innings break with the target, a Super
Over, and the result. Each alert is sent once (`push_log`), so a retry, a second
scorer, or undoing and re-entering a wicket never repeats it. If a phone uploads
a burst after being offline, only the newest moment (and the result) goes out.

After changing anything in `src/engine` or `src/push`, run
`npm run build:functions` and commit the result; CI fails if you forget.

### Switching alerts on (once)

1. Run `supabase/patch-4-push-and-gallery.sql` in the SQL Editor.
2. Make a VAPID key pair: `npx web-push generate-vapid-keys`.
3. Install the Supabase CLI, then from this folder:

   ```bash
   supabase link --project-ref dkdomfmhqdtlthpchrij
   supabase secrets set NOTIFY_SECRET=<long random text> \
     VAPID_PUBLIC_KEY=<public key> VAPID_PRIVATE_KEY=<private key> \
     VAPID_SUBJECT=mailto:bitopi.it@gmail.com
   supabase functions deploy match-notify --no-verify-jwt
   ```

   `--no-verify-jwt` is needed because the database calls the function with
   `NOTIFY_SECRET`, not a user's sign-in.

4. In the SQL Editor, tell the database where to send changes:

   ```sql
   select vault.create_secret('https://dkdomfmhqdtlthpchrij.supabase.co/functions/v1/match-notify', 'notify_url');
   select vault.create_secret('<the same NOTIFY_SECRET>', 'notify_secret');
   ```

5. On GitHub, add the Actions variable `VITE_VAPID_PUBLIC_KEY` (the public key
   only) and run the deploy. Until this variable exists, the Alerts link is hidden.

The private VAPID key and `NOTIFY_SECRET` stay in Supabase secrets only. Never
put them in the repository or in a `VITE_` variable.

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
