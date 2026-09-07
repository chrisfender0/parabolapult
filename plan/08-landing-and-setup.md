# Session 8 — Landing Page and Setup Flow

## Goal

The front of the app: a landing page with a leaderboard and a Play button, then a name + difficulty page that starts the game.

## Depends on

Session 7.

## Tasks

- `src/storage/leaderboard.js`: `localStorage`-backed, namespaced keys (`parabolapult:leaderboard`, `parabolapult:lastName`). API: `getEntries()`, `addEntry({ name, score, difficulty, date, rounds })`, `getLastName()`, `setLastName()`, `clearAll()`. Sorted descending by score, capped at ~20 entries, tolerant of malformed/absent JSON.
- `src/ui/screens/Landing.js`: title treatment, short one-line explanation of the game, top-10 leaderboard table (name, score, difficulty, date), an empty state when there are no scores, and a Play button. Difficulty filter chips are optional — note them as a stretch, don't build them here.
- `src/ui/screens/Setup.js`: name input (prefilled with `getLastName()`), three difficulty cards (Easy / Medium / Hard) with one-line descriptions of what each asks for, selection state, and a Play button that is disabled until a name and difficulty are both chosen. Saves the name and hands `{ playerName, difficulty }` to the Game screen.
- `src/main.js`: boot into Landing rather than straight into the game; the 3D scene renders behind the menus (dimmed/idle camera drift) rather than being torn down.

## Files touched

`src/storage/leaderboard.js`, `src/ui/screens/Landing.js`, `src/ui/screens/Setup.js` (new); `src/main.js`, `src/style.css`, `src/ui/screenManager.js` (edit).

## Done when

Landing → Setup → Game flows end to end, the name persists across reloads, the leaderboard renders an empty state on a fresh browser, and back-navigation from Setup to Landing works.

## Ask Chris to

Walk the full flow once and give feedback on the difficulty card copy — whether it's clear what Easy/Medium/Hard actually ask you to do.
