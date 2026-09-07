# Session 11 — Polish and Audio

## Goal

Make it feel good. No new mechanics.

## Depends on

Everything through session 10.1.

## Tasks

- **Camera**: gentle follow on the projectile during flight (lerped x, slight zoom out for long shots), settling back to the framing shot. Idle drift on menu screens.
- **Timing**: tune `duration` in `trajectory.js` and all UI transition timings; add easing helpers in `src/utils/ease.js` and use them consistently.
- **Hit celebration**: container flash, a burst of sparks, a brief slow-motion beat, score popup rising from the container.
- **Crash**: more convincing fragments, a dust puff, a lingering scorch mark on the marker that got hit (fades over a couple of seconds).
- **Trail**: taper/fade the arc trail rather than a flat line.
- **Hard mode**: a subtle pulse on the countdown bar in the last 3 seconds; a short "commit" animation when a step locks in.
- `src/audio/sfx.js`: WebAudio-generated sounds (no files) — launch whoosh, hit chime, crash thud, tick for the hard-mode timer's final seconds. All routed through a master gain with a mute toggle persisted to `localStorage`, and a no-op fallback if `AudioContext` can't start.
- Mute button in a consistent corner across all screens.
- Reduced-motion: respect `prefers-reduced-motion` by cutting shake, slow-mo, and idle drift.

## Files touched

`src/audio/sfx.js`, `src/utils/ease.js` (new); `src/core/renderer.js`, `src/game/effects.js`, `src/game/Projectile.js`, `src/ui/hud.js`, `src/style.css` (edit).

## Done when

A full game on each difficulty feels responsive and readable, audio can be muted and stays muted across reloads, and `prefers-reduced-motion` visibly calms the effects.

## Ask Chris to

Play through all three difficulties and flag anything that feels sluggish, noisy, or distracting.
