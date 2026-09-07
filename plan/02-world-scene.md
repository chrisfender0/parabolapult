# Session 2 — World Scene

## Goal

The static game world: blueprint backdrop, ground, a readable numbered distance ruler, the launcher, and a target container that can be repositioned to any integer marker.

## Depends on

Session 1.

## Design notes

The player must be able to read the target's position off the background without guessing. Markers are the whole point of the scene: a tick at every integer from 0 to 24, a taller labeled tick every 2 units, with the number rendered large enough to read on a phone.

## Tasks

- `src/world/backdrop.js`: a large plane behind the action with a procedurally drawn graph-paper texture (`CanvasTexture`, fine grid + heavier grid every 5 cells, faint vignette). Fixed world size that comfortably exceeds the camera frustum.
- `src/world/ruler.js`:
  - Builds the ground line at `y = 0` spanning x ∈ [0, 24].
  - Minor tick every 1 unit, major tick every 2 units.
  - Number labels on major ticks, drawn as `CanvasTexture` sprites (one shared canvas atlas or one small canvas per label — either is fine; prefer a single generator function `makeLabel(n)`).
  - Exports `worldXForMarker(n)` so everything else agrees on where marker `n` is.
- `src/world/launcher.js`: a simple procedural catapult/launch pad at x = 0 (base + arm or a ramp — primitives only), with an exported muzzle position for the projectile to start from.
- `src/world/target.js`: a container (open-topped box: floor + two side walls, no lid) with `setMarker(n)` that snaps it to a marker via `worldXForMarker`, plus a subtle highlight/glow and a flag or label above it showing its number.
- `src/world/index.js`: `buildWorld(scene)` assembling all of the above and returning `{ ruler, launcher, target }`.
- Wire into `main.js`, replacing session 1's reference box. Hardcode the target at a marker (e.g. 12) for now.

## Files touched

`src/world/backdrop.js`, `src/world/ruler.js`, `src/world/launcher.js`, `src/world/target.js`, `src/world/index.js` (new); `src/main.js` (edit).

## Done when

The scene shows a blueprint field with a clearly legible 0–24 ruler, the launcher planted at 0, and the target container sitting exactly on marker 12 with its number visible above it. Calling `target.setMarker(5)` from the console moves it precisely onto marker 5. Everything stays readable at a 390×844 portrait viewport.

## Ask Chris to

Look at it on a phone-sized viewport and say whether the marker numbers are big/clear enough, and whether the target reads as "a thing you drop something into".
