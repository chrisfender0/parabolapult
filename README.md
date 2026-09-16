# Parabolapult

A three.js math game: solve the equation, and your projectile launches
exactly as far as its answer says. Land it in the container and you win
the round; land anywhere else and it crashes into the ground. The
container's position is never shown — you have to read it off the
ruler yourself.

Built with three.js + Vite. Live at https://chrisfender0.github.io/parabolapult/

## Difficulties

- **Easy** — direct arithmetic, e.g. `7 + 5 = ▢`.
- **Medium** — solve for the unknown, e.g. `x + 3 = 15`.
- **Hard** — three timed equations shown one at a time with no
  correctness feedback; memorize all three results, then recombine them
  (`+`/`−`) into a fourth, still-timed equation that's the real launch.

Three tries per round, five rounds per game, score is written to a local
leaderboard (no backend — everything lives in `localStorage`).

## Development

```
npm install
npm run dev
```

## Build

```
npm run build
npm run preview
```

`npm run preview` serves the production build under the same
`/parabolapult/` base path GitHub Pages uses (set in `vite.config.js`) —
use it, not a raw static server, to catch base-path issues before they
ship.

## Deploy

Pushes to `main` build and deploy automatically to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) (Actions →
Pages). The one gotcha: this is a project page, not a user/org page, so
every asset path has to go through Vite's `base: '/parabolapult/'` config
— a build that looks fine locally at `/` can still 404 everything once
deployed if that base path is ever removed or changed.

## Status

Feature-complete through session 12 (testing/release). The build was done
one session at a time — see [`plan/`](plan/), starting with
[`plan/00-PLAN.md`](plan/00-PLAN.md), for the session-per-file breakdown
and the reasoning behind each one. [`docs/TEST-CHECKLIST.md`](docs/TEST-CHECKLIST.md)
and [`docs/KNOWN-ISSUES.md`](docs/KNOWN-ISSUES.md) track manual QA.
