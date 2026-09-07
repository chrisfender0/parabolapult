# Session 3 — Trajectory Math

## Goal

A pure, dependency-free module that turns "the player answered A" into a parabolic flight path. No three.js imports — this file should be testable by pasting it into a console.

## Depends on

Nothing (but pairs with session 2's `worldXForMarker`).

## Design notes

The parabola is anchored at the launcher (x = 0, y = 0) and lands at x = A:

```
y(x) = k · x · (A − x)
k    = 4H / A²
```

`H` is a fixed apex height (start at 5 world units) so arcs look consistent whether the answer is 4 or 20 — the shape changes, the drama doesn't. Apex is always at x = A/2.

Flight duration should scale sublinearly with distance so short shots don't feel instant and long shots don't drag: `duration = clamp(0.55 * sqrt(A) + 0.4, 0.9, 2.2)` seconds is a good starting point; tune in session 11.

## Tasks

- `src/math/trajectory.js` exporting:
  - `APEX_HEIGHT` constant.
  - `makeTrajectory(landingX, { apex = APEX_HEIGHT } = {})` → `{ landingX, k, apexX, apexY, duration, yAt(x), pointAt(t), sample(count) }`.
    - `yAt(x)` — the parabola value.
    - `pointAt(t)` for `t ∈ [0, 1]` — position along the flight; x advances linearly with t (constant horizontal velocity, which is what a real projectile does), y from `yAt`.
    - `sample(count)` — array of `{x, y}` for drawing a preview arc or trail.
  - `describeEquation(landingX)` → a display string for the HUD, with the blank rendered as a placeholder token, e.g. `y = x(▢ − x) · s`. Keep the presentation honest but readable; the HUD owns the final styling.
- Guard the degenerate cases: `landingX <= 0` returns a null/flat trajectory the caller can treat as an immediate fizzle rather than throwing.
- A short block of console-runnable assertions at the bottom of the file behind an `if (import.meta.env?.DEV)` guard, or a sibling `src/math/trajectory.test.md` documenting the expected values — pick one and be consistent across the repo.

## Files touched

`src/math/trajectory.js` (new).

## Done when

In the console, `makeTrajectory(12)` returns `apexX === 6`, `apexY ≈ 5`, `yAt(0) === 0`, `yAt(12) ≈ 0`, and `sample(50)` returns a smooth arc with no NaNs. `makeTrajectory(0)` and `makeTrajectory(-3)` return the null trajectory instead of throwing.
