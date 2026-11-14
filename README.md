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
