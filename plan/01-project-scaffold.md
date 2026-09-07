# Session 1 — Project Scaffold

## Goal

A running Vite + three.js project with an empty but correctly framed 3D scene, a resize-safe render loop, and the folder structure the rest of the plan assumes.

## Depends on

Nothing.

## Tasks

- `npm create vite@latest` style setup by hand (vanilla, no framework): `package.json` with `"type": "module"`, scripts `dev` / `build` / `preview`, `three` as the only dependency and `vite` as the only devDependency.
- `index.html` at repo root: mobile viewport meta, `<canvas id="app">` (or a `#scene` mount div), a sibling `<div id="ui">` overlay root that later screens render into, and `<script type="module" src="/src/main.js">`.
- `src/style.css`: CSS reset, full-viewport layout, `#ui` absolutely positioned over the canvas with `pointer-events: none` by default (children opt back in), dark blueprint-ish background color variable, a small set of CSS custom properties for the palette (ink, grid line, accent, hit green, crash red, and the three hard-mode colors).
- `src/core/renderer.js`: creates `THREE.WebGLRenderer` (antialias, `setPixelRatio` capped at 2), scene, and a camera framing roughly x ∈ [−2, 26], y ∈ [−2, 12] in world units. Exports `{ scene, camera, renderer }` plus a `resize()` that keeps the horizontal span constant across aspect ratios (so the ruler is always fully visible on a phone).
- `src/core/loop.js`: a `start(callback)` render loop using `requestAnimationFrame`, passing `deltaTime` (seconds, clamped to ~0.05 to survive tab-switches) to registered updaters.
- `src/utils/Emitter.js`: tiny event emitter (`on`, `off`, `emit`) used by everything downstream.
- `src/main.js`: boots renderer + loop, adds a temporary reference object (a wireframe box at the origin) so it's obvious the scene renders.
- `.gitignore`: `node_modules`, `dist`, `.DS_Store`.

## Files touched

`package.json`, `index.html`, `vite.config.js` (minimal for now — the `base` path comes in session 1.1), `.gitignore`, `src/main.js`, `src/style.css`, `src/core/renderer.js`, `src/core/loop.js`, `src/utils/Emitter.js` (all new).

## Done when

`npm install && npm run dev` opens a page showing the wireframe reference box on the blueprint background, and resizing the window (including a narrow portrait phone size in devtools) never crops the box or distorts it.

## Ask Chris to

Run `npm install && npm run dev` and confirm the page loads and resizes cleanly on both desktop and a phone-sized viewport.
