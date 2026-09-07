# Parabolapult — Build Plan

A three.js math game: complete a parabolic launch equation with the right number and your projectile arcs into the target container. Get it wrong and it crashes into the environment.

## Stack

- Vanilla JS (ES modules), three.js as the only runtime dependency, Vite for dev/build.
- No UI framework. HTML/CSS overlay for menus, HUD, and equation input; three.js for the world and the flight.
- All art procedural (canvas 2D → `THREE.CanvasTexture`, plus primitive geometry). No external image/model files.
- Deployed to GitHub Pages as a project page: `https://chrisfender0.github.io/parabolapult/`.

## Core mechanic

The world is a graph-paper/blueprint scene. The ground is a numbered ruler running left to right with tick marks and labels, so the player can read exactly where the target container sits (e.g. "the bucket is at 12").

The launch trajectory is a parabola whose non-zero root is the number the player enters:

```
y(x) = k · x · (A − x)        where A = the number the player entered
k = 4H / A²                   H = fixed apex height, so arcs look consistent at any A
```

So the projectile **always lands at the number the player typed**. If that number equals the target's marked position, it drops into the container and the round is won. If not, it crashes into the ground / environment at the wrong marker.

The player does not type the distance directly — they type the **answer to an equation**, and that answer is the distance. Difficulties differ only in how the equation is presented.

## Game spec

- **3 tries per round.** Each miss burns a try; a third miss ends the round as a loss.
- **The player fills in exactly one number** (except hard mode's final equation, which has three inputs — see below).
- **Three difficulties:**
  - **Easy** — direct arithmetic. `7 + 5 = ▢`. Answer is the landing distance.
  - **Medium** — solve for an unknown. `x + 3 = 15`, answer `12`. Still one operation (`+ − × ÷`).
  - **Hard** — three timed medium equations shown one at a time, each in its own color, each with **no correctness feedback**. The player must remember all three results. Then a fourth equation appears with three color-outlined inputs (matching the earlier boxes) joined by randomized `+` / `−` only. The player re-enters what they remember; the expression's value is the launch distance.
- Flow: landing page (leaderboard + Play) → name + difficulty select → game → results. All state in `localStorage`, no backend.
- Scoring rewards first-try hits and, on hard, speed on the timed equations.

## Repo layout

```
/                      index.html, package.json, vite.config.js, README.md
/plan                  these session plans
/.github/workflows     deploy.yml (GitHub Pages)
/src
  main.js              entry: boots renderer + screen manager
  style.css
  /core                renderer, scene bootstrap, resize, render loop
  /world               ground ruler, markers, launcher, target container, backdrop
  /math                trajectory math + equation generators (pure, no three.js)
  /game                GameSession, GameController, Projectile, TryTracker, scoring
  /ui                  screenManager, hud, equation input widgets
  /ui/screens          Landing, Setup, Game, Result
  /storage             leaderboard + settings persistence
  /audio               sfx stubs
  /utils               Emitter, format helpers, rng
```

## Session breakdown

Each numbered file is one session — small enough to finish in a single sitting, with a clear "done when" condition.

1. **01-project-scaffold.md** — Vite + three.js install, HTML shell, CSS reset, renderer/camera/scene boilerplate, resize handling, render loop.
1. **01.1-repo-and-pages-deploy.md** — git init, GitHub repo, `base` path, Actions workflow, Pages enabled, first live deploy of the empty scaffold. Deploy early so every later session ships.
2. **02-world-scene.md** — Graph-paper backdrop, ground plane, numbered distance ruler (0–24) with tick marks and labels, launcher pad at x=0, target container mesh, camera framing.
3. **03-trajectory-math.md** — Pure math module: parabola from a landing distance, point sampling, flight duration, apex normalization. No rendering, unit-testable in the console.
4. **04-projectile-flight.md** — Projectile mesh, arc trail, flight animation driven by session 3's math, landing detection, hit-vs-crash outcome events, crash/success visual feedback.
5. **05-equation-engine.md** — Equation generators for easy and medium, answer validation, seeded RNG, guaranteed integer answers inside the playable distance range.
6. **06-game-controller.md** — `GameSession` / `GameController`: round lifecycle, 3-try tracker, difficulty wiring, event emitter connecting math → flight → outcome → next state.
7. **07-hud-and-input.md** — In-game HUD overlay: equation display with the blank, numeric input, Launch button, tries indicator, target readout, hit/miss feedback.
8. **08-landing-and-setup.md** — Landing page with leaderboard, name entry + difficulty select page, `localStorage` persistence, Play gating.
8. **08.1-reset-data.md** — "Reset Data" button on the landing page with confirmation; clears all game `localStorage` keys and re-renders the empty state.
9. **09-scoring-and-results.md** — Score model (first-try bonus, tries remaining, difficulty multiplier, hard-mode speed bonus), results screen, leaderboard write.
10. **10-hard-mode-sequence.md** — The three timed, color-coded medium equations: per-equation countdown, no feedback, answers stored privately, color assignment shared with the final equation.
10. **10.1-hard-mode-final-equation.md** — Fourth equation with three color-outlined inputs and randomized `+`/`−` operators, value range clamping, retry behavior (retries replay only the final equation), launch wiring.
11. **11-polish-and-audio.md** — Easing/timing polish, camera follow on flight, crash particles, celebration on hit, sound hooks (mutable stubs OK).
12. **12-testing-and-readme.md** — Manual test checklist across all three difficulties and viewport sizes, README with run/build/deploy instructions, final production build verification.

## Suggested order

1 → 1.1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 8.1 → 9 → 10 → 10.1 → 11 → 12.

Everything through session 9 is a complete, playable game on easy and medium. Sessions 10/10.1 add hard mode. 11 and 12 are polish and release hygiene and can be trimmed if time is short.

## Working agreement

- Claude writes all code and handles all git/GitHub work (branches, commits, pushes, workflow, Pages config).
- Chris is asked only to (a) play-test at the end of each session and give feedback, and (b) run anything that must happen on his Mac (Homebrew installs, `gh auth login`, browser-based GitHub settings).
- Each session ends with a commit and a push to `main`, which triggers the Pages deploy.
