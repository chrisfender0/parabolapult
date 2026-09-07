# Session 4 — Projectile Flight

## Goal

Fire a projectile along a trajectory from session 3 and report back whether it landed in the container or crashed, with visual feedback for both.

## Depends on

Sessions 2 and 3.

## Tasks

- `src/game/Projectile.js`:
  - Class holding a mesh (sphere or small procedural boulder), a fading trail (a `Line`/`BufferGeometry` of recent positions, or a `LineDashedMaterial` arc drawn progressively from `trajectory.sample()`).
  - `launch(trajectory)` — resets state, starts the flight.
  - `update(dt)` — advances `t`, sets mesh position from `trajectory.pointAt(t)`, spins the mesh, extends the trail. Emits `land` when `t >= 1`.
  - `reset()` — returns to the muzzle, clears the trail.
- Outcome resolution in `src/game/flightOutcome.js` (or inline in the Projectile's `land` payload): compare `Math.round(trajectory.landingX)` to `target.marker`. Emit `{ outcome: 'hit' | 'miss', landedAt, targetAt }`.
- Visual feedback:
  - **Hit** — projectile drops into the container (short extra fall past y = 0 clipped by the container floor), container flashes the accent/success color.
  - **Miss** — projectile smashes into the ground at its landing marker: a quick squash, a burst of a dozen small procedural fragments with simple gravity, a red flash on the marker it hit, and a screen-space shake (small camera offset, decaying).
- Wire a temporary dev hook in `main.js`: a console function `window.__fire(n)` that builds the trajectory for `n` and launches, so flights can be tested without any UI.

## Files touched

`src/game/Projectile.js`, `src/game/flightOutcome.js`, `src/game/effects.js` (fragments/shake) (new); `src/main.js` (edit).

## Done when

With the target at marker 12: `__fire(12)` arcs and lands in the container with the success flash; `__fire(9)` and `__fire(17)` both crash at their own markers with fragments and shake; firing twice in a row cleanly resets the trail and projectile.

## Ask Chris to

Fire a few hits and misses and say whether the arc speed and the crash feel right, and whether it's obvious at a glance which marker the projectile landed on.
